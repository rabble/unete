<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ndk, ndkConnected } from '$lib/stores/ndk';
  import { searchFilters } from '$lib/stores/searchStore';
  import { page } from '$app/stores';
  import Select from 'svelte-select';
  import { 
    LOCATION_OPTIONS as locationOptions,
    FOCUS_AREAS as focusAreaOptions,
    ENGAGEMENT_TYPE_OPTIONS as engagementTypeOptions,
    getOrgContent,
    matchesFilter,
    fetchEvents,
    setupRealtimeSubscription
  } from '$lib/organizations/utils';

  let organizations: NDKEvent[] = [];
  let allOrganizations: NDKEvent[] = [];
  let loading = true;
  let error: string | null = null;
  let showRawData = false;

  onMount(async () => {
    try {
      loading = true;
      error = null;

      // Wait for NDK connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('NDK connection timeout')), 15000);
        const checkConnection = () => {
          if ($ndk && $ndkConnected) {
            clearTimeout(timeout);
            resolve();
            return;
          }
          setTimeout(checkConnection, 100);
        };
        checkConnection();
      });

      // Set initial filters from URL params
      const params = $page.url.searchParams;
      searchFilters.set({
        locations: params.getAll('locations') || [],
        focusAreas: params.getAll('focusAreas') || [],
        engagementTypes: params.getAll('engagementTypes') || []
      });

      const events = await fetchEvents($ndk);
      allOrganizations = events.sort((a, b) => {
        const orgA = getOrgContent(a);
        const orgB = getOrgContent(b);
        return orgA.name.localeCompare(orgB.name);
      });

      // Setup realtime updates
      setupRealtimeSubscription($ndk, (event) => {
        const exists = allOrganizations.some(e => e.id === event.id);
        if (!exists) {
          allOrganizations = [...allOrganizations, event].sort((a, b) => {
            const orgA = getOrgContent(a);
            const orgB = getOrgContent(b);
            return orgA.name.localeCompare(orgB.name);
          });
        }
      });

      loading = false;
    } catch (err) {
      console.error('Failed to load organizations:', err);
      error = `Failed to load organizations: ${err.message}`;
      loading = false;
    }
  });

  // Filter organizations reactively
  $: filteredOrganizations = allOrganizations.filter(event => {
    const filters = $searchFilters;
    
    const locationSet = new Set(filters.locations || []);
    const focusAreaSet = new Set(filters.focusAreas || []);
    const engagementTypeSet = new Set(filters.engagementTypes || []);
    
    return (
      matchesFilter(event.tags, 'l', locationSet, 'location') &&
      matchesFilter(event.tags, 't', focusAreaSet) &&
      matchesFilter(event.tags, 'l', engagementTypeSet, 'engagement')
    );
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
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#if loading && filteredOrganizations.length === 0}
      <div class="col-span-full flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    {:else if filteredOrganizations.length === 0}
      <div class="col-span-full text-center py-12">
        <p class="text-gray-600">No organizations found matching your criteria.</p>
      </div>
    {:else}
      {#each filteredOrganizations as event}
        {@const org = getOrgContent(event)}
        <a 
          href="/organizations/{event.id}" 
          class="block bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow h-[280px] flex flex-col"
          data-sveltekit-preload-data
        >
          <div class="flex items-start justify-between gap-4 mb-2">
            <h2 class="text-xl font-bold truncate flex-1">{org.name}</h2>
            {#if org.picture}
              <img 
                src={org.picture} 
                alt={org.name}
                class="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
            {/if}
          </div>

          <p class="text-gray-700 mb-4 line-clamp-2 text-sm">{org.description}</p>
          
          <div class="space-y-2 mt-auto">
            <div>
              <h3 class="text-sm font-semibold mb-1">Focus Areas:</h3>
              <div class="flex flex-wrap gap-1">
                {#each event.tags.filter(t => t[0] === 't').slice(0, 3) as [_, area]}
                  <span class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
                    {area}
                  </span>
                {/each}
              </div>
            </div>
          
            <div>
              <h3 class="text-sm font-semibold mb-1">Locations:</h3>
              <div class="flex flex-wrap gap-1">
                {#each event.tags.filter(t => t[0] === 'l' && t[2] === 'location').slice(0, 2) as [_, location]}
                  <span class="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">
                    {location}
                  </span>
                {/each}
              </div>
            </div>

            <div>
              <h3 class="text-sm font-semibold mb-1">Engagement Types:</h3>
              <div class="flex flex-wrap gap-1">
                {#each event.tags.filter(t => t[0] === 'l' && t[2] === 'engagement').slice(0, 2) as [_, type]}
                  <span class="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                    {type}
                  </span>
                {/each}
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

  <!-- Debug: All Organizations -->
  <div class="mt-8 border-t pt-8">
    <h3 class="text-xl font-semibold mb-4">Debug: All Loaded Organizations</h3>
    <div class="bg-gray-100 p-4 rounded-lg">
      <p class="mb-2">Total organizations loaded: {allOrganizations.length}</p>
      <p class="mb-2">Last updated: {new Date().toLocaleTimeString()}</p>
      <div class="space-y-4">
        {#each allOrganizations as event}
          {@const org = getOrgContent(event)}
          <div class="bg-white p-4 rounded shadow">
            <p class="font-bold">{org.name}</p>
            <p class="text-sm text-gray-600">ID: {event.id}</p>
            <p class="text-sm text-gray-600">Category: {org.category}</p>
            <div class="text-sm">
              <p class="font-semibold mt-2">Tags:</p>
              <pre class="bg-gray-50 p-2 rounded mt-1 text-xs overflow-x-auto">
                {JSON.stringify(event.tags, null, 2)}
              </pre>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

</div>
