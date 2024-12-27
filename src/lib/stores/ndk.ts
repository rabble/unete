import { writable, get } from 'svelte/store';
import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';

// Create NDK instance
const ndk = new NDK({
  explicitRelayUrls: [
    'wss://relay.nos.social',
    'wss://relay.damus.io',
    'wss://relay.nostr.band'
  ]
});

// Create a store for connection status
export const ndkConnected = writable(false);

import { get } from 'svelte/store';

// Function to ensure connection
export async function ensureConnection() {
  if (!get(ndkConnected)) {
    try {
      await ndk.connect();
      ndkConnected.set(true);
    } catch (error) {
      console.error('Failed to connect to relays:', error);
      // Try to reconnect on failure
      setTimeout(ensureConnection, 5000);
    }
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
