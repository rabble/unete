<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import TagLink from '$lib/components/TagLink.svelte';
  import { ndk, ensureConnection, getCachedEvents } from '$lib/stores/ndk';
  import type { OrganizationContent } from '$lib/nostr/kinds';
  import { ORGANIZATION } from '$lib/nostr/kinds';
  import { isAdmin } from '$lib/nostr/admin';

  let organization: OrganizationContent | null = null;
  let loading = true;
  let error: string | null = null;
  let isAdminUser = false;

  onMount(async () => {
    try {
      await ensureConnection();

      const events = await getCachedEvents({
        kinds: [ORGANIZATION],
        ids: [$page.params.id]
      });

      const event = Array.from(events)[0];
      if (!event) {
        throw new Error('Organization not found');
      }

      organization = JSON.parse(event.content);
      
      // Check if current user is admin
      if (ndk.signer) {
        const pubkey = await ndk.signer.user().then(user => user.pubkey);
        isAdminUser = await isAdmin(pubkey);
      }
    } catch (e) {
      console.error('Error loading organization:', e);
      error = e instanceof Error ? e.message : 'Failed to load organization';
    } finally {
      loading = false;
    }
  });
</script>

<div class="max-w-4xl mx-auto px-4 py-12">
  {#if isAdminUser}
    <div class="flex justify-end mb-4">
      <a
        href="/organizations/{$page.params.id}/edit"
        class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        Edit Organization
      </a>
    </div>
  {/if}
  {#if loading}
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
      <p class="mt-2 text-gray-600">Loading organization details...</p>
    </div>
  {:else if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4">
      <p class="text-red-700">{error}</p>
    </div>
  {:else if organization}
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <!-- Header Section -->
      <div class="relative h-48 bg-purple-100">
        {#if organization.picture}
          <img
            src={organization.picture}
            alt={organization.name}
            class="absolute inset-0 w-full h-full object-cover"
          />
        {/if}
      </div>
      
      <div class="p-8">
        <!-- Basic Info -->
        <div class="mb-8">
          <h1 class="text-4xl font-bold mb-2">{organization.name}</h1>
          <p class="text-purple-600 font-medium mb-4">{organization.category}</p>
          <p class="text-gray-700">{organization.description}</p>
        </div>

        <!-- Contact Info -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold mb-4">Contact Information</h2>
          <div class="space-y-2">
            {#if organization.website}
              <p>
                <span class="font-medium">Website:</span>
                <a href={organization.website} class="text-purple-600 hover:text-purple-800 ml-2" target="_blank" rel="noopener noreferrer">
                  {organization.website}
                </a>
              </p>
            {/if}
            {#if organization.email}
              <p>
                <span class="font-medium">Email:</span>
                <a href="mailto:{organization.email}" class="text-purple-600 hover:text-purple-800 ml-2">
                  {organization.email}
                </a>
              </p>
            {/if}
          </div>
        </div>

        <!-- Focus Areas -->
        {#if organization.focusAreas?.length}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">Focus Areas</h2>
            <div class="flex flex-wrap">
              {#each organization.focusAreas as area}
                <TagLink type="topic" value={area} />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Locations -->
        {#if organization.locations?.length}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">Locations</h2>
            <div class="flex flex-wrap">
              {#each organization.locations as location}
                <TagLink type="location" value={location} />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Engagement Types -->
        {#if organization.engagementTypes?.length}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">Ways to Engage</h2>
            <div class="flex flex-wrap">
              {#each organization.engagementTypes as type}
                <TagLink type="engagement" value={type} />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Additional Information -->
        {#if organization.about || organization.mission || organization.vision}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">Additional Information</h2>
            
            {#if organization.about}
              <div class="mb-4">
                <h3 class="text-xl font-semibold mb-2">About</h3>
                <p class="text-gray-700">{organization.about}</p>
              </div>
            {/if}

            {#if organization.mission}
              <div class="mb-4">
                <h3 class="text-xl font-semibold mb-2">Mission</h3>
                <p class="text-gray-700">{organization.mission}</p>
              </div>
            {/if}

            {#if organization.vision}
              <div class="mb-4">
                <h3 class="text-xl font-semibold mb-2">Vision</h3>
                <p class="text-gray-700">{organization.vision}</p>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Social Links -->
        {#if organization.socialLinks && Object.values(organization.socialLinks).some(link => link)}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">Social Media</h2>
            <div class="flex flex-wrap gap-4">
              {#if organization.socialLinks.twitter}
                <a
                  href={organization.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-gray-600 hover:text-purple-600"
                >
                  Twitter
                </a>
              {/if}
              {#if organization.socialLinks.github}
                <a
                  href={organization.socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-gray-600 hover:text-purple-600"
                >
                  GitHub
                </a>
              {/if}
              {#if organization.socialLinks.linkedin}
                <a
                  href={organization.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-gray-600 hover:text-purple-600"
                >
                  LinkedIn
                </a>
              {/if}
              {#if organization.socialLinks.facebook}
                <a
                  href={organization.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-gray-600 hover:text-purple-600"
                >
                  Facebook
                </a>
              {/if}
              {#if organization.socialLinks.instagram}
                <a
                  href={organization.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-gray-600 hover:text-purple-600"
                >
                  Instagram
                </a>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <p class="text-yellow-700">Organization not found</p>
    </div>
  {/if}
</div>
