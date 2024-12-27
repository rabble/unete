<script lang="ts">
  import { topics } from '$lib/topics';
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
      slug: 'democracy',
      title: 'Democracy',
      count: 77,
      description: 'The democracy movement works to create more direct and meaningful forms of democratic participation beyond traditional representative democracy.',
      icon: '/assets/icons/direct-democracy.png'
    },
    {
      slug: 'economic',
      title: 'Economic Democracy',
      count: 90,
      description: 'The economic democracy movement promotes alternative economic models that prioritize community control and worker ownership.',
      icon: '/assets/icons/economic.png'
    },
    {
      slug: 'electoral',
      title: 'Electoral Organizing',
      count: 18,
      description: 'The electoral organizing movement leverages elections and representative democracy as tools for systemic change.',
      icon: '/assets/icons/electoral.png'
    },
    {
      slug: 'feminism',
      title: 'Feminism',
      count: 26,
      description: 'The feminist movement advocates for the political, economic, and social equality of all genders.',
      icon: '/assets/icons/feminism.png'
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
      slug: 'housing',
      title: 'Housing',
      count: 24,
      description: 'The housing rights movement advocates for accessible, affordable, and adequate housing as a fundamental human right.',
      icon: '/assets/icons/housing.png'
    },
    {
      slug: 'immigration',
      title: 'Immigration',
      count: 12,
      description: 'The immigrant rights movement advocates for the fair treatment and integration of immigrants into society.',
      icon: '/assets/icons/immigration.png'
    },
    {
      slug: 'indigenous',
      title: 'Indigenous',
      count: 22,
      description: 'The Indigenous movement advocates for the rights, sovereignty, and self-determination of Native American and Indigenous peoples.',
      icon: '/assets/icons/indigenous.png'
    },
    {
      slug: 'lgbtqia',
      title: 'LGBTQIA+',
      count: 13,
      description: 'The LGBTQIA+ rights movement advocates for the equal treatment and acceptance of individuals across diverse sexual orientations and gender identities.',
      icon: '/assets/icons/lgbtqia.png'
    },
    {
      slug: 'palestine',
      title: 'Palestine Solidarity',
      count: 15,
      description: 'The Palestinian solidarity movement advocates for the rights and self-determination of the Palestinian people.',
      icon: '/assets/icons/palestine.png'
    },
    {
      slug: 'racial',
      title: 'Racial Justice',
      count: 65,
      description: 'The racial justice movement strives to dismantle systemic racism and promote equity across all facets of society.',
      icon: '/assets/icons/racial.png'
    },
    {
      slug: 'reproductive',
      title: 'Reproductive Justice',
      count: 11,
      description: 'The reproductive justice movement advocates for the human right to maintain personal bodily autonomy and access comprehensive reproductive healthcare.',
      icon: '/assets/icons/reproductive.png'
    },
    {
      slug: 'workplace',
      title: 'Workplace Justice',
      count: 15,
      description: 'The workplace justice movement fights for workers\' rights, fair wages, safe working conditions, and the right to organize.',
      icon: '/assets/icons/workplace.png'
    },
    {
      slug: 'youth',
      title: 'Youth',
      count: 22,
      description: 'The youth empowerment movement advocates for the active participation of young people in shaping the decisions and policies that affect their lives.',
      icon: '/assets/icons/youth.png'
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
      <div class="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:scale-[1.02] hover:shadow-xl">
        <a href="/topics/{topic.slug}" class="block focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 rounded-lg">
          <div class="p-6 hover:bg-gray-50 transition-colors">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-xl font-semibold mb-1">{topic.title}</h3>
                <p class="text-gray-600">{topic.count} organizations</p>
              </div>
              <img src={topic.icon} alt={topic.title} class="w-16 h-16" />
            </div>
            <div class="border-t border-gray-200 my-4"></div>
            <p class="text-gray-700">{topic.description}</p>
            <div class="mt-4">
              <span class="text-purple-600 hover:text-purple-800 inline-flex items-center">
                Learn more 
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
          </div>
        </a>
      </div>
    {/each}
  </div>
</div>
