<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable, get } from 'svelte/store';
  import type { NDKEvent } from '@nostr-dev-kit/ndk';
  import { ndk, ensureConnection, ndkConnected } from '$lib/stores/ndk';
  import { ORGANIZATION, ORGANIZATION_TAGS } from '$lib/nostr/kinds';
  import NDK from '@nostr-dev-kit/ndk';
  import { searchFilters } from '$lib/stores/searchStore';
  import { page } from '$app/stores';
  import Select from 'svelte-select';
  import { 
    locationOptions,
    focusAreaOptions,
    engagementTypeOptions,
    getOrgContent,
    matchesFilter,
    fetchEvents,
    setupRealtimeSubscription
  } from '$lib/organizations/utils';

  const organizations = writable<NDKEvent[]>([]);
  let loading = true;
  let error: string | null = null;
  let showRawData = false;
  let orgsList: NDKEvent[] = $organizations;

  // Subscribe to the organizations store with validation
  organizations.subscribe(value => {
    if (Array.isArray(value)) {
      // Sort organizations by creation date, newest first
      orgsList = value.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      console.log('Updated organizations list:', orgsList.length, 'items');
    } else {
      console.warn('Invalid organizations value:', value);
      orgsList = [];
    }
  });

  let subscription: NDKSubscription | undefined;

  onMount(async () => {
    try {
      loading = true;
      error = null;

      console.log('Starting organizations page mount');
      
      // Ensure NDK is connected
      const ndkInstance = await ensureConnection();
      
      console.log('NDK connection result:', {
        instance: !!ndkInstance,
        connected: ndkInstance.connected,
        poolSize: ndkInstance.pool?.relays?.size,
        relayUrls: Array.from(ndkInstance.pool?.relays?.keys() || [])
      });

      // Initialize filters from URL params
      const params = $page.url.searchParams;
      searchFilters.set({
        locations: params.getAll('locations') || [],
        focusAreas: params.getAll('focusAreas') || [],
        engagementTypes: params.getAll('engagementTypes') || []
      });

      console.log('Starting initial events load at', new Date().toISOString());
      
      // Load initial events with timeout
      try {
        const initialFetch = new Promise<NDKEvent[]>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Initial fetch timeout'));
          }, 5000); // 5 second timeout

          const sub = ndkInstance.subscribe(
            { kinds: [ORGANIZATION], limit: 100 },
            { closeOnEose: true, groupableDelay: 100 }
          );

          const events: NDKEvent[] = [];
          
          sub.on('event', (event) => {
            if (event.kind === ORGANIZATION) {
              events.push(event);
            }
          });

          sub.on('eose', () => {
            clearTimeout(timeout);
            resolve(events);
          });

          sub.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        // Wait for initial fetch or timeout
        const events = await initialFetch;
      
        console.log('Initial events loaded:', events.length, 'at', new Date().toISOString());
        organizations.set(events);
        
        // Start realtime subscription after initial load
        subscription = ndkInstance.subscribe(
          { kinds: [ORGANIZATION], since: Math.floor(Date.now() / 1000) },
          { closeOnEose: false, groupableDelay: 100 }
        );
      } catch (err) {
        console.error('Error fetching events:', err);
        throw new Error(`Failed to fetch events: ${err.message}`);
      }

      // Setup realtime subscription for new organization events
      try {
        console.log('Setting up realtime subscription at', new Date().toISOString());
        const orgEventKind = ORGANIZATION;
        subscription = ndkInstance.subscribe(
          { 
            kinds: [orgEventKind],
            since: Math.floor(Date.now() / 1000) // Only get events since now
          },
          { 
            closeOnEose: false, 
            groupableDelay: 500 
          }
        );
        
        subscription.on('event', (event: NDKEvent) => {
          // Verify it's an organization event
          if (event.kind !== orgEventKind) {
            console.warn('Received non-organization event in realtime:', event.kind, event.id);
            return;
          }
          
          console.log('Received new organization event:', event.id);
          console.debug('Event details:', {
            id: event.id,
            kind: event.kind,
            tags: event.tags,
            content: event.content
          });
          organizations.update(orgs => {
            // Check if event already exists
            const exists = orgs.some(e => e.id === event.id);
            if (!exists) {
              console.log('Adding new organization:', event.id);
              return [...orgs, event];
            }
            return orgs;
          });
        });
        if (!subscription) {
          throw new Error('Failed to setup realtime subscription');
        }
        console.log('Realtime subscription established');
      } catch (err) {
        console.error('Error setting up realtime subscription:', err);
        throw new Error(`Failed to setup realtime subscription: ${err.message}`);
      }

      loading = false;
    } catch (err) {
      console.error('Failed to load organizations:', err);
      error = `Failed to load organizations: ${err.message}`;
      loading = false;
    }
  });

  onDestroy(() => {
    if (subscription) {
      subscription.stop();
    }
  });

  // Filter organizations reactively
  $: filteredOrganizations = orgsList.filter(event => {
    const filters = $searchFilters;
    
    const locationSet = new Set(filters.locations || []);
    const focusAreaSet = new Set(filters.focusAreas || []);
    const engagementTypeSet = new Set(filters.engagementTypes || []);
    
    return (
      matchesFilter(event.tags, ORGANIZATION_TAGS.LOCATION, locationSet) &&
      matchesFilter(event.tags, 't', focusAreaSet) &&
      matchesFilter(event.tags, ORGANIZATION_TAGS.ENGAGEMENT, engagementTypeSet)
    );
  });

  // Add this function to handle form submission
  function handleSubmit() {
    // Update URL with current filters
    const params = new URLSearchParams();
    
    if ($searchFilters.locations.length) {
      $searchFilters.locations.forEach(loc => params.append('locations', loc));
    }
    if ($searchFilters.focusAreas.length) {
      $searchFilters.focusAreas.forEach(area => params.append('focusAreas', area));
    }
    if ($searchFilters.engagementTypes.length) {
      $searchFilters.engagementTypes.forEach(type => params.append('engagementTypes', type));
    }

    // Update the URL without triggering a page reload
    window.history.replaceState({}, '', `?${params.toString()}`);
  }
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
    {#if loading}
      <div class="col-span-full flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    {:else if !orgsList || orgsList.length === 0}
      <div class="col-span-full text-center py-12">
        <p class="text-gray-600">No organizations found matching your criteria.</p>
      </div>
    {:else}
      {#each filteredOrganizations as event}
        {@const org = getOrgContent(event)}
        <a 
          href="/organizations/{event.id}" 
          class="block bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow min-h-[280px] flex flex-col"
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

          <p class="text-gray-700 mb-4 line-clamp-3 text-sm">{org.description}</p>
          
          <div class="space-y-2 mt-auto overflow-auto">
            <div>
              <h3 class="text-sm font-semibold mb-1">Focus Areas:</h3>
              <div class="flex flex-wrap gap-1">
                {#each event.tags.filter(t => t[0] === ORGANIZATION_TAGS.FOCUS_AREA).slice(0, 5) as [_, area]}
                  <span class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
                    {area}
                  </span>
                {/each}
              </div>
            </div>
          
            <div>
              <h3 class="text-sm font-semibold mb-1">Locations:</h3>
              <div class="flex flex-wrap gap-1">
                {#each event.tags.filter(t => t[0] === ORGANIZATION_TAGS.LOCATION).slice(0, 5) as [_, location]}
                  <span class="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">
                    {location}
                  </span>
                {/each}
              </div>
            </div>

            <div>
              <h3 class="text-sm font-semibold mb-1">Engagement Types:</h3>
              <div class="flex flex-wrap gap-1">
                {#each event.tags.filter(t => t[0] === ORGANIZATION_TAGS.ENGAGEMENT).slice(0, 5) as [_, type]}
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

  <!-- Footer -->
  <div class="mt-8 pt-8 border-t">
    <button
      on:click={() => showRawData = !showRawData}
      class="text-purple-600 hover:text-purple-800 font-medium focus:outline-none"
    >
      {showRawData ? 'Hide' : 'Show'} Raw Database Data
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
