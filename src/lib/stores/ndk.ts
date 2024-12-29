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
    // Create new NDK instance
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

    // Set up connection promise
    const connectionPromise = ndkInstance.connect();
    
    // Update store immediately with instance
    ndkStore.set(ndkInstance);

    // Wait for connection
    await connectionPromise;
    ndkConnected.set(true);

    // If window.nostr exists, set up NDK signer
    if (window.nostr) {
      const signer = new NDKNip07Signer();
      await signer.blockUntilReady();
      ndkInstance.signer = signer;
      ndkSigner.set(signer);
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
  await ensureConnection();
  
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
    return cachedEvents;
  }

  // Otherwise fetch from network
  console.log('Creating fetchEvents promise...', {
    hasNDK: Boolean(ndk),
    filter,
    relayCount: ndk?.pool?.relays?.size || 0
  });

  // Create subscription to track individual relay responses
  const sub = ndk.subscribe(filter, { closeOnEose: true });
  console.log('Created subscription');

  sub.on('event', (event) => {
    console.log('Received event:', event.id);
  });

  sub.on('eose', () => {
    console.log('Received EOSE from relay');
  });

  const fetchPromise = ndk.fetchEvents(filter);
  console.log('Waiting for events...');
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      console.log('Timeout reached, forcing rejection');
      reject(new Error('Fetch timeout after 1s'));
    }, 1000);
  });

  const events = await Promise.race([fetchPromise, timeoutPromise]);
  console.log('Fetch complete, got events:', {
    count: events?.size,
    firstEventId: Array.from(events || [])[0]?.id
  });
  
  // Update cache with new events
  events.forEach(event => {
    cache.set(event.id, event);
  });
  eventCache.set(cache);

  return events;
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

