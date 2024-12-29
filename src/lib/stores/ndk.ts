import { writable, get } from 'svelte/store';
import NDK, { NDKEvent, NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { browser } from '$app/environment';

// Create stores with explicit typing and initial values
export const ndkStore = writable<NDK | null>(null);
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

  try {
    console.log('Initializing NDK...');
    
    // Create new NDK instance with explicit connection timeout
    const ndkInstance = new NDK({
      explicitRelayUrls: [
        'wss://relay.nos.social',
        'wss://relay.damus.io',
        'wss://relay.nostr.band',
        'wss://relay.snort.social',
        'wss://nostr.mom',
        'wss://relay.current.fyi'
      ]
    });

    // Set up connection with timeout
    const connectionPromise = Promise.race([
      ndkInstance.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('NDK connection timeout')), 5000)
      )
    ]);

    // Log relay pool status
    ndkInstance.pool.on('relay:connect', (relay) => {
      console.log('Connected to relay:', relay.url);
    });

    ndkInstance.pool.on('relay:disconnect', (relay) => {
      console.log('Disconnected from relay:', relay.url);
    });

    ndkInstance.pool.on('relay:error', (relay, error) => {
      console.error('Relay error:', relay.url, error);
    });

    // Update store immediately with instance
    ndkStore.set(ndkInstance);

    // Wait for at least one relay to connect with explicit connection tracking
    console.log('Waiting for relay connections...');
      
    const connectionTimeout = 10000; // 10 seconds
    const startTime = Date.now();
      
    while (true) {
      const connectedRelays = Array.from(ndkInstance.pool.relays.values())
        .filter(relay => relay.status === 1);
        
      if (connectedRelays.length > 0) {
        console.log('Connected to relays:', connectedRelays.map(r => r.url));
        ndkConnected.set(true);
        break;
      }
        
      if (Date.now() - startTime > connectionTimeout) {
        throw new Error('Timeout waiting for relay connections');
      }
        
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If window.nostr exists, set up NDK signer
    if (window.nostr) {
      console.log('Setting up NIP-07 signer...');
      const signer = new NDKNip07Signer();
      await signer.blockUntilReady();
      ndkInstance.signer = signer;
      ndkSigner.set(signer);
      console.log('Signer ready');
    }

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
  if (!get(ndkConnected)) {
    await initializeNDK();
  }
}

// Create event cache store
export const eventCache = writable<Map<string, NDKEvent>>(new Map());

// Helper to get cached events or fetch new ones
export async function getCachedEvents(filter: any): Promise<Set<NDKEvent>> {
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
    const timeout = setTimeout(() => {
      sub.close();
      if (events.size > 0) {
        resolve(events);
      } else {
        reject(new Error('Fetch timeout with no events'));
      }
    }, 5000);

    sub.on('event', (event: NDKEvent) => {
      console.log('Received event:', event.id);
      events.add(event);
      
      // Update cache
      cache.set(event.id, event);
      eventCache.set(cache);
    });

    sub.on('eose', () => {
      console.log('Received EOSE, total events:', events.size);
      clearTimeout(timeout);
      resolve(events);
    });
  });
}
// Initialize NDK store
export const ndk = writable<NDK | null>(null);

// Initialize NDK on import
if (browser) {
  const ndkInstance = new NDK({
    explicitRelayUrls: [
      'wss://relay.nos.social',
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
      'wss://relay.snort.social',
      'wss://nostr.mom',
      'wss://relay.current.fyi'
    ]
  });
  
  ndkInstance.connect().then(() => {
    ndk.set(ndkInstance);
    ndkConnected.set(true);
  }).catch(error => {
    console.error('Failed to initialize NDK:', error);
  });
}

