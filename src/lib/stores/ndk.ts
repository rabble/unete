import { writable, get } from 'svelte/store';
import { loginState, ndkStore as userNdkStore } from './userProfile';
import NDK, { NDKEvent, NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { browser } from '$app/environment';

// Create stores with explicit typing and initial values
// Sync our NDK store with the user profile store
export const ndkStore = {
  ...userNdkStore,
  subscribe: userNdkStore.subscribe
};
export const ndkConnected = writable<boolean>(false);
export const ndkSigner = writable<NDKNip07Signer | null>(null);

// Create derived store for subscription management
export const ndkState = {
  subscribe: ndkStore.subscribe,
  set: ndkStore.set,
  update: ndkStore.update
};

// Initialize NDK with relays
export async function initializeNDK() {
  if (!browser) return null;

  // If we already have a connected instance, return it
  const currentNDK = get(ndkStore);
  if (currentNDK?.pool?.relays.size > 0) {
    const connectedRelays = Array.from(currentNDK.pool.relays.values())
      .filter(r => r.status === 1);
    if (connectedRelays.length > 0) {
      console.log('Using existing NDK instance with connected relays:', 
        connectedRelays.map(r => r.url)
      );
      return currentNDK;
    }
  }

  try {
    console.log('Initializing new NDK instance...');
    
    // Create new NDK instance with explicit connection timeout
    const ndkInstance = new NDK({
      explicitRelayUrls: [
        "wss://nos.lol",
        "wss://relay.nostr.band",
        "wss://nostr.mom"
      ],
      autoConnect: true
    });

    // Explicitly connect to relays
    await ndkInstance.connect();

    // Store the instance
    ndkStore.set(ndkInstance);

    // Initialize signer if window.nostr is available
    if (window.nostr) {
      try {
        ndkInstance.signer = new NDKNip07Signer();
        console.log('NDK signer initialized from window.nostr');
      } catch (err) {
        console.warn('Failed to initialize NDK signer:', err);
      }
    }

    // Connect to relays
    await ndkInstance.connect();

    // Track relay connections and status
    const relayConnections = new Map<string, {count: number, status: number}>();

    // Initialize status for all configured relays
    ndkInstance.pool.relays.forEach((relay, url) => {
      relayConnections.set(url, {count: 0, status: relay.status});
    });

    // Log relay pool status with connection counts
    ndkInstance.pool.on('relay:connect', (relay) => {
      const current = relayConnections.get(relay.url) || {count: 0, status: 0};
      const newCount = current.count + 1;
      relayConnections.set(relay.url, {count: newCount, status: 1});
      
      console.log('Connected to relay:', {
        url: relay.url,
        connectionCount: newCount,
        timestamp: new Date().toISOString(),
        activeRelays: Array.from(relayConnections.entries())
          .filter(([_, data]) => data.status === 1)
          .map(([url, data]) => ({
            url,
            connections: data.count
          }))
      });

      // Update connected state if we have any active connections
      const hasActiveConnections = Array.from(relayConnections.values())
        .some(data => data.status === 1);
      ndkConnected.set(hasActiveConnections);
    });

    ndkInstance.pool.on('relay:disconnect', (relay) => {
      const current = relayConnections.get(relay.url);
      if (!current) return;

      const newCount = Math.max(0, current.count - 1);
      relayConnections.set(relay.url, {count: newCount, status: newCount > 0 ? 1 : 0});
      
      console.log('Disconnected from relay:', {
        url: relay.url,
        remainingConnections: newCount,
        status: relay.status,
        timestamp: new Date().toISOString(),
        activeRelays: Array.from(relayConnections.entries())
          .filter(([_, data]) => data.status === 1)
          .map(([url, data]) => ({
            url,
            connections: data.count
          }))
      });

      // Update connected state
      const hasActiveConnections = Array.from(relayConnections.values())
        .some(data => data.status === 1);
      ndkConnected.set(hasActiveConnections);
    });

    ndkInstance.pool.on('relay:error', (relay, error) => {
      const current = relayConnections.get(relay.url);
      if (current) {
        relayConnections.set(relay.url, {...current, status: 0});
      }
      
      console.error('Relay error:', {
        url: relay.url,
        error: error,
        connectionState: relayConnections.get(relay.url),
        timestamp: new Date().toISOString(),
        activeRelays: Array.from(relayConnections.entries())
          .filter(([_, data]) => data.status === 1)
          .map(([url, data]) => ({
            url,
            connections: data.count
          }))
      });

      // Update connected state
      const hasActiveConnections = Array.from(relayConnections.values())
        .some(data => data.status === 1);
      ndkConnected.set(hasActiveConnections);
    });

    // Update store immediately with instance
    ndkStore.set(ndkInstance);

    // Wait for relays to connect with improved connection check
    const waitForConnection = async () => {
      const maxAttempts = 30; // 30 attempts
      const delay = 500; // 500ms between attempts
      
      for (let i = 0; i < maxAttempts; i++) {
        const connectedRelays = Array.from(ndkInstance.pool.relays.values())
          .filter(relay => relay.status === 1);
          
        if (connectedRelays.length > 0) {
          console.log('Connected to relays:', connectedRelays.map(r => r.url));
          ndkConnected.set(true);
          return true;
        }
        
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // After all attempts, check status and keep trying
      const finalConnectedRelays = Array.from(ndkInstance.pool.relays.values())
        .filter(relay => relay.status === 1);
        
      if (finalConnectedRelays.length === 0) {
        console.warn('No relays connected after attempts, will keep trying in background');
        ndkConnected.set(false);
        // Start background reconnection attempts
        setTimeout(() => waitForConnection(), 5000); // Try again in 5 seconds
        return false;
      }
      
      console.log('Connected to relays:', finalConnectedRelays.map(r => r.url));
      ndkConnected.set(true);
      return true;
    };

    // Wait for connections
    await waitForConnection();
    console.log('Successfully connected to NDK with relays:', 
      Array.from(ndkInstance.pool.relays.values())
        .filter(r => r.status === 1)
        .map(r => r.url)
    );

    // Signer will be initialized by initNostrLogin when needed

    return ndkInstance;
  } catch (error) {
    console.error('Failed to initialize NDK:', error);
    return null;
  }
}

// Helper function to ensure NDK is connected
export async function ensureNDKConnection() {
  const currentNDK = get(ndkStore);
  if (!currentNDK) {
    return await initializeNDK();
  }
  return currentNDK;
}

// Function to ensure connection
export async function ensureConnection(): Promise<NDK> {
  // Get current NDK instance
  let ndkInstance = get(ndkStore);
  
  // If we have an instance and it's connected, return it immediately
  if (ndkInstance && get(ndkConnected)) {
    return ndkInstance;
  }

  // If we have an instance but not connected, try to reuse it
  if (ndkInstance) {
    try {
      await ndkInstance.connect();
      ndkConnected.set(true);
      return ndkInstance;
    } catch (err) {
      console.warn('Reconnection attempt failed, initializing new instance');
    }
  }

  // Create new instance with fast connection
  try {
    ndkInstance = new NDK({
      explicitRelayUrls: [
        "wss://nos.lol",
        "wss://relay.nostr.band", 
        "wss://nostr.mom"
      ],
      autoConnect: true
    });

    // Connect without waiting for all relays
    await ndkInstance.connect(250); // 250ms timeout
    
    // Store the instance
    ndkStore.set(ndkInstance);
    ndkConnected.set(true);
    
    return ndkInstance;
  } catch (err) {
    console.error('NDK connection failed:', err);
    throw new Error('Failed to establish NDK connection');
  }
}

// Create event cache store
export const eventCache = writable<Map<string, NDKEvent>>(new Map());

// Helper to get cached events or fetch new ones
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 1000; // 1 second between fetches

export async function getCachedEvents(filter: any): Promise<Set<NDKEvent>> {
  const now = Date.now();
  if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
    throw new Error('Rate limit exceeded - please wait before fetching again');
  }
  lastFetchTime = now;
  
  const ndk = await ensureConnection();
  if (!ndk) {
    throw new Error('NDK not initialized');
  }
  
  console.log('Getting events with filter:', filter);
  
  // Check cache first
  const cache = get(eventCache);
  const cachedEvents = new Set<NDKEvent>();
  
  // Helper to check if an event matches the filter
  const matchesFilter = (event: NDKEvent) => {
    if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
    if (filter['#t']) {
      const eventTopics = event.tags.filter(t => t[0] === 't').map(t => t[1]);
      if (!eventTopics.some(t => filter['#t'].includes(t))) return false;
    }
    return true;
  };

  // Check cache for matching events
  cache.forEach(event => {
    if (matchesFilter(event)) {
      cachedEvents.add(event);
    }
  });

  // If we have cached events, return them
  if (cachedEvents.size > 0) {
    console.log('Returning cached events:', cachedEvents.size);
    return cachedEvents;
  }

  // Otherwise fetch from network
  console.log('No cached events, fetching from network');
  
  // Create subscription with timeout
  const events = new Set<NDKEvent>();
  const sub = ndk.subscribe(filter, { closeOnEose: true });
  
  return new Promise((resolve, reject) => {
    let subscription: any;
    const timeout = setTimeout(() => {
      if (subscription) {
        subscription.stop();
      }
      if (events.size > 0) {
        resolve(events);
      } else {
        reject(new Error('Fetch timeout with no events'));
      }
    }, 5000);

    subscription = ndk.subscribe(filter, { closeOnEose: true });
    subscription.on('event', (event: NDKEvent) => {
      console.log('Received event:', event.id);
      events.add(event);
      
      // Update cache
      cache.set(event.id, event);
      eventCache.set(cache);
    });

    subscription.on('eose', () => {
      console.log('Received EOSE, total events:', events.size);
      clearTimeout(timeout);
      resolve(events);
    });
  });
}
// Export the NDK store from the existing ndkStore
export const ndk = ndkStore;

// Function to check for existing Nostr login
export async function checkExistingNostrLogin() {
  const ndkInstance = get(ndkStore);
  if (!ndkInstance) return false;

  try {
    if (window.nostr) {
      ndkInstance.signer = new NDKNip07Signer();
      const user = await ndkInstance.signer.user();
      if (user?.pubkey) {
        await user.fetchProfile();
        ndkConnected.set(true);
        loginState.set(true);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking existing login:', error);
    return false;
  }
}

// Function to initialize Nostr login
export async function initNostrLogin() {
  const ndkInstance = get(ndkStore);
  if (!ndkInstance) {
    throw new Error('NDK not initialized');
  }

  try {
    if (!window.nostr) {
      throw new Error('Nostr extension not found. Please install a Nostr extension.');
    }

    ndkInstance.signer = new NDKNip07Signer();
    const user = await ndkInstance.signer.user();
    
    if (!user?.pubkey) {
      throw new Error('Failed to get public key from Nostr extension');
    }

    await user.fetchProfile();
    ndkConnected.set(true);
    loginState.set(true);
    return true;
  } catch (error) {
    console.error('Error initializing Nostr login:', error);
    throw error;
  }
}


