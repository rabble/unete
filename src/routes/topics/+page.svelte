<script lang="ts">
  interface Topic {
    slug: string;
    title: string;
    count: number;
    description: string;
    icon: string;
  }

  const topics: Topic[] = [
    {
      slug: 'climate',
      title: 'Climate Justice',
      count: 29,
      description: 'The climate justice movement addresses the disproportionate impact of climate change on marginalized communities, emphasizing equitable solutions.',
      icon: '/assets/icons/climate.png'
    },
    {
      slug: 'community',
      title: 'Community',
      count: 74,
      description: 'Community organizing focuses on building power through collective action at the local level, emphasizing mutual aid and community self-defense.'
    },
    {
      slug: 'democracy',
      title: 'Democracy',
      count: 77,
      description: 'The democracy movement works to create more direct and meaningful forms of democratic participation beyond traditional representative democracy.'
    },
    {
      slug: 'economic',
      title: 'Economic Democracy',
      count: 90,
      description: 'The economic democracy movement promotes alternative economic models that prioritize community control and worker ownership.'
    },
    {
      slug: 'electoral',
      title: 'Electoral Organizing',
      count: 18,
      description: 'The electoral organizing movement leverages elections and representative democracy as tools for systemic change.'
    },
    {
      slug: 'feminism',
      title: 'Feminism',
      count: 26,
      description: 'The feminist movement advocates for the political, economic, and social equality of all genders.'
    },
    {
      slug: 'food',
      title: 'Food',
      count: 12,
      description: 'The food justice movement works to ensure equitable access to healthy, culturally appropriate food through sustainable food systems.'
    },
    {
      slug: 'healthcare',
      title: 'Healthcare',
      count: 13,
      description: 'The healthcare justice movement advocates for universal access to quality healthcare as a human right.'
    },
    {
      slug: 'housing',
      title: 'Housing',
      count: 24,
      description: 'The housing rights movement advocates for accessible, affordable, and adequate housing as a fundamental human right.'
    },
    {
      slug: 'immigration',
      title: 'Immigration',
      count: 12,
      description: 'The immigrant rights movement advocates for the fair treatment and integration of immigrants into society.'
    },
    {
      slug: 'indigenous',
      title: 'Indigenous',
      count: 22,
      description: 'The Indigenous movement advocates for the rights, sovereignty, and self-determination of Native American and Indigenous peoples.'
    },
    {
      slug: 'lgbtqia',
      title: 'LGBTQIA+',
      count: 13,
      description: 'The LGBTQIA+ rights movement advocates for the equal treatment and acceptance of individuals across diverse sexual orientations and gender identities.'
    },
    {
      slug: 'palestine',
      title: 'Palestine Solidarity',
      count: 15,
      description: 'The Palestinian solidarity movement advocates for the rights and self-determination of the Palestinian people.'
    },
    {
      slug: 'racial',
      title: 'Racial Justice',
      count: 65,
      description: 'The racial justice movement strives to dismantle systemic racism and promote equity across all facets of society.'
    },
    {
      slug: 'reproductive',
      title: 'Reproductive Justice',
      count: 11,
      description: 'The reproductive justice movement advocates for the human right to maintain personal bodily autonomy and access comprehensive reproductive healthcare.'
    },
    {
      slug: 'workplace',
      title: 'Workplace Justice',
      count: 15,
      description: 'The workplace justice movement fights for workers\' rights, fair wages, safe working conditions, and the right to organize.'
    },
    {
      slug: 'youth',
      title: 'Youth',
      count: 22,
      description: 'The youth empowerment movement advocates for the active participation of young people in shaping the decisions and policies that affect their lives.'
    }
  ];
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-4xl font-bold mb-8">Movement Topics</h1>

  <section class="prose max-w-none mb-12">
    <h2 class="text-2xl font-semibold mb-4">About All of Us Directory</h2>
    <p class="mb-4">
      Welcome to the All of Us Directory, a comprehensive resource connecting
      individuals with organizations working across various social justice
      movements.
    </p>
    <p class="mb-8">
      Browse the topics below to learn more about each movement area and find
      organizations working on issues you care about. Whether you're looking
      to get involved locally or connect with national campaigns, you'll find
      opportunities to contribute your skills and energy to building a better
      world.
    </p>
  </section>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    {#each topics as topic}
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <a href="/focus-areas/{topic.slug}" class="block">
          <div class="p-6">
            <div class="flex items-center gap-3 mb-2">
              <img src={topic.icon} alt={topic.title} class="w-8 h-8" />
              <h3 class="text-xl font-semibold">{topic.title}</h3>
            </div>
            <p class="text-gray-600 mb-4">{topic.count} organizations</p>
            <div class="border-t border-gray-200 my-4"></div>
            <p class="text-gray-700">{topic.description}</p>
            <div class="mt-4">
              <span class="text-purple-600 hover:text-purple-800">Learn more →</span>
            </div>
          </div>
        </a>
      </div>
    {/each}
  </div>
</div>
