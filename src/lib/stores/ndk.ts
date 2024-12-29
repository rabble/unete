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

// Create stores
export const ndkConnected = writable(false);
export const ndkSigner = writable<NDKNip07Signer | null>(null);

// Initialize NDK and handle signer setup
export async function initializeNDK() {
  if (!browser) return;

  try {
    // First ensure NDK is initialized
    if (!get(ndkConnected)) {
      console.log('Initializing NDK...');
      await ndk.connect();
      ndkConnected.set(true);
      console.log('NDK initialized successfully');
    }

    // Then check nostr login and set up signer
    if (window.nostr) {
      const pubkey = await window.nostr.getPublicKey();
      if (pubkey) {
        console.log('User already logged in via nostr-login with pubkey:', pubkey);
        try {
          const signer = new NDKNip07Signer();
          ndk.signer = signer;
          ndkSigner.set(signer);
          await ndk.connect();
      
          // Set the active user when we have a signer
          const user = await signer.user();
          if (user) {
            ndk.activeUser = user;
            console.log('NDK active user set:', user.npub);
          }
      
          console.log('NDK signer connected successfully');
        } catch (signerError) {
          console.error('Failed to initialize NDK signer:', signerError);
          throw signerError;
        }
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

