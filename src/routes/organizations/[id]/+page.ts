import type { PageLoad } from './$types';
import { getCachedEvents, ensureConnection } from '$lib/stores/ndk';
import { ORGANIZATION } from '$lib/nostr/kinds';

export const ssr = false;
export const csr = true;

export const load: PageLoad = async ({ params }) => {
  const { id } = params;

  // Ensure NDK is connected before fetching
  await ensureConnection();

  // Return initial data and promise
  return {
    promise: getCachedEvents({
      kinds: [ORGANIZATION],
      ids: [id]
    }).then(events => {
      // Convert Set to Array and get first event
      const eventsArray = Array.from(events);
      console.log('Found events:', eventsArray.length, 'for id:', id);
      
      const event = eventsArray[0];
      if (!event) {
        console.error('No event found for id:', id);
        throw new Error('Organization not found');
      }

      try {
        console.log('Parsing event content:', event);
        const content = JSON.parse(event.content);
        return {
          organization: {
            ...content,
            id: event.id,
            pubkey: event.pubkey,
            created_at: event.created_at,
            kind: event.kind,
            sig: event.sig,
            focusAreas: event.tags.filter(t => t[0] === 't').map(t => t[1]),
            locations: event.tags.filter(t => t[0] === 'l' && t[2] === 'location').map(t => t[1]),
            engagementTypes: event.tags.filter(t => t[0] === 'l' && t[2] === 'engagement').map(t => t[1]),
            tags: event.tags
          },
          event: event
        };
      } catch (e) {
        console.error('Failed to parse organization content:', e, 'Event:', event);
        throw new Error('Invalid organization data');
      }
    })
  };
};
