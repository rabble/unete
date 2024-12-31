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
  if (!ndk) {
    throw new Error('NDK not initialized or connected');
  }

  return new Promise((resolve, reject) => {
    const events = new Set<NDKEvent>();
    const filter = {
      kinds: [ORGANIZATION],
      since: 0,
      limit: 100
    };
    
    const sub = ndk.subscribe(filter, { 
      closeOnEose: true,
      groupableDelay: 1000
    });

    sub.on('event', (event: NDKEvent) => {
      try {
        const content = getOrgContent(event);
        events.add(event);
      } catch (e) {
        console.error('Failed to parse event:', e);
      }
    });

    sub.on('eose', () => {
      if (events.size > 0) {
        resolve(Array.from(events));
      } else {
        reject(new Error('No events received before EOSE'));
      }
    });

    setTimeout(() => {
      if (events.size === 0) {
        reject(new Error('No events received within timeout'));
      }
    }, 15000);
  });
}

export function setupRealtimeSubscription(ndk: NDK, callback: (event: NDKEvent) => void) {
  const subscription = ndk.subscribe({
    kinds: [ORGANIZATION],
    since: Math.floor(Date.now() / 1000) - 3600,
    limit: 50
  }, {
    closeOnEose: false,
    groupableDelay: 2000
  });

  subscription.on('event', callback);
  return subscription;
}
