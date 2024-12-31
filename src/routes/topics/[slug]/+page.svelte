<script lang="ts">
  import { navigating } from '$app/stores';
  import TagLink from '$lib/components/TagLink.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { writable, get } from 'svelte/store';
  import type { NDKEvent } from '@nostr-dev-kit/ndk';
  import { ndk, ensureConnection, ndkConnected } from '$lib/stores/ndk';
  import { ORGANIZATION, ORGANIZATION_TAGS } from '$lib/nostr/kinds';
  import { searchFilters } from '$lib/stores/searchStore';
  import { page } from '$app/stores';

  export let data;
  
  const organizations = writable<NDKEvent[]>([]);
  let loadingNostr = true;
  let error: string | null = null;
  let allTopics = data.allTopics;
  let subscription: NDKSubscription | undefined;

  // Create NDK filter for topic using full tag name
  function createTopicFilter(topicSlug: string) {
    // Find the full topic title from the topics array
    const topic = data.allTopics.find(t => t.slug === topicSlug || t.urlSlug === topicSlug);
    const tag = topic?.title || topicSlug;
    
    return {
      kinds: [ORGANIZATION],
      '#f': [tag],
      limit: 100
    };
  }

  // Load data once when component mounts
  onMount(async () => {
    try {
      console.log('Starting topic page mount');
      loadingNostr = true;
      error = null;

      // Ensure NDK is connected
      const ndkInstance = await ensureConnection();
      
      console.log('NDK connection result:', {
        instance: !!ndkInstance,
        connected: ndkInstance.connected,
        poolSize: ndkInstance.pool?.relays?.size,
        relayUrls: Array.from(ndkInstance.pool?.relays?.keys() || [])
      });

      // Load initial events with timeout
      try {
        const initialFetch = new Promise<NDKEvent[]>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Initial fetch timeout'));
          }, 5000); // 5 second timeout

          const sub = ndkInstance.subscribe(
            createTopicFilter(data.topic.slug),
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
        organizations.set(events);
        
        // Start realtime subscription after initial load
        subscription = ndkInstance.subscribe(
          { 
            kinds: [ORGANIZATION], 
            '#f': [data.topic.slug],
            since: Math.floor(Date.now() / 1000)
          },
          { closeOnEose: false, groupableDelay: 100 }
        );
      } catch (err) {
        console.error('Error fetching events:', err);
        throw new Error(`Failed to fetch events: ${err.message}`);
      }

      // Setup realtime subscription for new organization events
      try {
        console.log('Setting up realtime subscription');
        subscription = ndkInstance.subscribe(
          { 
            kinds: [ORGANIZATION],
            '#f': [data.topic.title],
            since: Math.floor(Date.now() / 1000)
          },
          { 
            closeOnEose: false, 
            groupableDelay: 500 
          }
        );
        
        subscription.on('event', (event: NDKEvent) => {
          if (event.kind !== ORGANIZATION) {
            console.warn('Received non-organization event in realtime:', event.kind, event.id);
            return;
          }
          
          console.log('Received new organization event:', event.id);
          organizations.update(orgs => {
            const exists = orgs.some(e => e.id === event.id);
            if (!exists) {
              console.log('Adding new organization:', event.id);
              return [...orgs, event];
            }
            return orgs;
          });
        });
      } catch (err) {
        console.error('Error setting up realtime subscription:', err);
        throw new Error(`Failed to setup realtime subscription: ${err.message}`);
      }

      loadingNostr = false;
    } catch (err) {
      console.error('Failed to load organizations:', err);
      error = `Failed to load organizations: ${err.message}`;
      loadingNostr = false;
    }
  });

  onDestroy(() => {
    if (subscription) {
      subscription.stop();
    }
  });
  
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

  $: engagementTypes = [...new Set(
    orgsList?.flatMap(event => 
      event.tags?.filter(t => t[0] === 'l' && t[2] === 'engagement').map(t => t[1]) || []
    ) || []
  )];

  $: engagementCounts = engagementTypes.reduce<Record<string, number>>((acc, type) => {
    acc[type] = orgsList?.filter(event => 
      event.tags?.some(t => t[0] === 'l' && t[2] === 'engagement' && t[1] === type)
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
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each orgsList as event}
              {@const org = JSON.parse(event.content)}
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
                  {#if event.tags.filter(t => t[0] === ORGANIZATION_TAGS.FOCUS_AREA).length > 0}
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
                  {/if}
                
                  {#if event.tags.filter(t => t[0] === ORGANIZATION_TAGS.LOCATION).length > 0}
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
                  {/if}

                  {#if event.tags.filter(t => t[0] === ORGANIZATION_TAGS.ENGAGEMENT).length > 0}
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
                  {/if}
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </section>
    </div>
  </div>
</div>
