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

    // Track all relay connections
    const relayConnections = new Map<string, number>();

    // Log relay pool status with connection counts
    ndkInstance.pool.on('relay:connect', (relay) => {
      const count = (relayConnections.get(relay.url) || 0) + 1;
      relayConnections.set(relay.url, count);
      console.log('Connected to relay:', {
        url: relay.url,
        connectionCount: count,
        timestamp: new Date().toISOString(),
        totalConnections: relayConnections,
        activeConnections: Array.from(ndkInstance.pool.relays.values())
          .filter(r => r.status === 1)
          .map(r => r.url)
      });
    });

    ndkInstance.pool.on('relay:disconnect', (relay) => {
      const count = (relayConnections.get(relay.url) || 1) - 1;
      if (count <= 0) {
        relayConnections.delete(relay.url);
      } else {
        relayConnections.set(relay.url, count);
      }
      console.log('Disconnected from relay:', {
        url: relay.url,
        remainingConnections: count,
        status: relay.status,
        timestamp: new Date().toISOString(),
        totalConnections: relayConnections,
        activeConnections: Array.from(ndkInstance.pool.relays.values())
          .filter(r => r.status === 1)
          .map(r => r.url)
      });
    });

    ndkInstance.pool.on('relay:error', (relay, error) => {
      console.error('Relay error:', {
        url: relay.url,
        error: error,
        connectionCount: relayConnections.get(relay.url) || 0,
        timestamp: new Date().toISOString()
      });
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

// Function to ensure connection (now uses initializeNDK)
export async function ensureConnection() {
  try {
    const currentNDK = get(ndkStore);
    if (!currentNDK || !get(ndkConnected)) {
      console.log('Initializing new NDK connection...');
      const ndk = await initializeNDK();
      if (!ndk) {
        throw new Error('Failed to initialize NDK');
      }
      
      // Check connection status
      const connectedRelays = Array.from(ndk.pool.relays.values())
        .filter(r => r.status === 1);
      if (connectedRelays.length > 0) {
        ndkConnected.set(true);
      }
      if (!ndk) {
        throw new Error('Failed to initialize NDK');
      }
      
      // Wait for connection with timeout
      await Promise.race([
        new Promise((resolve) => {
          const checkConnection = () => {
            if (get(ndkConnected)) {
              resolve(true);
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      
      return ndk;
    }
    console.log('Using existing NDK connection');
    return currentNDK;
  } catch (error) {
    console.error('Error in ensureConnection:', error);
    throw error;
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


