import type NDK from '@nostr-dev-kit/ndk'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { TOPICS, type TopicsContent, TOPICS_TAGS } from './nostr/kinds'

export interface Topic {
  slug: string;
  title: string;
  count?: number;
  description: string;
  icon: string;
}

// Topics array for UI
export const topics: Topic[] = [
  {
    slug: 'housing',
    title: 'Housing',
    description: 'The housing rights movement advocates for accessible, affordable, and adequate housing as a fundamental human right.',
    icon: '/assets/icons/housing.png'
  },
  {
    slug: 'racial',
    title: 'Racial Justice',
    description: 'The racial justice movement strives to dismantle systemic racism and promote equity across all facets of society.',
    icon: '/assets/icons/racial.png'
  },
  {
    slug: 'economic',
    title: 'Economic Democracy',
    description: 'The economic democracy movement promotes alternative economic models that prioritize community control and worker ownership.',
    icon: '/assets/icons/economic.png'
  },
  {
    slug: 'community',
    title: 'Community',
    count: 74,
    description: 'Community organizing focuses on building power through collective action at the local level, emphasizing mutual aid and community self-defense.',
    icon: '/assets/icons/community.png'
  },
  {
    slug: 'immigration',
    title: 'Immigration',
    count: 12,
    description: 'The immigrant rights movement advocates for the fair treatment and integration of immigrants into society.',
    icon: '/assets/icons/immigration.png'
  },
  {
    slug: 'youth',
    title: 'Youth',
    count: 22,
    description: 'The youth empowerment movement advocates for the active participation of young people in shaping the decisions and policies that affect their lives.',
    icon: '/assets/icons/youth.png'
  },
  {
    slug: 'climate',
    title: 'Climate Justice',
    count: 29,
    description: 'The climate justice movement addresses the disproportionate impact of climate change on marginalized communities, emphasizing equitable solutions.',
    icon: '/assets/icons/climate.png'
  },
  {
    slug: 'workplace',
    title: 'Workplace Justice',
    count: 15,
    description: 'The workplace justice movement fights for workers\' rights, fair wages, safe working conditions, and the right to organize.',
    icon: '/assets/icons/workplace.png'
  },
  {
    slug: 'feminism',
    title: 'Feminism',
    count: 26,
    description: 'The feminist movement advocates for the political, economic, and social equality of all genders.',
    icon: '/assets/icons/feminism.png'
  },
  {
    slug: 'lgbtqia',
    title: 'LGBTQIA+',
    count: 13,
    description: 'The LGBTQIA+ rights movement advocates for the equal treatment and acceptance of individuals across diverse sexual orientations and gender identities.',
    icon: '/assets/icons/lgbtqia.png'
  },
  {
    slug: 'indigenous',
    title: 'Indigenous',
    count: 22,
    description: 'The Indigenous movement advocates for the rights, sovereignty, and self-determination of Native American and Indigenous peoples.',
    icon: '/assets/icons/indigenous.png'
  },
  {
    slug: 'food',
    title: 'Food',
    count: 12,
    description: 'The food justice movement works to ensure equitable access to healthy, culturally appropriate food through sustainable food systems.',
    icon: '/assets/icons/food.png'
  },
  {
    slug: 'healthcare',
    title: 'Healthcare',
    count: 13,
    description: 'The healthcare justice movement advocates for universal access to quality healthcare as a human right.',
    icon: '/assets/icons/healthcare.png'
  },
  {
    slug: 'democracy',
    title: 'Democracy',
    count: 77,
    description: 'The democracy movement works to create more direct and meaningful forms of democratic participation beyond traditional representative democracy.',
    icon: '/assets/icons/direct-democracy.png'
  },
  {
    slug: 'palestine',
    title: 'Palestine Solidarity',
    count: 15,
    description: 'The Palestinian solidarity movement advocates for the rights and self-determination of the Palestinian people.',
    icon: '/assets/icons/palestine.png'
  },
  {
    slug: 'reproductive',
    title: 'Reproductive Justice',
    count: 11,
    description: 'The reproductive justice movement advocates for the human right to maintain personal bodily autonomy and access comprehensive reproductive healthcare.',
    icon: '/assets/icons/reproductive.png'
  }
];

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

  return DEFAULT_TOPICS
}

export async function createDefaultTopics(ndk: NDK): Promise<NDKEvent> {
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

  await event.publish()
  return event
}
