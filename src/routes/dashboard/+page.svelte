<script lang="ts">
  import { onMount } from 'svelte';
  import NDK, { NDKEvent, NDKNip07Signer } from '@nostr-dev-kit/ndk';
  import { ndk } from '$lib/stores/ndk';
  import { initNostrLogin } from '$lib/nostr/login';
  import type { OrganizationContent } from '$lib/nostr/kinds';

  let userEvents: NDKEvent[] = [];
  let loading = true;
  let error: string | null = null;

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

  onMount(async () => {
    try {
      // Initialize NDK with signer
      const ndkInstance = new NDK({
        explicitRelayUrls: [
          'wss://relay.nos.social',
          'wss://relay.damus.io',
          'wss://relay.nostr.band',
        ],
        signer: new NDKNip07Signer(),
      });

      await ndkInstance.connect();
      ndk.set(ndkInstance);

      // Check if we have a signer
      if (!ndkInstance.signer) {
        throw new Error('Please login using the Nostr extension');
      }

      const user = await ndkInstance.signer.user();
      if (!user) {
        throw new Error('No user found');
      }

      // Fetch all events published by the user
      const events = await ndkInstance.fetchEvents({
        authors: [user.pubkey]
      });

      userEvents = Array.from(events).sort((a, b) => b.created_at - a.created_at);
      
    } catch (err) {
      console.error('Error loading dashboard:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  });
</script>

<div class="max-w-7xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Dashboard</h1>

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {/if}

  <!-- Relay Status -->
  {#if $ndk?.pool?.relays}
    <div class="mb-8 bg-white rounded-lg shadow-lg p-4">
      <h2 class="text-xl font-semibold mb-4">Relay Status</h2>
      <div class="space-y-2">
        {#each Object.entries($ndk.pool.relays) as [url, relay]}
          <div class="flex items-center gap-2">
            <div class={`w-2 h-2 rounded-full ${relay.status === 1 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span class="text-sm">{url}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Your Published Events -->
  <div class="bg-white rounded-lg shadow-lg p-6">
    <h2 class="text-2xl font-semibold mb-6">Your Published Events</h2>
    
    {#if loading}
      <div class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    {:else if userEvents.length === 0}
      <p class="text-gray-600 text-center py-8">You haven't published any events yet.</p>
    {:else}
      <div class="space-y-6">
        {#each userEvents as event}
          {@const org = getOrgContent(event)}
          <div class="border rounded-lg p-4 hover:bg-gray-50">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-xl font-semibold">{org.name}</h3>
                <p class="text-gray-600">Published {new Date(event.created_at * 1000).toLocaleString()}</p>
              </div>
              <a 
                href="/organizations/{event.id}/edit" 
                class="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors"
              >
                Edit
              </a>
            </div>
            <p class="text-gray-700">{org.description}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
