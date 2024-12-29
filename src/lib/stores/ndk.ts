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

  if (!browser) return;

  try {
    console.log('Initializing NDK...');

    if (browser) {
      // Let nostr-login handle signer initialization
      if (window.nostr) {
        console.log('Found window.nostr, waiting for nostr-login to initialize signer...');
      }

      // Dynamically import nostr-login only in browser
      const { init, launch } = await import('nostr-login');
      nostrLogin = { init, launch };
      
      // Initialize nostr-login
      nostrLogin.init({
        noBanner: true, // We'll handle the UI ourselves
        onAuth: async (npub: string, options: any) => {
          console.log('nostr-login auth:', npub, options);
          
          try {
            // Create and initialize NDK signer
            const signer = new NDKNip07Signer();
            await signer.blockUntilReady();
            console.log('NDK signer ready');

            // Set signer on NDK instance
            ndk.signer = signer;
            const signerUser = await signer.user();
            console.log('NDK signer user:', signerUser);

            // Verify the pubkeys match
            const pubkey = await window.nostr.getPublicKey();
            if (signerUser.pubkey !== pubkey) {
              console.error('Signer pubkey mismatch:', signerUser.pubkey, '!==', pubkey);
              throw new Error('Signer pubkey does not match window.nostr pubkey');
            }
            console.log('Verified signer pubkey matches window.nostr');

            ndkSigner.set(signer);
            console.log('Set NDK signer');
          } catch (error) {
            console.error('Failed to initialize NDK signer:', error);
            throw error;
          }
        }
      });
    }

    // Check if we already have a logged in user
    if (window.nostr) {
      try {
        const pubkey = await window.nostr.getPublicKey();
        if (pubkey) {
          console.log('Found existing nostr login:', pubkey);
          // The onAuth callback will handle NDK setup
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

