<script lang="ts">
  import { onMount } from 'svelte';
  import { ndk } from '$lib/stores/ndk';
  import { userProfile } from '$lib/stores/userProfile';
  import { createCommunity } from '$lib/nostr/community';
  import { goto } from '$app/navigation';

  let loading = false;
  let error: string | null = null;
  let success = false;

  // Form fields
  let name = '';
  let description = '';
  let identifier = '';
  let imageUrl = '';
  let imageWidth = '';
  let imageHeight = '';
  let moderators: string[] = [''];
  let relays = [
    { url: '', type: 'author' },
    { url: '', type: 'requests' },
    { url: '', type: 'approvals' }
  ];

  // Only show for initial admin
  let isAdmin = false;

  onMount(async () => {
    if (!$userProfile) {
      error = 'Please login first';
      return;
    }

    // Check if user is initial admin
    isAdmin = $userProfile.pubkey === 'npub1wmr34t36fy03m8hvgl96zl3znndyzyaqhwmwdtshwmtkg03fetaqhjg240';
    if (!isAdmin) {
      error = 'Only administrators can create communities';
    }
  });

  function addModerator() {
    moderators = [...moderators, ''];
  }

  function removeModerator(index: number) {
    moderators = moderators.filter((_, i) => i !== index);
  }

  async function handleSubmit() {
    try {
      loading = true;
      error = null;

      if (!$ndk) throw new Error('NDK not initialized');
      if (!$userProfile) throw new Error('Please login first');
      if (!isAdmin) throw new Error('Only administrators can create communities');

      // Validate required fields
      if (!name || !description || !identifier) {
        throw new Error('Name, description and identifier are required');
      }

      // Filter out empty moderators
      const validModerators = moderators.filter(m => m.trim() !== '');
      
      // Create community content
      const content = {
        name,
        description,
        image: imageUrl,
        lastUpdated: Math.floor(Date.now() / 1000)
      };

      // Create community
      const event = await createCommunity($ndk, content, validModerators);
      
      success = true;
      setTimeout(() => {
        goto('/dashboard/community');
      }, 2000);

    } catch (err) {
      console.error('Failed to create community:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-4xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold mb-8">Create New Community</h1>

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {/if}

  {#if success}
    <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
      <p class="text-green-700">Community created successfully! Redirecting...</p>
    </div>
  {/if}

  {#if isAdmin}
    <form on:submit|preventDefault={handleSubmit} class="space-y-6 bg-white rounded-lg shadow-lg p-6">
      <!-- Basic Information -->
      <div class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Community Name</label>
          <input
            type="text"
            id="name"
            bind:value={name}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            required
          />
        </div>

        <div>
          <label for="identifier" class="block text-sm font-medium text-gray-700">Identifier</label>
          <input
            type="text"
            id="identifier"
            bind:value={identifier}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            required
          />
          <p class="mt-1 text-sm text-gray-500">Unique identifier for the community (d tag)</p>
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="description"
            bind:value={description}
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            required
          ></textarea>
        </div>
      </div>

      <!-- Image Information -->
      <div class="space-y-4">
        <div>
          <label for="imageUrl" class="block text-sm font-medium text-gray-700">Image URL</label>
          <input
            type="url"
            id="imageUrl"
            bind:value={imageUrl}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="imageWidth" class="block text-sm font-medium text-gray-700">Image Width</label>
            <input
              type="number"
              id="imageWidth"
              bind:value={imageWidth}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div>
            <label for="imageHeight" class="block text-sm font-medium text-gray-700">Image Height</label>
            <input
              type="number"
              id="imageHeight"
              bind:value={imageHeight}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      <!-- Moderators -->
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">Moderators</h3>
          <button
            type="button"
            on:click={addModerator}
            class="text-purple-600 hover:text-purple-700"
          >
            + Add Moderator
          </button>
        </div>
        
        {#each moderators as moderator, i}
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={moderators[i]}
              placeholder="Moderator pubkey"
              class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            {#if i > 0}
              <button
                type="button"
                on:click={() => removeModerator(i)}
                class="text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Community'}
        </button>
      </div>
    </form>
  {/if}
</div>
