import type NDK from '@nostr-dev-kit/ndk';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { TOPICS, type TopicsContent, TOPICS_TAGS } from './nostr/kinds';

// Default topics if no list exists
export const DEFAULT_TOPICS = [
  'Housing',
  'Racial Justice', 
  'Economic Democracy',
  'Community',
  'Immigration',
  'Youth',
  'Climate Justice',
  'Workplace Justice',
  'Feminism',
  'LGBTQIA+',
  'Indigenous',
  'Food',
  'Healthcare',
  'Education',
  'Democracy',
  'Palestine Solidarity',
  'Legal',
  'International'
];

export async function getTopics(ndk: NDK): Promise<string[]> {
  // Try to fetch existing topics list
  const topicsEvents = await ndk.fetchEvents({
    kinds: [TOPICS],
    limit: 1
  });

  const topicsEvent = Array.from(topicsEvents)[0];
  
  if (topicsEvent) {
    const content = JSON.parse(topicsEvent.content) as TopicsContent;
    return content.topics;
  }

  // If no topics exist, create default list
  if (ndk.signer) {
    await createDefaultTopics(ndk);
  }

  return DEFAULT_TOPICS;
}

export async function createDefaultTopics(ndk: NDK) {
  const event = new NDKEvent(ndk);
  event.kind = TOPICS;
  
  const content: TopicsContent = {
    topics: DEFAULT_TOPICS,
    description: "Default topics list for All of Us Directory",
    lastUpdated: Math.floor(Date.now() / 1000)
  };
  
  event.content = JSON.stringify(content);
  event.tags = [
    [TOPICS_TAGS.IDENTIFIER, 'default-topics'],
    ...DEFAULT_TOPICS.map(topic => [TOPICS_TAGS.TOPIC, topic])
  ];

  await event.publish();
  return event;
}
