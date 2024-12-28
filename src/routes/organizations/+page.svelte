<script lang="ts">
  import { onMount } from 'svelte';
  import { ORGANIZATION, type OrganizationContent, ORGANIZATION_TAGS } from '$lib/nostr/kinds';
  import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';

  // Filter state
  let selectedLocations: string[] = [];
  let selectedFocusAreas: string[] = [];
  let selectedEngagementTypes: string[] = [];

  import { getTopics } from '$lib/topics';
  
  let focusAreas: string[] = [
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

  // Filter options  
  const locations = [
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


  const engagementTypes = [
    'Direct Action',
    'Community Organizing',
    'Policy Advocacy',
    'Education',
    'Mutual Aid',
    'Legal Support',
    'Research',
    'Media',
    'Technical Support'
  ];

  // Store for organizations
  let organizations: NDKEvent[] = [];
  let ndk: NDK;

  let loading = true;

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

      // Load focus areas
      focusAreas = await getTopics(ndk);

      // Fetch organizations
      const events = await ndk.fetchEvents({
        kinds: [ORGANIZATION],
        limit: 100 // Adjust as needed
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

  // Filter organizations based on selected criteria
  $: filteredOrganizations = organizations.filter(event => {
    const org = getOrgContent(event);
    const locationMatch = selectedLocations.length === 0 || 
      org.locations.some(loc => selectedLocations.includes(loc));
    
    const focusMatch = selectedFocusAreas.length === 0 ||
      org.focusAreas.some(focus => selectedFocusAreas.includes(focus));
    
    const engagementMatch = selectedEngagementTypes.length === 0 ||
      org.engagementTypes.some(type => selectedEngagementTypes.includes(type));
    
    return locationMatch && focusMatch && engagementMatch;
  });

  // Toggle selection in array
  function toggleSelection(array: string[], item: string) {
    const index = array.indexOf(item);
    if (index === -1) {
      array.push(item);
    } else {
      array.splice(index, 1);
    }
    array = [...array]; // Trigger reactivity
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { ORGANIZATION, type OrganizationContent } from '$lib/nostr/kinds';
  import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
  import { searchFilters } from '$lib/stores/searchStore';
  import SearchField from '$lib/components/SearchField.svelte';
  import { page } from '$app/stores';

  // Store for organizations
  let organizations: NDKEvent[] = [];
  let ndk: NDK;
  let loading = true;
  
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
        location: params.get('location') || '',
        focusArea: params.get('focusArea') || '',
        engagementType: params.get('engagementType') || ''
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
    if ($searchFilters.location) queryParams.set('location', $searchFilters.location);
    if ($searchFilters.focusArea) queryParams.set('focusArea', $searchFilters.focusArea);
    if ($searchFilters.engagementType) queryParams.set('engagementType', $searchFilters.engagementType);
    
    window.history.pushState({}, '', `?${queryParams.toString()}`);
  }

  // Filter organizations based on selected criteria
  $: filteredOrganizations = organizations.filter(event => {
    const org = getOrgContent(event);
    
    const locationMatch = !$searchFilters.location || 
      org.locations.some(loc => loc.toLowerCase().includes($searchFilters.location.toLowerCase()));
    
    const focusMatch = !$searchFilters.focusArea ||
      org.focusAreas.includes($searchFilters.focusArea);
    
    const engagementMatch = !$searchFilters.engagementType ||
      org.engagementTypes.includes($searchFilters.engagementType);
    
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

  <form on:submit|preventDefault={handleSubmit} class="grid md:grid-cols-3 gap-6 mb-12">
    <!-- Locations Filter -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h3 class="text-xl font-semibold mb-4">Select Locations</h3>
      <div class="space-y-2">
        {#each locations as location}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedLocations.includes(location)}
              on:change={() => toggleSelection(selectedLocations, location)}
              class="form-checkbox h-5 w-5 text-purple-600"
            />
            <span>{location}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Focus Areas Filter -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h3 class="text-xl font-semibold mb-4">Select Focus Areas</h3>
      <div class="space-y-2">
        {#each focusAreas as area}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedFocusAreas.includes(area)}
              on:change={() => toggleSelection(selectedFocusAreas, area)}
              class="form-checkbox h-5 w-5 text-purple-600"
            />
            <span>{area}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Engagement Types Filter -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h3 class="text-xl font-semibold mb-4">Select Engagement Types</h3>
      <div class="space-y-2">
        {#each engagementTypes as type}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedEngagementTypes.includes(type)}
              on:change={() => toggleSelection(selectedEngagementTypes, type)}
              class="form-checkbox h-5 w-5 text-purple-600"
            />
            <span>{type}</span>
          </label>
        {/each}
      </div>
    </div>
  </div>

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
<script lang="ts">
  import { onMount } from 'svelte';
  import { ndk } from '$lib/stores/ndk';
  import type { OrganizationContent } from '$lib/nostr/kinds';

  let organizations: OrganizationContent[] = [];
  let filteredOrganizations: OrganizationContent[] = [];
  let loading = true;
  let error: string | null = null;

  // Filter states
  let selectedLocations: string[] = [];
  let selectedFocusAreas: string[] = [];
  let selectedEngagementTypes: string[] = [];

  // Available filter options
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
    'Electoral Organizing',
    'Feminism',
    'Food',
    'Healthcare',
    'Housing',
    'Immigration',
    'Indigenous',
    'International',
    'LGBTQIA+',
    'Legal',
    'Palestine Solidarity',
    'Privacy',
    'Racial Justice',
    'Reproductive Justice',
    'Workplace Justice',
    'Youth'
  ];

  const engagementTypeOptions = [
    'In-person',
    'Online',
    'Hybrid',
    'Construction',
    'Cooking',
    'Driving/transporting',
    'Editing',
    'Event/protest planning & logistics',
    'Fundraising',
    'Legal',
    'Medical',
    'Messaging and Narrative (arts/media/graphics)',
    'Outreach',
    'Participate in trainings',
    'Research',
    'Strike Support',
    'Sanctuary support',
    'Tech support (programming, etc.)',
    'Translation',
    'Writing'
  ];

  onMount(async () => {
    try {
      // Fetch organizations from NDK
      const events = await ndk.fetchEvents({
        kinds: [1], // Adjust kind number based on your setup
        "#t": ["organization"] // Assuming you use this tag to identify org posts
      });

      organizations = Array.from(events).map(event => {
        try {
          return JSON.parse(event.content);
        } catch (e) {
          console.error('Failed to parse organization:', e);
          return null;
        }
      }).filter(org => org !== null);

      applyFilters();
      loading = false;
    } catch (e) {
      console.error('Failed to fetch organizations:', e);
      error = 'Failed to load organizations. Please try again later.';
      loading = false;
    }
  });

  function toggleFilter(array: string[], item: string) {
    const index = array.indexOf(item);
    if (index === -1) {
      array.push(item);
    } else {
      array.splice(index, 1);
    }
    array = [...array]; // Trigger reactivity
    applyFilters();
  }

  function applyFilters() {
    filteredOrganizations = organizations.filter(org => {
      const locationMatch = selectedLocations.length === 0 || 
        org.locations.some(loc => selectedLocations.includes(loc));
      
      const focusMatch = selectedFocusAreas.length === 0 ||
        org.focusAreas.some(focus => selectedFocusAreas.includes(focus));
      
      const engagementMatch = selectedEngagementTypes.length === 0 ||
        org.engagementTypes.some(type => selectedEngagementTypes.includes(type));
      
      return locationMatch && focusMatch && engagementMatch;
    });
  }
</script>

<div class="max-w-7xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Search Organizations</h1>
  
  <p class="text-lg text-center mb-12">
    Use the search to find and share resources and skills in your area or online. 
    For your locale, your issue interests, and how you would like to help, 
    choose one or more preferences for each drop down list to filter your search.
  </p>

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {/if}

  <!-- Filters -->
  <div class="grid md:grid-cols-3 gap-8 mb-12">
    <!-- Locations Filter -->
    <div>
      <h3 class="text-xl font-semibold mb-4">Select Locations</h3>
      <div class="space-y-2 max-h-60 overflow-y-auto">
        {#each locationOptions as location}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedLocations.includes(location)}
              on:change={() => toggleFilter(selectedLocations, location)}
              class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span>{location}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Focus Areas Filter -->
    <div>
      <h3 class="text-xl font-semibold mb-4">Select Focus Areas</h3>
      <div class="space-y-2 max-h-60 overflow-y-auto">
        {#each focusAreaOptions as area}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedFocusAreas.includes(area)}
              on:change={() => toggleFilter(selectedFocusAreas, area)}
              class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span>{area}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Engagement Types Filter -->
    <div>
      <h3 class="text-xl font-semibold mb-4">Select Engagement Types</h3>
      <div class="space-y-2 max-h-60 overflow-y-auto">
        {#each engagementTypeOptions as type}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedEngagementTypes.includes(type)}
              on:change={() => toggleFilter(selectedEngagementTypes, type)}
              class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span>{type}</span>
          </label>
        {/each}
      </div>
    </div>
  </div>

  <!-- Organizations List -->
  {#if loading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  {:else}
    <div class="grid gap-8">
      {#each filteredOrganizations as org}
        <a 
          href="/organizations/{org.id}" 
          class="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
        >
          <h2 class="text-2xl font-bold mb-2">{org.name}</h2>
          <p class="text-gray-600 mb-4">{org.category}</p>
          <p class="text-gray-700 mb-6">{org.description}</p>
          
          {#if org.focusAreas?.length > 0}
            <div class="mb-4">
              <h3 class="font-semibold mb-2">Focus Areas:</h3>
              <div class="flex flex-wrap gap-2">
                {#each org.focusAreas as area}
                  <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                    {area}
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          {#if org.locations?.length > 0}
            <div>
              <h3 class="font-semibold mb-2">Locations:</h3>
              <div class="flex flex-wrap gap-2">
                {#each org.locations as location}
                  <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                    {location}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
</div>
