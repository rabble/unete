import type { PageLoad } from './$types';
import NDK from '@nostr-dev-kit/ndk';
import { topics } from '$lib/topics';

export const load: PageLoad = async ({ params }) => {
  // Invalidate the page data when params change
  export const ssr = false;
  export const csr = true;
  const { slug } = params;

  // Initialize NDK
  const ndk = new NDK({
    explicitRelayUrls: [
      'wss://relay.nos.social',
      'wss://relay.damus.io',
      'wss://relay.nostr.band'
    ]
  });
  await ndk.connect();

  // First fetch all organizations with topic tags
  const events = await ndk.fetchEvents({
    kinds: [31312],
    '#t': [] // Fetch all organizations with any topic tag
  });

  // Get all unique topics from organizations
  const orgTopics = new Set<string>();
  events.forEach(event => {
    event.tags
      .filter(t => t[0] === 't')
      .forEach(t => orgTopics.add(t[1]));
  });

  // Update topic counts
  const topicsWithCounts = topics.map(topic => ({
    ...topic,
    count: Array.from(events).filter(event => 
      event.tags.some(t => t[0] === 't' && t[1] === topic.slug)
    ).length
  }));

  // Get organizations for the current topic
  const topicOrganizations = Array.from(events)
    .filter(event => event.tags.some(t => t[0] === 't' && t[1] === slug))
    .map(event => {
      const name = event.tags.find(t => t[0] === 'name')?.[1] || 'Unnamed Organization';
      const category = event.tags.find(t => t[0] === 'category')?.[1];
      const description = event.content;
      const focusAreas = event.tags.filter(t => t[0] === 't').map(t => t[1]);
      const locations = event.tags.filter(t => t[0] === 'l').map(t => t[1]);
      
      return {
        id: event.id,
        name,
        category,
        description,
        focusAreas,
        locations,
        tags: event.tags // Include all tags for engagement types
      };
    });

  const currentTopic = topicsWithCounts.find(t => t.slug === slug);
  if (!currentTopic) {
    throw new Error(`Topic ${slug} not found`);
  }

  return {
    topic: currentTopic,
    organizations: topicOrganizations,
    allTopics: topicsWithCounts
  };
};
