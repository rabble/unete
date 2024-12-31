<script lang="ts">
  import { navigating } from '$app/stores';
  import TagLink from '$lib/components/TagLink.svelte';

  export let data;
  
  let organizations = [];
  let allTopics = data.allTopics;
  let loadingNostr = true;
  let error = null;

  // Load data once when component mounts
  async function loadData() {
    try {
      console.log('Starting data load...');
      loadingNostr = true;
      error = null;
      const result = await data.promise;
      console.log('Data promise resolved:', result);

      if (!result.organizations) {
        console.warn('No organizations found in result');
      } else {
        console.log(`Processing ${result.organizations.length} organizations`);
      }

      // Filter organizations that match the current topic
      organizations = (result.organizations || []).filter(org => {
        console.group('Processing organization:', org.name);
        console.log('Organization ID:', org.id);
        
        // Check both focusAreas array and tags for matches
        const focusAreas = org.focusAreas || [];
        const tagFocusAreas = (org.tags || [])
          .filter(t => t[0] === 'f')
          .map(t => t[1]);
          
        const allFocusAreas = [...new Set([...focusAreas, ...tagFocusAreas])];
        console.log('All focus areas:', allFocusAreas);
        
        // Normalize topic variations
        const topicVariations = {
          'climate': ['climate', 'climate justice', 'climate change', 'climate action', 'environment', 'environmental justice', 'sustainability'],
          'community': ['community', 'community organizing', 'mutual aid', 'local organizing', 'grassroots'],
          'democracy': ['democracy', 'direct democracy', 'participatory democracy', 'political reform', 'governance'],
          'economic': ['economic democracy', 'cooperatives', 'worker ownership', 'solidarity economy', 'economic justice'],
          'feminism': ['feminism', 'gender equality', 'women\'s rights', 'gender justice', 'feminist movement'],
          'food': ['food', 'food justice', 'food sovereignty', 'agriculture', 'sustainable food'],
          'healthcare': ['healthcare', 'health justice', 'universal healthcare', 'medical care', 'public health'],
          'housing': ['housing', 'housing justice', 'affordable housing', 'tenant rights', 'homelessness'],
          'immigration': ['immigration', 'immigrant rights', 'migration', 'refugee rights', 'border justice'],
          'indigenous': ['indigenous', 'native rights', 'tribal sovereignty', 'first nations', 'indigenous justice'],
          'lgbtqia': ['lgbtqia+', 'lgbtq', 'queer', 'gender diversity', 'sexual orientation'],
          'palestine': ['palestine', 'palestinian solidarity', 'middle east', 'israel-palestine', 'gaza'],
          'racial': ['racial justice', 'anti-racism', 'black lives matter', 'racial equity', 'civil rights'],
          'reproductive': ['reproductive justice', 'abortion rights', 'birth control', 'family planning', 'women\'s health'],
          'workplace': ['workplace justice', 'labor rights', 'unions', 'worker rights', 'employment'],
          'youth': ['youth', 'young people', 'students', 'teenagers', 'youth empowerment']
        };
        
        const currentTopic = data.topic.title.toLowerCase();
        const variations = topicVariations[currentTopic] || [currentTopic];
        console.log('Current topic:', currentTopic);
        console.log('Topic variations:', variations);
        
        const matches = allFocusAreas.some(area => {
          const match = variations.includes(area.toLowerCase());
          console.log(`Checking "${area}": ${match}`);
          return match;
        });
        
        console.log('Organization matches topic:', matches);
        console.groupEnd();
        return matches;
      });
      
      console.log(`Found ${organizations.length} matching organizations`);
      allTopics = result.allTopics || data.allTopics;
      console.log('All topics:', allTopics);
    } catch (err) {
      console.error('Failed to load Nostr data:', err);
      error = err.message;
    } finally {
      loadingNostr = false;
    }
  }

  // Initialize data loading
  loadData();
  
  $: engagementTypes = [...new Set(
    organizations?.flatMap(org => 
      org.tags?.filter(t => t[0] === 'engagement').map(t => t[1]) || []
    ) || []
  )];

  $: engagementCounts = engagementTypes.reduce<Record<string, number>>((acc, type) => {
    acc[type] = organizations?.filter(org => 
      org.tags?.some(t => t[0] === 'engagement' && t[1] === type)
    ).length || 0;
    return acc;
  }, {});
</script>

<div class="container mx-auto px-4 py-8" key={data.topic.slug}>
  <div class="flex flex-col md:flex-row gap-8">
    <!-- Sidebar -->
    <div class="md:w-1/4">
      <div class="bg-white rounded-lg shadow p-6 sticky top-4">
        <div class="mb-8">
          <h3 class="text-xl font-bold mb-4">Focus Areas</h3>
          <ul class="space-y-2">
            {#each allTopics as t}
              <li>
                <a 
                  href="/topics/{t.slug}" 
                  data-sveltekit-preload-data
                  data-sveltekit-noscroll
                  class="text-gray-700 hover:text-purple-600 flex items-center justify-between {t.slug === data.topic.slug ? 'font-bold text-purple-600' : ''}"
                >
                  <span>{t.title}</span>
                  {#if t.count}
                    <span class="text-sm text-gray-500">{t.count}</span>
                  {/if}
                </a>
              </li>
            {/each}
          </ul>
        </div>

        <div>
          <h3 class="text-xl font-bold mb-4">Engagement Types</h3>
          <ul class="space-y-2">
            {#each Object.entries(engagementCounts) as [type, count]}
              <li>
                <a 
                  href="/engagement-types/{type.toLowerCase()}" 
                  class="text-gray-700 hover:text-purple-600 flex items-center justify-between"
                >
                  <span>{type}</span>
                  <span class="text-sm text-gray-500">{count}</span>
                </a>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="md:w-3/4">
      <h1 class="text-4xl font-bold mb-8">{data.topic.title}</h1>

      <section class="prose max-w-none mb-12">
        <h2 class="text-2xl font-semibold mb-4">About this Movement</h2>
        <p class="mb-8">{data.topic.description}</p>
      </section>

      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-6">Organizations Working on {data.topic.title}</h2>
        
        {#if error}
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong class="font-bold">Error loading data: </strong>
            <span class="block sm:inline">{error}</span>
          </div>
        {:else if loadingNostr}
          <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        {:else if organizations.length === 0}
          <div class="text-center py-12">
            <p class="text-gray-600">No organizations found for this focus area.</p>
          </div>
        {:else}
          <div class="space-y-8">
            {#each organizations as org}
              <div class="bg-white rounded-lg shadow-lg p-6">
                <a href="/organizations/{org.id}" class="block">
                  <h3 class="text-2xl font-semibold mb-2">{org.name}</h3>
                  {#if org.category}
                    <p class="text-purple-600 mb-4">{org.category}</p>
                  {/if}
                  <p class="text-gray-700 mb-6">{org.description}</p>
                  
                  {#if org.focusAreas?.length > 0}
                    <div class="mb-4">
                      <h4 class="font-semibold mb-2">Focus Areas:</h4>
                      <div class="flex flex-wrap">
                        {#each org.focusAreas as area}
                          <TagLink type="topic" value={area} />
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if org.engagementTypes?.length > 0}
                    <div class="mb-4">
                      <h4 class="font-semibold mb-2">Ways to Engage:</h4>
                      <div class="flex flex-wrap">
                        {#each org.engagementTypes as type}
                          <TagLink type="engagement" value={type} />
                        {/each}
                      </div>
                    </div>
                  {/if}
                  
                  {#if org.locations?.length > 0}
                    <div>
                      <h4 class="font-semibold mb-2">Locations:</h4>
                      <div class="flex flex-wrap">
                        {#each org.locations as location}
                          <TagLink type="location" value={location} />
                        {/each}
                      </div>
                    </div>
                  {/if}
                </a>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </div>
  </div>
</div>
