<script lang="ts">
  import { ndk, ensureConnection } from '$lib/stores/ndk';
  import { createGroup } from '$lib/nostr/groups';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let name = '';
  let initialized = false;

  onMount(async () => {
    try {
      const ndkInstance = await ensureConnection();
      if (!ndkInstance?.signer) {
        error = 'Please install a Nostr extension';
        return;
      }
      initialized = true;
    } catch (err) {
      error = 'Failed to initialize Nostr connection';
    }
  });
  let about = '';
  let picture = '';
  let isPrivate = false;
  let isClosed = false;
  let error: string | null = null;
  let loading = false;

  async function handleSubmit() {
    if (!name.trim()) {
      error = 'Group name is required';
      return;
    }

    loading = true;
    error = null;

    if (!initialized) {
      error = 'Please wait for Nostr connection to initialize';
      return;
    }

    try {
      await ensureConnection();
      const identifier = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const groupEvent = await createGroup($ndk, {
        name,
        about,
        picture,
        isPrivate,
        isClosed
      }, identifier);

      // Redirect to group details page
      goto(`/groups/${identifier}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create group';
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto px-4 py-12">
  <h1 class="text-3xl font-bold mb-8">Create New Group</h1>

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="space-y-6">
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
        Group Name *
      </label>
      <input
        type="text"
        id="name"
        bind:value={name}
        required
        class="w-full rounded-md border border-gray-300 p-2"
        placeholder="Enter group name"
      />
    </div>

    <div>
      <label for="about" class="block text-sm font-medium text-gray-700 mb-1">
        About
      </label>
      <textarea
        id="about"
        bind:value={about}
        rows="3"
        class="w-full rounded-md border border-gray-300 p-2"
        placeholder="Describe your group"
      ></textarea>
    </div>

    <div>
      <label for="picture" class="block text-sm font-medium text-gray-700 mb-1">
        Picture URL
      </label>
      <input
        type="url"
        id="picture"
        bind:value={picture}
        class="w-full rounded-md border border-gray-300 p-2"
        placeholder="https://example.com/image.jpg"
      />
    </div>

    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          id="private"
          bind:checked={isPrivate}
          class="rounded border-gray-300"
        />
        <label for="private" class="text-sm text-gray-700">
          Private group (only members can see content)
        </label>
      </div>

      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          id="closed"
          bind:checked={isClosed}
          class="rounded border-gray-300"
        />
        <label for="closed" class="text-sm text-gray-700">
          Closed group (requires admin approval to join)
        </label>
      </div>
    </div>

    <button
      type="submit"
      disabled={loading}
      class="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
    >
      {loading ? 'Creating...' : 'Create Group'}
    </button>
  </form>
</div>
