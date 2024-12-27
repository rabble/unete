import type { PageLoad } from './$types';
import { getCachedEvents } from '$lib/stores/ndk';
import { ORGANIZATION } from '$lib/nostr/kinds';

export const ssr = false;
export const csr = true;

export const load: PageLoad = async ({ params }) => {
  const { id } = params;

  // Return initial data and promise
  return {
    promise: getCachedEvents({
      kinds: [ORGANIZATION],
      ids: [id]
    }).then(events => {
      const event = Array.from(events)[0];
      if (!event) {
        throw new Error('Organization not found');
      }

      try {
        const content = JSON.parse(event.content);
        return {
          ...content,
          id: event.id,
          focusAreas: event.tags.filter(t => t[0] === 'f').map(t => t[1]),
          locations: event.tags.filter(t => t[0] === 'l').map(t => t[1]),
          engagementTypes: event.tags.filter(t => t[0] === 'e').map(t => t[1])
        };
      } catch (e) {
        console.error('Failed to parse organization content:', e);
        throw new Error('Invalid organization data');
      }
    })
  };
};
