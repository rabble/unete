<script lang="ts">
  import { page } from '$app/stores';
  import TagLink from '$lib/components/TagLink.svelte';
  import { ndk } from '$lib/stores/ndk';
  import type { OrganizationContent } from '$lib/nostr/kinds';
  import { isAdmin } from '$lib/nostr/admin';
  import { goto } from '$app/navigation';

  export let data;
  
  let organization: OrganizationContent | null = null;
  let loading = true;
  let error: string | null = null;
  let showJson = false;
  let rawEvent: any = null;
  let showRawData = false;
  let isOwner = false;

  async function deleteOrganization() {
    const reason = prompt('Please provide a reason for deletion (optional):');
    if (!confirm('Are you sure you want to delete this organization?')) {
      return;
    }

    try {
      const deleteEvent = {
        kind: 5,
        tags: [
          ['e', $page.params.id],
          ['a', `30017:${organization.pubkey}:${organization.id}`]
        ],
        content: reason || 'Organization deleted by owner'
      };

      const signedEvent = await $ndk.publish(deleteEvent);
      if (signedEvent) {
        alert('Organization deleted successfully');
        goto('/organizations');
      }
    } catch (err) {
      console.error('Failed to delete organization:', err);
      alert('Failed to delete organization: ' + err.message);
    }
  }

  // Check ownership when NDK and organization are available
  $: if ($ndk?.signer && organization) {
    console.log('Checking ownership - NDK signer and organization available');
    $ndk.signer.user()
      .then(user => {
        console.log('Current user pubkey:', user.pubkey);
        console.log('Organization pubkey:', organization.pubkey);
        isOwner = user.pubkey === organization.pubkey;
        console.log('Is owner?', isOwner);
      })
      .catch(error => {
        console.error('Failed to check ownership:', error);
        isOwner = false;
      });
  } else {
    console.log('Cannot check ownership - missing requirements:', {
      hasSigner: Boolean($ndk?.signer),
      hasOrganization: Boolean(organization)
    });
    isOwner = false;
  }

  // Handle the promise when data changes
  $: {
    loading = true;
    data.promise
      .then(result => {
        organization = result;
        rawEvent = data.event;
        loading = false;
      })
      .catch(e => {
        error = e instanceof Error ? e.message : 'Failed to load organization';
        loading = false;
      });
  }

</script>

<div class="max-w-4xl mx-auto px-4 py-12">
  {#if organization && isOwner}
    <div class="flex justify-end mb-4 space-x-4">
      <button
        on:click={() => showJson = !showJson}
        class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        {showJson ? 'Hide JSON' : 'Show JSON'}
      </button>
      <a
        href="/organizations/{$page.params.id}/edit"
        class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        Edit Organization
      </a>
      {#if isOwner}
        <button
          on:click={deleteOrganization}
          class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Delete Organization
        </button>
      {/if}
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
    {#if showJson}
      <div class="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div class="p-8">
          <h2 class="text-2xl font-bold mb-4">Raw Event Data</h2>
          <pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(data.event, null, 2)}
          </pre>
        </div>
      </div>
    {/if}

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

        <!-- Focus Areas (using t tag for topics) -->
        {#if organization.focusAreas?.length}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">Focus Areas</h2>
            <div class="flex flex-wrap">
              {#each organization.focusAreas as area}
                <TagLink type="t" value={area} />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Locations (using l tag for locations) -->
        {#if organization.locations?.length}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">Locations</h2>
            <div class="flex flex-wrap">
              {#each organization.locations as location}
                <TagLink type="l" value={location} />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Engagement Types (using t tag with engagement- prefix) -->
        {#if organization.engagementTypes?.length}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">Ways to Engage</h2>
            <div class="flex flex-wrap">
              {#each organization.engagementTypes as type}
                <TagLink type="t" value={`engagement-${type}`} />
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
            <pre>{JSON.stringify({
              id: data.promise.id,
              pubkey: data.promise.pubkey,
              kind: data.promise.kind,
              tags: data.promise.tags,
              content: organization,
              created_at: data.promise.created_at
            }, null, 2)}</pre>
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
