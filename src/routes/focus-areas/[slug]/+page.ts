import type { PageLoad } from './$types';
import NDK from '@nostr-dev-kit/ndk';
import { topics } from '$lib/topics';

export const load: PageLoad = async ({ params }) => {
  const { slug } = params;

  // Find the topic details
  const topic = topics.find(t => t.slug === slug);
  if (!topic) {
    throw new Error(`Topic ${slug} not found`);
  }

  // Connect to Nostr
  const ndk = new NDK({
    explicitRelayUrls: [
      'wss://relay.nos.social',
      'wss://relay.damus.io',
      'wss://relay.nostr.band'
    ]
  });
  await ndk.connect();

  // Fetch organizations with this topic tag
  const events = await ndk.fetchEvents({
    kinds: [34550], // Organization kind
    "#t": [slug]  // Filter by topic tag
  });

  const organizations = Array.from(events).map(event => {
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
      locations
    };
  });

  return {
    topic,
    organizations
  };
};
