import type { PageLoad } from './$types';
import { topics } from '$lib/topics';
import NDK from '@nostr-dev-kit/ndk';

export const ssr = false;
export const csr = true;

export const load: PageLoad = async ({ params }) => {
  const { slug } = params;

  // Immediately return the current topic data
  const currentTopic = topics.find(t => t.slug === slug);
  if (!currentTopic) {
    throw new Error(`Topic ${slug} not found`);
  }

  // Initialize NDK
  const ndk = new NDK({
    explicitRelayUrls: [
      'wss://relay.nos.social',
      'wss://relay.damus.io',
      'wss://relay.nostr.band'
    ]
  });
  await ndk.connect();

  // Return initial data immediately
  return {
    topic: currentTopic,
    organizations: [], // Empty initially
    allTopics: topics, // Use static topics initially
    promise: ndk.fetchEvents({
      kinds: [34550],
      '#t': [] // Fetch all organizations with any topic tag
    }).then(events => {
      const eventsArray = Array.from(events);
      
      // Process organizations and counts after data loads
      const topicsWithCounts = topics.map(topic => ({
        ...topic,
        count: eventsArray.filter(event => 
          event.tags.some(t => t[0] === 't' && t[1] === topic.slug)
        ).length
      }));

      const topicOrganizations = eventsArray
        .filter(event => event.tags.some(t => t[0] === 't' && t[1] === slug))
        .map(event => ({
          id: event.id,
          name: event.tags.find(t => t[0] === 'name')?.[1] || 'Unnamed Organization',
          category: event.tags.find(t => t[0] === 'category')?.[1],
          description: event.content,
          focusAreas: event.tags.filter(t => t[0] === 't').map(t => t[1]),
          locations: event.tags.filter(t => t[0] === 'l').map(t => t[1]),
          tags: event.tags
        }));

      return {
        organizations: topicOrganizations,
        allTopics: topicsWithCounts
      };
    })
  };
};
