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

    // Use explicit relay URLs for better reliability
    const events = await ndk.fetchEvents(filter);

    if (!events) {
      throw new Error('No events received from relays');
    }

    console.log('Fetched organization events:', events.size);
    return Array.from(events);
  } catch (err) {
    console.error('Error in fetchEvents:', err);
    throw new Error(`Failed to fetch events: ${err.message}`);
  }
}

export function setupRealtimeSubscription(ndk: NDK, callback: (event: NDKEvent) => void) {
  const subscription = ndk.subscribe({
    kinds: [ORGANIZATION]
  }, {
    closeOnEose: false,
    groupableDelay: 2000
  });

  subscription.on('event', callback);
  console.log('Setup realtime subscription for organizations');
  return subscription;
}
