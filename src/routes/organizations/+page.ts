import { writable, derived } from 'svelte/store';
import { ORGANIZATION, type OrganizationContent } from '$lib/nostr/kinds';
import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';

// Constants
export const locationOptions = [
  'National', 'International', 'USA', 'Canada', 'UK', 
  'California', 'New York', 'Florida', 'Texas', 
  'Massachusetts', 'Washington D.C.', 'Southern U.S.', 
  'Border regions'
];

export const focusAreaOptions = [
  'Climate Justice', 'Community', 'Democracy', 'Economic Democracy',
  'Education', 'Feminism', 'Food', 'Healthcare', 'Housing',
  'Immigration', 'Indigenous', 'International', 'LGBTQIA+',
  'Palestine Solidarity', 'Racial Justice', 'Reproductive Justice',
  'Workplace Justice', 'Youth'
].sort();

export const engagementTypeOptions = [
  'In-person', 'Online', 'Hybrid', 'Construction', 'Cooking',
  'Driving/transporting', 'Editing', 'Event/protest planning & logistics',
  'Fundraising', 'Legal', 'Medical', 
  'Messaging and Narrative (arts/media/graphics)', 'Outreach',
  'Participate in trainings', 'Research', 'Strike Support',
  'Sanctuary support', 'Tech support (programming, etc.)',
  'Translation', 'Writing'
].sort();

// Helper Functions
export function getOrgContent(event: NDKEvent): OrganizationContent {
  try {
    if (!event?.content) {
      console.error('Event has no content:', event);
      throw new Error('Event has no content');
    }
    const content = JSON.parse(event.content);
    if (!content.name || !content.category || !content.description) {
      console.error('Missing required organization fields:', content);
      throw new Error('Missing required organization fields');
    }
    return content;
  } catch (e) {
    console.error('Failed to parse organization content:', e, 'Event:', event);
    return {
      name: 'Unknown Organization',
      category: 'Unknown',
      description: 'Invalid organization data',
      focusAreas: event?.tags?.filter(t => t[0] === 't').map(t => t[1]) || [],
      locations: event?.tags?.filter(t => t[0] === 'l' && t[2] === 'location').map(t => t[1]) || [],
      engagementTypes: event?.tags?.filter(t => t[0] === 'l' && t[2] === 'engagement').map(t => t[1]) || []
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