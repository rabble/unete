<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { ndk } from '$lib/stores/ndk';
  import { getGroupMetadata, type GroupMetadata } from '$lib/nostr/groups';

  const groupId = $page.params.id;
  let group: GroupMetadata | null = null;
  let error: string | null = null;
  let loading = true;

  onMount(async () => {
    try {
      console.log('Fetching group metadata for ID:', groupId);
      group = await getGroupMetadata($ndk, groupId);
      console.log('Fetched group metadata:', group);
      if (!group) {
        error = 'Group not found';
      }
    } catch (err) {
      console.error('Error fetching group:', err);
      error = err instanceof Error ? err.message : 'Failed to load group';
    } finally {
      loading = false;
    }
  });
</script>

<div class="max-w-4xl mx-auto px-4 py-12">
  {#if loading}
    <div class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4">
      <p class="text-red-700">{error}</p>
    </div>
  {:else if group}
    <div class="bg-white rounded-lg shadow-lg p-6">
      <div class="flex items-start gap-6">
        {#if group.picture}
          <img 
            src={group.picture} 
            alt={group.name}
            class="w-24 h-24 rounded-lg object-cover"
          />
        {/if}
        <div class="flex-1">
          <h1 class="text-3xl font-bold mb-2">{group.name}</h1>
          {#if group.about}
            <p class="text-gray-600 mb-4">{group.about}</p>
          {/if}
          <div class="flex gap-4 text-sm text-gray-500">
            <span>{group.memberCount || 0} members</span>
            <span>{group.adminCount || 0} admins</span>
            <span>{group.isPrivate ? 'Private' : 'Public'}</span>
            <span>{group.isClosed ? 'Closed' : 'Open'}</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
