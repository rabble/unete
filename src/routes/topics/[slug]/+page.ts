import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { topics } from '$lib/topics';
import { ndk, ensureConnection, getCachedEvents } from '$lib/stores/ndk';
import { checkExistingNostrLogin } from '$lib/stores/userProfile';
import { ORGANIZATION } from '$lib/nostr/kinds';

export const ssr = false;
export const csr = true;

export const load: PageLoad = async ({ params }) => {
  const { slug } = params;

  // Immediately return the current topic data
  const currentTopic = topics.find(t => t.slug === slug);
  if (!currentTopic) {
    throw error(404, {
      message: `Topic "${slug}" not found`
    });
  }

  // Check for existing Nostr login and ensure NDK connection
  try {
    await checkExistingNostrLogin();
    await ensureConnection();
  } catch (err) {
    console.error('Connection error:', err);
    return {
      topic: currentTopic,
      organizations: [],
      allTopics: topics,
      promise: Promise.resolve({ organizations: [], allTopics: topics })
    };
  }

  // Return initial data immediately
  return {
    topic: currentTopic,
    organizations: [], // Empty initially
    allTopics: topics, // Use static topics initially
    promise: (async () => {
      try {
        const filters = {
          kinds: [ORGANIZATION],
          '#t': [slug] // Changed back to 't' tag for topics
        };
        console.log('Querying Nostr with filters:', JSON.stringify(filters, null, 2));
        let events;
        try {
          events = await getCachedEvents(filters);
        } catch (err) {
          console.error('Error fetching events:', err);
          return { organizations: [], allTopics: topics };
        }
        console.log('Received events:', events ? Array.from(events).length : 0);
        
        if (!events || events.size === 0) {
          console.log('No events returned from getCachedEvents');
          return { organizations: [], allTopics: topics };
        }

        const eventsArray = Array.from(events);
        
        // Process organizations and counts after data loads
        const topicsWithCounts = topics.map(topic => ({
          ...topic,
          count: eventsArray.filter(event => 
            event.tags.some(t => t[0] === 'f' && t[1] === topic.slug)
          ).length
        }));

        const topicOrganizations = eventsArray
          .filter(event => event.tags.some(t => t[0] === 'f' && t[1] === slug))
          .map(event => {
            try {
              const content = JSON.parse(event.content);
              return {
                id: event.id,
                name: content.name,
                category: content.category,
                description: content.description,
                focusAreas: event.tags.filter(t => t[0] === 'f').map(t => t[1]),
                locations: event.tags.filter(t => t[0] === 'l').map(t => t[1]),
                engagementTypes: event.tags.filter(t => t[0] === 'e').map(t => t[1]),
                tags: event.tags
              };
            } catch (e) {
              console.error('Failed to parse organization content:', e);
              return null;
            }
          })
          .filter(org => org !== null); // Remove any failed parses

        return {
          organizations: topicOrganizations,
          allTopics: topicsWithCounts
        };
      } catch (error) {
        console.error('Error fetching topic data:', error);
        return { organizations: [], allTopics: topics };
      }
    })()
  };
};
