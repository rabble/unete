<script lang="ts">
  import { onMount } from 'svelte';
  import { ndk } from '$lib/stores/ndk';
  import { userProfile } from '$lib/stores/userProfile';
  import { COMMUNITY, ORGANIZATION } from '$lib/nostr/kinds';
  import { fetchCommunityOrganizations, isCommunityModerator, approveOrganization } from '$lib/nostr/community';
  import type { NDKEvent } from '@nostr-dev-kit/ndk';

  let loading = true;
  let error: string | null = null;
  let communities: NDKEvent[] = [];
  let selectedCommunity: NDKEvent | null = null;
  let pendingOrganizations: NDKEvent[] = [];
  let approvedOrganizations: NDKEvent[] = [];
  let isModerator = false;

  async function loadCommunities() {
    try {
      if (!$ndk) throw new Error('NDK not initialized');

      const events = await $ndk.fetchEvents({
        kinds: [COMMUNITY],
        '#d': ['allofus.directory']
      });
      communities = Array.from(events);
    } catch (err) {
      console.error('Failed to load communities:', err);
      error = err.message;
    }
  }

  async function selectCommunity(community: NDKEvent) {
    try {
      selectedCommunity = community;
      loading = true;
      error = null;

      if (!$userProfile) throw new Error('User not logged in');
      
      // Check if user is moderator
      isModerator = await isCommunityModerator($ndk, community, $userProfile.pubkey);

      // Load all organizations
      const allOrgs = await fetchCommunityOrganizations($ndk, community, false);
      
      // Split into pending and approved
      pendingOrganizations = allOrgs.filter(org => 
        !approvedOrganizations.some(approved => approved.id === org.id)
      );
      approvedOrganizations = await fetchCommunityOrganizations($ndk, community, true);
      
    } catch (err) {
      console.error('Failed to load community data:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function handleApprove(org: NDKEvent) {
    try {
      if (!selectedCommunity) throw new Error('No community selected');
      
      await approveOrganization($ndk, selectedCommunity, org);
      
      // Refresh organizations
      await selectCommunity(selectedCommunity);
    } catch (err) {
      console.error('Failed to approve organization:', err);
      error = err.message;
    }
  }

  onMount(loadCommunities);
</script>

<div class="max-w-7xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold mb-8">Community Administration</h1>

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {/if}

  <!-- Community Selection -->
  <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
    <h2 class="text-2xl font-semibold mb-4">Select Community</h2>
    {#if communities.length === 0}
      <p class="text-gray-600">No communities found</p>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each communities as community}
          {@const content = JSON.parse(community.content)}
          <button
            class="p-4 border rounded-lg hover:bg-purple-50 text-left transition-colors
                   ${selectedCommunity?.id === community.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}"
            on:click={() => selectCommunity(community)}
          >
            <h3 class="font-semibold text-lg">{content.name}</h3>
            <p class="text-sm text-gray-600">{content.description}</p>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Community Management -->
  {#if selectedCommunity && isModerator}
    <div class="bg-white rounded-lg shadow-lg p-6">
      {@const content = JSON.parse(selectedCommunity.content)}
      <h2 class="text-2xl font-semibold mb-6">{content.name} Management</h2>

      {#if loading}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      {:else}
        <!-- Pending Organizations -->
        <div class="mb-8">
          <h3 class="text-xl font-semibold mb-4">Pending Organizations</h3>
          {#if pendingOrganizations.length === 0}
            <p class="text-gray-600">No pending organizations</p>
          {:else}
            <div class="space-y-4">
              {#each pendingOrganizations as org}
                {@const orgContent = JSON.parse(org.content)}
                <div class="border rounded-lg p-4">
                  <div class="flex justify-between items-start">
                    <div>
                      <h4 class="font-semibold">{orgContent.name}</h4>
                      <p class="text-sm text-gray-600">{orgContent.description}</p>
                    </div>
                    <button
                      class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      on:click={() => handleApprove(org)}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Approved Organizations -->
        <div>
          <h3 class="text-xl font-semibold mb-4">Approved Organizations</h3>
          {#if approvedOrganizations.length === 0}
            <p class="text-gray-600">No approved organizations</p>
          {:else}
            <div class="space-y-4">
              {#each approvedOrganizations as org}
                {@const orgContent = JSON.parse(org.content)}
                <div class="border rounded-lg p-4">
                  <h4 class="font-semibold">{orgContent.name}</h4>
                  <p class="text-sm text-gray-600">{orgContent.description}</p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    {#each orgContent.focusAreas || [] as area}
                      <span class="bg-purple-100 text-purple-700 text-sm px-2 py-1 rounded">
                        {area}
                      </span>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
