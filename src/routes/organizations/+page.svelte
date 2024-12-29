<script lang="ts">
  import { onMount } from 'svelte';
  import { ORGANIZATION, type OrganizationContent, ORGANIZATION_TAGS } from '$lib/nostr/kinds';
  import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
  import { searchFilters } from '$lib/stores/searchStore';
  import { ndk } from '$lib/stores/ndk';
  import SearchField from '$lib/components/SearchField.svelte';
  import Select from 'svelte-select';
  import { page } from '$app/stores';
  import { getTopics } from '$lib/topics';
  import { Avatar, RelayList } from '@nostr-dev-kit/ndk-svelte-components';

  // Store for organizations
  let organizations: NDKEvent[] = [];
  let loading = true;
  let error: string | null = null;
  let showRawData = false;

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
  ].sort();

  // Store all fetched organizations
  let allOrganizations: NDKEvent[] = [];

  onMount(async () => {
    try {
      // Wait for NDK to be initialized and connected
      const startTime = Date.now();
      const timeout = 15000; // 15 seconds total timeout
      
      while (!$ndk || !$ndkConnected) {
        if (Date.now() - startTime > timeout) {
          throw new Error('Timeout waiting for NDK initialization');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('Using connected NDK instance:', $ndk);

      // Set initial filters from URL params
      const params = $page.url.searchParams;
      searchFilters.set({
        locations: params.getAll('locations') || [],
        focusAreas: params.getAll('focusAreas') || [],
        engagementTypes: params.getAll('engagementTypes') || []
      });

      // Fetch organizations directly
      console.log('Fetching organizations with NDK instance:', $ndk);
      console.log('Connected relays:', Array.from($ndk.pool.relays.keys()));
      
      const filter = {
        kinds: [ORGANIZATION]
      };
      console.log('Using filter:', filter);

      try {
        console.log('Starting fetchEvents...');
        console.log('NDK instance state:', {
          hasPool: Boolean($ndk.pool),
          connectedRelays: Array.from($ndk.pool.relays.keys()),
          hasSigner: Boolean($ndk.signer)
        });
        
        // Log relay status before fetching
        const connectedRelays = Array.from($ndk.pool.relays.values())
          .filter(relay => relay.status === 1);
        console.log('Connected relays before fetch:', 
          connectedRelays.map(r => ({url: r.url, status: r.status})));

        if (connectedRelays.length === 0) {
          throw new Error('No relays connected before fetch');
        }

        // Create a promise that will reject after 5 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Fetch timeout after 5s')), 5000);
        });

        // Create the fetch promise with explicit subscription options
        const fetchPromise = new Promise((resolve, reject) => {
          const events = new Set();
          const sub = $ndk.subscribe(filter, {
            closeOnEose: true,
            groupableDelay: 100
          });

          sub.on('event', (event) => {
            console.log('Received event:', event.id);
            events.add(event);
          });

          sub.on('eose', () => {
            console.log(`EOSE received, got ${events.size} events`);
            resolve(events);
          });

          // Add error handling
          sub.on('error', (error) => {
            console.error('Subscription error:', error);
            reject(error);
          });
        });

        console.log('Fetch promise created, waiting for results...');
        const events = await Promise.race([fetchPromise, timeoutPromise]);
        
        // Log the result immediately
        console.log('Race completed:', {
          hasEvents: Boolean(events),
          eventCount: events?.size
        });
        
        if (!events) {
          throw new Error('No events returned from fetchEvents');
        }
        
        console.log('Fetch complete, received events:', events);
        console.log('Number of events:', events.size);
        
        // Log first few events for debugging
        const firstFew = Array.from(events).slice(0, 3);
        console.log('Sample events:', firstFew.map(e => {
          try {
            return {
              id: e.id,
              kind: e.kind,
              tags: e.tags,
              created_at: e.created_at,
              content: JSON.parse(e.content)
            };
          } catch (err) {
            console.error('Failed to parse event content:', err, e);
            return {
              id: e.id,
              kind: e.kind,
              tags: e.tags,
              created_at: e.created_at,
              content: 'Failed to parse'
            };
          }
        }));
        
        // Convert Set to Array and sort
        allOrganizations = Array.from(events).sort((a, b) => {
          const orgA = getOrgContent(a);
          const orgB = getOrgContent(b);
          return orgA.name.localeCompare(orgB.name);
        });
        
        console.log('Processed organizations:', allOrganizations.length);
        
        // Set up subscription for real-time updates
        console.log('Setting up real-time subscription...');
        const subscription = $ndk.subscribe(filter, {
          closeOnEose: false,
          groupableDelay: 1000
        });

        subscription.on('event', (event) => {
          console.log('Received real-time event:', {
            id: event.id,
            kind: event.kind,
            pubkey: event.pubkey
          });
          const exists = allOrganizations.some(e => e.id === event.id);
          if (!exists) {
            allOrganizations = [...allOrganizations, event].sort((a, b) => {
              const orgA = getOrgContent(a);
              const orgB = getOrgContent(b);
              return orgA.name.localeCompare(orgB.name);
            });
          }
        });
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
          ndk: $ndk ? 'initialized' : 'null',
          ndkPool: $ndk?.pool ? 'initialized' : 'null',
          relayCount: $ndk?.pool?.relays?.size || 0
        });
        error = `Failed to fetch organizations: ${err.message}`;
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
      error = `Failed to load organizations: ${error.message}`;
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

  // Filter organizations in memory based on selected criteria
  $: filteredOrganizations = allOrganizations.filter(event => {
    const org = getOrgContent(event);
    const filters = $searchFilters;
    
    // Filter by locations (using 'l' tags with 'location' mark)
    const locationMatch = !filters.locations?.length || 
      event.tags
        .filter(t => t[0] === 'l' && t[2] === 'location')
        .some(t => filters.locations.includes(t[1]));
    
    // Filter by focus areas (using 't' tags)
    const focusMatch = !filters.focusAreas?.length ||
      event.tags
        .filter(t => t[0] === 't')
        .some(t => filters.focusAreas.includes(t[1]));
    
    // Filter by engagement types (using 'l' tags with 'engagement' mark)
    const engagementMatch = !filters.engagementTypes?.length ||
      event.tags
        .filter(t => t[0] === 'l' && t[2] === 'engagement')
        .some(t => filters.engagementTypes.includes(t[1]));
    
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
      <h3 class="text-xl font-semibold mb-4 select-none">Location</h3>
      <Select
        items={locationOptions.map(loc => ({ value: loc, label: loc }))}
        multiple
        bind:value={$searchFilters.locations}
        placeholder="Select locations..."
        class="!bg-white !outline-none !cursor-default"
        clearable={true}
      >
        <div slot="item" let:item>
          {item.label}
        </div>
      </Select>
    </div>

    <!-- Focus Areas Filter -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h3 class="text-xl font-semibold mb-4 select-none">Focus Area</h3>
      <Select
        items={focusAreaOptions.map(area => ({ value: area, label: area }))}
        multiple
        bind:value={$searchFilters.focusAreas}
        placeholder="Select focus areas..."
        class="!bg-white !outline-none !cursor-default"
        clearable={true}
      >
        <div slot="item" let:item>
          {item.label}
        </div>
      </Select>
    </div>

    <!-- Engagement Types Filter -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h3 class="text-xl font-semibold mb-4 select-none">Engagement Types</h3>
      <Select
        items={engagementTypeOptions.map(type => ({ value: type, label: type }))}
        multiple
        bind:value={$searchFilters.engagementTypes}
        placeholder="Select engagement types..."
        class="!bg-white !outline-none !cursor-default"
        clearable={true}
      >
        <div slot="item" let:item>
          {item.label}
        </div>
      </Select>
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
                    {#each event.tags.filter(t => t[0] === 't') as [_, area]}
                      <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                        {area}
                      </span>
                    {/each}
                  </div>
                </div>
              
                <div>
                  <h3 class="font-semibold mb-2">Locations:</h3>
                  <div class="flex flex-wrap gap-2">
                    {#each event.tags.filter(t => t[0] === 'l' && t[2] === 'location') as [_, location]}
                      <span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                        {location}
                      </span>
                    {/each}
                  </div>
                </div>

                <div>
                  <h3 class="font-semibold mb-2">Engagement Types:</h3>
                  <div class="flex flex-wrap gap-2">
                    {#each event.tags.filter(t => t[0] === 'l' && t[2] === 'engagement') as [_, type]}
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

  <!-- Raw Data Display -->
  <div class="mt-8 flex flex-col items-center border-t pt-8">
    <h3 class="text-xl font-semibold mb-4">Developer Tools</h3>
    <button
      on:click={() => showRawData = !showRawData}
      class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg text-lg"
    >
      {showRawData ? 'Hide' : 'Show'} Raw Nostr Data
    </button>
    
    {#if showRawData}
      <div class="mt-4 w-full max-w-4xl bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto">
        <pre>{JSON.stringify(filteredOrganizations.map(event => ({
          id: event.id,
          pubkey: event.pubkey,
          kind: event.kind,
          tags: event.tags,
          content: JSON.parse(event.content),
          created_at: event.created_at
        })), null, 2)}</pre>
      </div>
    {/if}
  </div>
</div>
