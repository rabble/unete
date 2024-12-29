import { writable, get } from 'svelte/store';
import NDK, { NDKEvent, NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { browser } from '$app/environment';

// Create NDK instance
const ndk = new NDK({
  explicitRelayUrls: [
    'wss://relay.nos.social',
    'wss://relay.damus.io',
    'wss://relay.nostr.band'
  ]
});

// Create stores with explicit typing and initial values
export const ndkConnected = writable<boolean>(false);
export const ndkSigner = writable<NDKNip07Signer | null>(null);
export const ndkStore = writable<NDK | null>(null);

// Create derived store for subscription management
export const ndkState = {
  subscribe: ndkStore.subscribe,
  set: ndkStore.set,
  update: ndkStore.update
};

// Initialize NDK and handle signer setup
export async function initializeNDK() {
  if (!browser) return;

  try {
    console.log('Initializing NDK...');
    
    // Check for window.nostr before anything else
    if (window.nostr) {
      console.log('Found window.nostr, attempting to get public key...');
      try {
        const pubkey = await window.nostr.getPublicKey();
        console.log('Got public key:', pubkey);
        if (pubkey) {
          // Create and initialize the signer
          const signer = new NDKNip07Signer();
          await signer.blockUntilReady();
          console.log('Signer ready');
          
          // Set the signer on NDK instance and verify it matches our pubkey
          ndk.signer = signer;
          const signerUser = await signer.user();
          if (signerUser.pubkey !== pubkey) {
            console.error('Signer pubkey mismatch:', signerUser.pubkey, '!==', pubkey);
            throw new Error('Signer pubkey does not match window.nostr pubkey');
          }
          console.log('Verified signer pubkey matches window.nostr');
          
          ndkSigner.set(signer);
          console.log('Set NDK signer');
        }
      } catch (e) {
        console.warn('Failed to get public key:', e);
        throw new Error('Failed to initialize signer: ' + e.message);
      }
    } else {
      console.log('No window.nostr found');
    }

    // Connect NDK regardless of login state
    await ndk.connect();
    ndkConnected.set(true);
    console.log('NDK connected successfully');

    // If we have a signer, set up the active user
    if (ndk.signer) {
      try {
        const user = await ndk.signer.user();
        if (user) {
          ndk.activeUser = user;
          console.log('NDK active user set:', user.npub);
        }
      } catch (e) {
        console.error('Failed to set active user:', e);
      }
    }
  } catch (error) {
    console.error('Error during NDK/nostr initialization:', error);
    throw error;
  }
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
  const events = await ndk.fetchEvents(filter);
  
  // Update cache with new events
  events.forEach(event => {
    cache.set(event.id, event);
  });
  eventCache.set(cache);

  return events;
}
// Export NDK instance
export { ndk };

