import { writable, derived } from 'svelte/store';
import { ORGANIZATION, type OrganizationContent } from '$lib/nostr/kinds';
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

    // Ensure NDK is connected
    if (!ndk.connected) {
      await ndk.connect();
      console.log('NDK connected successfully in fetchEvents');
    }

    const filter = {
      kinds: [ORGANIZATION],
      limit: 100
    };

    console.log('Fetching organizations with filter:', filter);

    // Create a promise that will resolve with events
    const events = new Set<NDKEvent>();
    let hasReceivedEvents = false;
    
    return new Promise<NDKEvent[]>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (!hasReceivedEvents) {
          console.warn('No events received within timeout, but continuing to wait...');
        }
      }, 5000);

      const sub = ndk.subscribe(filter, { 
        closeOnEose: true,
        groupableDelay: 0 // Disable grouping for initial fetch
      });

      sub.on('event', (event: NDKEvent) => {
        try {
          const content = JSON.parse(event.content);
          if (content && content.name) { // Basic validation
            console.log('Received valid organization event:', event.id);
            hasReceivedEvents = true;
            events.add(event);
          }
        } catch (e) {
          console.warn('Skipping invalid organization event:', event.id, e);
        }
      });

      sub.on('eose', () => {
        clearTimeout(timeoutId);
        console.log('EOSE received, total valid organizations:', events.size);
        resolve(Array.from(events));
      });

      // Add error handling
      sub.on('error', (error: any) => {
        clearTimeout(timeoutId);
        console.error('Subscription error:', error);
        // Don't reject on error, just log it
        console.warn('Continuing despite error:', error);
      });

      // Set a longer timeout for the overall operation
      setTimeout(() => {
        if (events.size > 0) {
          console.log('Resolving with partial results after timeout');
          resolve(Array.from(events));
        } else {
          console.error('No events received after extended timeout');
          resolve([]); // Return empty array instead of rejecting
        }
      }, 30000); // 30 second timeout
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
    kinds: [ORGANIZATION],
    since: Math.floor(Date.now() / 1000) // Only get new events from now
  }, {
    closeOnEose: false,
    groupableDelay: 2000
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
