import { writable, derived } from 'svelte/store';
import { type OrganizationContent } from '$lib/nostr/kinds';
import { ORGANIZATION_KIND } from '$lib/constants';
import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
import { LOCATION_OPTIONS, FOCUS_AREAS, ENGAGEMENT_TYPE_OPTIONS } from '$lib/constants';

export const locationOptions = LOCATION_OPTIONS;
export const focusAreaOptions = FOCUS_AREAS.sort();
export const engagementTypeOptions = ENGAGEMENT_TYPE_OPTIONS.sort();

export function getOrgContent(event: NDKEvent): OrganizationContent {
  try {
    if (!event?.content) {
      console.warn('Event has no content:', event);
      return {
        name: 'Unknown Organization',
        category: 'Unknown',
        description: 'No content available',
        picture: null
      };
    }
    const content = JSON.parse(event.content);
    if (!content.name) {
      console.warn('Missing organization name:', content);
      content.name = 'Unnamed Organization';
    }
    if (!content.category) {
      content.category = 'Uncategorized';
    }
    if (!content.description) {
      content.description = 'No description available';
    }
    return content;
  } catch (e) {
    console.error('Failed to parse organization content:', e, 'Event:', event);
    return {
      name: 'Invalid Organization',
      category: 'Error',
      description: 'Failed to load organization data',
      picture: null
    };
  }
}

export function matchesFilter(tags: string[][], key: string, filterSet: Set<string>, mark?: string): boolean {
  if (filterSet.size === 0) return true;
  return tags
    .filter(tag => tag[0] === key && (!mark || tag[2] === mark))
    .some(tag => filterSet.has(tag[1]));
}

export async function fetchEvents(ndk: NDK): Promise<NDKEvent[]> {
  try {
    if (!ndk) {
      throw new Error('NDK instance not found');
    }

    // Log NDK instance details
    console.log('NDK instance details:', {
      connected: ndk.connected,
      hasPool: !!ndk.pool,
      relayCount: ndk.pool?.relays.size,
      relayUrls: Array.from(ndk.pool?.relays.keys() || []),
      activeRelays: Array.from(ndk.pool?.relays.values() || [])
        .filter(r => r.status === 1)
        .map(r => r.url)
    });

    // Ensure NDK is connected
    if (!ndk.connected) {
      console.log('NDK not connected, attempting connection...');
      await ndk.connect();
      console.log('NDK connected successfully in fetchEvents');
    }

    console.log('Starting fetchEvents for organizations');
    const filter = {
      kinds: [ORGANIZATION_KIND]
    };

    console.log('Fetching organizations with filter:', {
      timestamp: new Date().toISOString(),
      filter,
      kind: ORGANIZATION_KIND,
      kindHex: ORGANIZATION_KIND.toString(16)
    });

    // Create a subscription to collect events
    const events = new Set<NDKEvent>();
    console.log('Creating subscription with options:', {
      closeOnEose: true,
      groupableDelay: 0,
      limit: 100
    });

    console.log('Creating subscription for organizations');
    const sub = ndk.subscribe(filter, { 
      closeOnEose: true,
      groupableDelay: 100, // Add small delay for grouping
      limit: 100 // Limit results
    });
    console.log('Subscription created with filter:', filter);

    return new Promise<NDKEvent[]>((resolve, reject) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn('Subscription timeout after 10s');
        if (events.size > 0) {
          console.log('Resolving with partial events:', events.size);
          resolve(Array.from(events));
        } else {
          reject(new Error('Subscription timeout with no events'));
        }
      }, 10000);
      sub.on('event', (event: NDKEvent) => {
        try {
          console.log('Received event:', {
            id: event.id,
            kind: event.kind,
            pubkey: event.pubkey,
            created_at: event.created_at,
            tags: event.tags
          });
          
          const content = JSON.parse(event.content);
          console.log('Parsed content:', {
            name: content?.name,
            category: content?.category,
            hasDescription: !!content?.description,
            contentKeys: Object.keys(content || {})
          });
          
          if (content && content.name) {
            console.log('Valid organization event:', {
              id: event.id,
              name: content.name,
              category: content.category
            });
            events.add(event);
          } else {
            console.warn('Invalid organization content:', {
              id: event.id,
              content: content,
              rawContent: event.content
            });
          }
        } catch (e) {
          console.warn('Failed to parse organization event:', {
            id: event.id,
            error: e.message,
            rawContent: event.content
          });
        }
      });

      // Add error handler
      sub.on('error', (error) => {
        console.error('Subscription error:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        reject(error);
      });

      sub.on('eose', () => {
        clearTimeout(timeout); // Clear timeout on EOSE
        console.log('EOSE received:', {
          totalEvents: events.size,
          eventIds: Array.from(events).map(e => e.id)
        });
        resolve(Array.from(events));
      });
    });

    if (!events || events.length === 0) {
      console.warn('No organization events received from relays');
      return [];
    }

    console.log('Successfully fetched organizations:', events.length);
    return events;
  } catch (err) {
    console.error('Error in fetchEvents:', err);
    return []; // Return empty array instead of throwing
  }
}

export function setupRealtimeSubscription(ndk: NDK, callback: (event: NDKEvent) => void) {
  const subscription = ndk.subscribe({
    kinds: [ORGANIZATION_KIND],
    since: Math.floor(Date.now() / 1000) // Only get new events from now
  }, {
    closeOnEose: false,
    groupableDelay: 1000, // Reduced delay for realtime updates
    groupable: true // Explicitly enable grouping
  });

  subscription.on('event', (event: NDKEvent) => {
    try {
      const content = JSON.parse(event.content);
      if (content && content.name) { // Basic validation
        console.log('Received new organization in realtime:', event.id);
        callback(event);
      }
    } catch (e) {
      console.warn('Skipping invalid realtime organization event:', event.id, e);
    }
  });

  console.log('Setup realtime subscription for organizations');
  return subscription;
}
