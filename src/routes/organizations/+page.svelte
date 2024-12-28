<script lang="ts">
  import { onMount } from 'svelte';
  import { ORGANIZATION, type OrganizationContent, ORGANIZATION_TAGS } from '$lib/nostr/kinds';
  import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
  import { searchFilters } from '$lib/stores/searchStore';
  import SearchField from '$lib/components/SearchField.svelte';
  import Select from 'svelte-select';
  import { page } from '$app/stores';
  import { getTopics } from '$lib/topics';

  // Store for organizations
  let organizations: NDKEvent[] = [];
  let ndk: NDK;
  let loading = true;
  let error: string | null = null;

  // Filter state
  let selectedLocations: string[] = [];

  // Toggle selection helper function
  function toggleSelection(array: string[], item: string) {
    const index = array.indexOf(item);
    if (index === -1) {
      array.push(item);
    } else {
      array.splice(index, 1);
    }
    array = [...array]; // Trigger reactivity
  }
  let selectedFocusAreas: string[] = [];
  let selectedEngagementTypes: string[] = [];

  const locationOptions = [
    'National',
    'International',
    'USA',
    'Canada',
    'UK', 
    'California',
    'New York',
    'Florida',
    'Texas',
    'Massachusetts',
    'Washington D.C.',
    'Southern U.S.',
    'Border regions'
  ];
  
  const focusAreaOptions = [
    'Climate Justice',
    'Community',
    'Democracy',
    'Economic Democracy',
    'Education',
    'Feminism',
    'Food',
    'Healthcare',
    'Housing',
    'Immigration',
    'Indigenous',
    'International',
    'LGBTQIA+',
    'Palestine Solidarity',
    'Racial Justice',
    'Reproductive Justice',
    'Workplace Justice',
    'Youth'
  ].sort();

  const engagementTypeOptions = [
    'In-person',
    'Online',
    'Hybrid',
    'Construction',
    'Cooking',
    'Driving/transporting',
    'Editing',
    'Event planning',
    'Fundraising',
    'Legal',
    'Medical',
    'Media/Graphics',
    'Outreach',
    'Research',
    'Tech support',
    'Translation',
    'Writing'
  ].sort();

  onMount(async () => {
    try {
      // Initialize NDK
      ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.nos.social',
          'wss://relay.damus.io',
          'wss://relay.nostr.band'
        ]
      });
      await ndk.connect();

      // Set initial filters from URL params
      const params = $page.url.searchParams;
      searchFilters.set({
        locations: params.getAll('locations') || [],
        focusAreas: params.getAll('focusAreas') || [],
        engagementTypes: params.getAll('engagementTypes') || []
      });

      // Fetch organizations
      const events = await ndk.fetchEvents({
        kinds: [ORGANIZATION],
        limit: 100
      });
      organizations = Array.from(events);
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      loading = false;
    }
  });

  function getOrgContent(event: NDKEvent): OrganizationContent {
    try {
      return JSON.parse(event.content);
    } catch (e) {
      console.error('Failed to parse organization content:', e);
      return {
        name: 'Unknown Organization',
        category: 'Unknown',
        description: 'Invalid organization data',
        focusAreas: [],
        locations: [],
        engagementTypes: []
      };
    }
  }

  function handleSubmit() {
    const queryParams = new URLSearchParams();
    
    $searchFilters.locations.forEach(loc => 
      queryParams.append('locations', loc));
    $searchFilters.focusAreas.forEach(area => 
      queryParams.append('focusAreas', area));
    $searchFilters.engagementTypes.forEach(type => 
      queryParams.append('engagementTypes', type));
    
    window.history.pushState({}, '', `?${queryParams.toString()}`);
  }

  // Filter organizations based on selected criteria
  $: filteredOrganizations = organizations.filter(event => {
    const org = getOrgContent(event);
    const filters = $searchFilters;
    
    const locationMatch = !filters.locations?.length || 
      org.locations?.some(loc => filters.locations.includes(loc));
    
    const focusMatch = !filters.focusAreas?.length ||
      org.focusAreas?.some(area => filters.focusAreas.includes(area));
    
    const engagementMatch = !filters.engagementTypes?.length ||
      org.engagementTypes?.some(type => filters.engagementTypes.includes(type));
    
    return locationMatch && focusMatch && engagementMatch;
  });
</script>

<div class="max-w-7xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Search Organizations</h1>
  
  <p class="text-lg text-gray-700 text-center mb-12">
    Use the search to find and share resources and skills in your area or online. 
    For your locale, your issue interests, and how you would like to help, 
    choose one or more preferences to filter your search.
  </p>

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="grid md:grid-cols-3 gap-6 mb-12">
    <!-- Locations Filter -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h3 class="text-xl font-semibold mb-4">Select Locations</h3>
      <Select
        items={locationOptions}
        isMulti={true}
        bind:value={$searchFilters.locations}
        placeholder="Select locations..."
        class="!bg-white"
      />
    </div>

    <!-- Focus Areas Filter -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h3 class="text-xl font-semibold mb-4">Select Focus Areas</h3>
      <Select
        items={focusAreaOptions}
        isMulti={true}
        bind:value={$searchFilters.focusAreas}
        placeholder="Select focus areas..."
        class="!bg-white"
      />
    </div>

    <!-- Engagement Types Filter -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h3 class="text-xl font-semibold mb-4">Select Engagement Types</h3>
      <Select
        items={engagementTypeOptions}
        isMulti={true}
        bind:value={$searchFilters.engagementTypes}
        placeholder="Select engagement types..."
        class="!bg-white"
      />
    </div>
  </form>

  <!-- Organizations List -->
  <div class="space-y-8">
    {#if loading}
      <div class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    {:else if filteredOrganizations.length === 0}
      <div class="text-center py-12">
        <p class="text-gray-600">No organizations found matching your criteria.</p>
      </div>
    {:else}
      {#each filteredOrganizations as event}
        {@const org = getOrgContent(event)}
        <a 
          href="/organizations/{event.id}" 
          class="block bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          data-sveltekit-preload-data
        >
          <div class="flex items-start gap-4">
            {#if org.picture}
              <img 
                src={org.picture} 
                alt={org.name}
                class="w-24 h-24 object-cover rounded-lg"
              />
            {/if}
            <div class="flex-1">
              <h2 class="text-2xl font-bold mb-2">{org.name}</h2>
              <p class="text-purple-600 font-medium mb-4">{org.category}</p>
              <p class="text-gray-700 mb-6">{org.description}</p>
              
              <div class="space-y-4">
                <div>
                  <h3 class="font-semibold mb-2">Focus Areas:</h3>
                  <div class="flex flex-wrap gap-2">
                    {#each org.focusAreas as area}
                      <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                        {area}
                      </span>
                    {/each}
                  </div>
                </div>
                
                <div>
                  <h3 class="font-semibold mb-2">Locations:</h3>
                  <div class="flex flex-wrap gap-2">
                    {#each org.locations as location}
                      <span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                        {location}
                      </span>
                    {/each}
                  </div>
                </div>

                <div>
                  <h3 class="font-semibold mb-2">Engagement Types:</h3>
                  <div class="flex flex-wrap gap-2">
                    {#each org.engagementTypes as type}
                      <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        {type}
                      </span>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a>
      {/each}
    {/if}
  </div>
</div>
