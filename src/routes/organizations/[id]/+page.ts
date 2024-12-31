import type { PageLoad } from './$types';
import { getStores } from '$app/stores';
import { ndk, getCachedEvents } from '$lib/stores/ndk';
import { ORGANIZATION, ORGANIZATION_TAGS } from '$lib/nostr/kinds';

export const ssr = false;
export const csr = true;

// Add rate limiting
let lastFetchTime = 0;
const RATE_LIMIT_DELAY = 2000; // 2 seconds between fetches

const processEvent = (event: NDKEvent) => {
  if (!event) {
    throw new Error('Organization not found');
  }

  try {
    const content = JSON.parse(event.content);
    return {
      organization: {
        ...content,
        id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        kind: event.kind,
        sig: event.sig,
        focusAreas: event.tags.filter(t => t[0] === ORGANIZATION_TAGS.FOCUS_AREA).map(t => t[1]),
        locations: event.tags.filter(t => t[0] === ORGANIZATION_TAGS.LOCATION).map(t => t[1]),
        engagementTypes: event.tags.filter(t => t[0] === ORGANIZATION_TAGS.ENGAGEMENT).map(t => t[1]),
        tags: event.tags
      },
      event: event
    };
  } catch (e) {
    console.error('Failed to parse organization content:', e, 'Event:', event);
    throw new Error('Invalid organization data');
  }
};

export const load: PageLoad = async ({ params }) => {
  const { id } = params;

  try {
    // Always get fresh data first
    const ndkInstance = await ensureConnection();
    
    // Fetch with a short timeout
    const fetchWithTimeout = (timeout: number) => {
      return new Promise<NDKEvent[]>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Fetch timeout'));
        }, timeout);

        ndkInstance.fetchEvents({
          kinds: [ORGANIZATION],
          ids: [id],
          limit: 1
        }).then(events => {
          clearTimeout(timer);
          resolve(Array.from(events));
        }).catch(err => {
          clearTimeout(timer);
          reject(err);
        });
      });
    };

    // Try to get fresh data with 2 second timeout
    let freshEvent: NDKEvent | undefined;
    try {
      const events = await fetchWithTimeout(2000);
      freshEvent = events[0];
    } catch (err) {
      console.log('Fresh data fetch failed, falling back to cache:', err);
    }

    // If we got fresh data, return it
    if (freshEvent) {
      const processed = processEvent(freshEvent);
      return {
        initialData: processed,
        promise: Promise.resolve(processed)
      };
    }

    // Fall back to cached data
    const cachedEvents = await getCachedEvents({
      kinds: [ORGANIZATION],
      ids: [id],
      limit: 1,
      since: 0
    });
    
    const cachedEvent = Array.from(cachedEvents)[0];
    if (!cachedEvent) {
      throw new Error('Organization not found');
    }

    const processed = processEvent(cachedEvent);
    return {
      initialData: processed,
      promise: Promise.resolve(processed)
    };
  } catch (err) {
    console.error('Failed to load organization:', err);
    throw new Error(`Failed to load organization: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
