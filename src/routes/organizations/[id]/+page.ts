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

  // Check rate limit
  const now = Date.now();
  if (now - lastFetchTime < RATE_LIMIT_DELAY) {
    // Return only cached data if we're rate limited
    const cachedEvents = await getCachedEvents({
      kinds: [ORGANIZATION],
      ids: [id],
      limit: 1,
      since: 0
    });
    
    const cachedEvent = Array.from(cachedEvents)[0];
    if (cachedEvent) {
      return {
        initialData: processEvent(cachedEvent),
        promise: Promise.resolve(processEvent(cachedEvent))
      };
    }
    throw new Error('Please wait a moment before refreshing');
  }
  
  lastFetchTime = now;

  try {
    // Get cached data first
    const cachedEvents = await getCachedEvents({
      kinds: [ORGANIZATION],
      ids: [id],
      limit: 1,
      since: 0
    });
    
    const cachedEvent = Array.from(cachedEvents)[0];
    const initialData = cachedEvent ? processEvent(cachedEvent) : null;

    // Return both initial data and promise for fresh data
    return {
      initialData,
      promise: new Promise((resolve, reject) => {
        // Add slight delay to prevent rate limiting
        setTimeout(() => {
          const ndkInstance = ndk.subscribe(value => {
            if (!value) {
              reject(new Error('NDK not initialized'));
              return;
            }
            
            value.fetchEvents({
              kinds: [ORGANIZATION],
              ids: [id],
              limit: 1
            }).then(events => {
              const eventsArray = Array.from(events);
              if (eventsArray.length === 0) {
                reject(new Error('Organization not found'));
                return;
              }
              resolve(processEvent(eventsArray[0]));
            }).catch(reject);
          });
        }, 500);
      })
    };
  } catch (err) {
    console.error('Failed to load organization:', err);
    throw new Error(`Failed to load organization: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
