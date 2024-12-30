<script lang="ts">
  import { page } from '$app/stores';
  import TagLink from '$lib/components/TagLink.svelte';
  import { ndk } from '$lib/stores/ndk';
  import type { OrganizationContent } from '$lib/nostr/kinds';
  import { isAdmin } from '$lib/nostr/admin';
  import { goto } from '$app/navigation';
  import { SignerRequiredError, PublishError } from '$lib/nostr/errors';
  import { deleteOrganization } from '$lib/nostr/organizations';

  export let data;
  
  let organization: OrganizationContent | null = null;
  let event: NDKEvent | null = null;
  let loading = false;
  let error: string | null = null;
  let showJson = false;
  let rawEvent: any = null;
  let showRawData = false;
  let isOwner = false;

  // Load data once on mount
  const loadData = async () => {
    if (!data.promise) return;
    
    loading = true;
    try {
      const result = await data.promise;
        organization = result.organization;
        event = result.event;
        rawEvent = result.event;
        
        // Check ownership after event is loaded
        if ($ndk?.signer) {
          console.log('Checking ownership - NDK signer and event available');
          try {
            const user = await $ndk.signer.user();
            if (user?.npub) {
              console.log('User found:', user.npub);
              console.log('Event pubkey:', event.pubkey);
              isOwner = user.pubkey === event.pubkey;
              console.log('Is owner?', isOwner);
            } else {
              console.log('No user found from signer');
              isOwner = false;
            }
          } catch (error) {
            console.error('Failed to get user from signer:', error);
            isOwner = false;
          }
        } else {
          console.log('Cannot check ownership - no signer available');
          isOwner = false;
        }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load organization';
    } finally {
      loading = false;
    }
  };

  // Run once on mount
  $: if (data.promise) {
    loadData();
  }

</script>

<div class="container mx-auto px-4 py-12">
  <div class="flex flex-col lg:flex-row gap-8">
    <!-- Main Content -->
    <div class="lg:w-2/3">
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
      <button
        on:click={async () => {
          if (confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
            error = null;
            loading = true;
            try {
              if (!$ndk?.signer) {
                throw new SignerRequiredError();
              }
              if (!event) {
                throw new Error('Original event not found');
              }
              const reason = prompt('Please provide a reason for deletion (optional):');
              console.log('Starting deletion process with:', {
                ndkState: $ndk?.connected,
                signerExists: !!$ndk?.signer,
                eventId: event?.id,
                reason: reason
              });
              const deletionEvent = await deleteOrganization($ndk, event, reason);
              console.log('Organization deleted successfully:', deletionEvent.id);
              // Redirect to dashboard with success message
              const searchParams = new URLSearchParams();
              searchParams.set('notice', 'Organization successfully deleted');
              window.location.href = `/dashboard?${searchParams.toString()}`;
            } catch (e) {
              if (e instanceof SignerRequiredError) {
                error = 'Please login with a Nostr extension first';
              } else if (e instanceof PublishError) {
                error = 'Failed to delete organization. Please try again.';
              } else {
                error = 'An unexpected error occurred';
                console.error(e);
              }
              loading = false;
            }
          }
        }}
        class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        Delete Organization
      </button>
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
            {JSON.stringify(event, null, 2)}
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
          <h1 class="text-4xl font-bold mb-2">{organization.name || 'Unnamed Organization'}</h1>
          <div class="inline-block bg-purple-100 text-purple-800 px-4 py-2 rounded-full mb-4">
            {organization.category || 'Uncategorized'}
          </div>
          {#if organization.description}
            <p class="text-gray-700 text-lg leading-relaxed">{organization.description}</p>
          {/if}
        </div>

        <!-- Contact Info -->
        {#if organization.website || organization.email}
          <div class="mb-8 bg-gray-50 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">Contact Information</h2>
            <div class="grid gap-4">
              {#if organization.website}
                <div class="flex items-center">
                  <span class="font-medium min-w-[100px]">Website:</span>
                  <a 
                    href={organization.website} 
                    class="text-purple-600 hover:text-purple-800 hover:underline flex items-center"
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <span>{organization.website}</span>
                    <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              {/if}
              {#if organization.email}
                <div class="flex items-center">
                  <span class="font-medium min-w-[100px]">Email:</span>
                  <a 
                    href="mailto:{organization.email}" 
                    class="text-purple-600 hover:text-purple-800 hover:underline flex items-center"
                  >
                    <span>{organization.email}</span>
                    <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </a>
                </div>
              {/if}
            </div>
          </div>
        {/if}


        <!-- Additional Information -->
        {#if organization.about || organization.mission || organization.vision || organization.founded || organization.size || organization.languages?.length}
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

            {#if organization.founded}
              <div class="mb-4">
                <h3 class="text-xl font-semibold mb-2">Founded</h3>
                <p class="text-gray-700">{organization.founded}</p>
              </div>
            {/if}

            {#if organization.size}
              <div class="mb-4">
                <h3 class="text-xl font-semibold mb-2">Organization Size</h3>
                <p class="text-gray-700">{organization.size}</p>
              </div>
            {/if}

            {#if organization.languages?.length}
              <div class="mb-4">
                <h3 class="text-xl font-semibold mb-2">Languages</h3>
                <div class="flex flex-wrap gap-2">
                  {#each organization.languages as language}
                    <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                      {language}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}

            {#if organization.communityId}
              <div class="mb-4">
                <h3 class="text-xl font-semibold mb-2">Community ID</h3>
                <p class="text-gray-700">{organization.communityId}</p>
              </div>
            {/if}

            {#if organization.supporter}
              <div class="mb-4">
                <h3 class="text-xl font-semibold mb-2">Supporters</h3>
                <p class="text-gray-700">
                  Range: {organization.supporter.range[0]} - {organization.supporter.range[1]}
                  {#if organization.supporter.description}
                    <br>
                    {organization.supporter.description}
                  {/if}
                </p>
              </div>
            {/if}

            {#if organization.staff}
              <div class="mb-4">
                <h3 class="text-xl font-semibold mb-2">Staff</h3>
                <p class="text-gray-700">
                  Range: {organization.staff.range[0]} - {organization.staff.range[1]}
                  {#if organization.staff.description}
                    <br>
                    {organization.staff.description}
                  {/if}
                </p>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Social Links -->
        {#if organization.socialLinks && Object.values(organization.socialLinks).some(link => link)}
          <div class="mb-8 bg-gray-50 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">Connect With {organization.name}</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              {#if organization.socialLinks.twitter}
                <a
                  href={organization.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg class="w-6 h-6 text-[#1DA1F2] mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  <span class="text-gray-700 font-medium">Twitter</span>
                </a>
              {/if}
              {#if organization.socialLinks.github}
                <a
                  href={organization.socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg class="w-6 h-6 text-[#333] mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                  <span class="text-gray-700 font-medium">GitHub</span>
                </a>
              {/if}
              {#if organization.socialLinks.linkedin}
                <a
                  href={organization.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg class="w-6 h-6 text-[#0A66C2] mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span class="text-gray-700 font-medium">LinkedIn</span>
                </a>
              {/if}
              {#if organization.socialLinks.facebook}
                <a
                  href={organization.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg class="w-6 h-6 text-[#1877F2] mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span class="text-gray-700 font-medium">Facebook</span>
                </a>
              {/if}
              {#if organization.socialLinks.instagram}
                <a
                  href={organization.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg class="w-6 h-6 text-[#E4405F] mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                  <span class="text-gray-700 font-medium">Instagram</span>
                </a>
              {/if}
              {#if organization.socialLinks.nostr}
                <a
                  href={organization.socialLinks.nostr}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg class="w-6 h-6 text-purple-600 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
                  <span class="text-gray-700 font-medium">Nostr</span>
                </a>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
    <!-- Sidebar -->
    <div class="lg:w-1/3">
      <div class="bg-gray-50 p-6 rounded-lg sticky top-4">
        <!-- Focus Areas -->
        {#if organization?.focusAreas?.length}
          <div class="mb-6">
            <h2 class="text-xl font-bold mb-3">Focus Areas</h2>
            <div class="flex flex-col gap-2">
              {#each organization.focusAreas as area}
                <TagLink type="t" value={area} />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Locations -->
        {#if organization?.locations?.length}
          <div class="mb-6">
            <h2 class="text-xl font-bold mb-3">Locations</h2>
            <div class="flex flex-col gap-2">
              {#each organization.locations as location}
                <TagLink type="l" value={location} context="location" />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Engagement Types -->
        {#if organization?.engagementTypes?.length}
          <div class="mb-6 border-b border-gray-200 pb-6">
            <h2 class="text-xl font-bold mb-3">Ways to Engage</h2>
            <div class="flex flex-col gap-2">
              {#each organization.engagementTypes as type}
                <TagLink type="l" value={type} context="engagement" />
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  
    </div>
    
    <!-- Raw Data Display -->
    <div class="mt-8 flex flex-col items-center border-t pt-8">
        <h3 class="text-xl font-semibold mb-4">Developer Tools</h3>
        
        <!-- Organization Data -->
        <div class="mb-4 w-full max-w-4xl bg-gray-100 p-4 rounded-lg">
          <h4 class="font-semibold mb-2">Organization Event Data:</h4>
          <pre class="overflow-x-auto">{JSON.stringify({
            id: event?.id,
            pubkey: event?.pubkey,
            kind: event?.kind,
            tags: event?.tags,
            content: organization,
            created_at: event?.created_at
          }, null, 2)}</pre>
        </div>

        <!-- Current User Profile -->
        {#if $ndk?.signer}
          {#await $ndk.signer.user().then(user => user.fetchProfile()) then profile}
            <div class="mb-4 w-full max-w-4xl bg-gray-100 p-4 rounded-lg">
              <h4 class="font-semibold mb-2">Current User Profile:</h4>
              <pre class="overflow-x-auto">{JSON.stringify(profile, null, 2)}</pre>
            </div>
          {:catch error}
            <div class="text-red-500 mb-4">
              Failed to load current user profile: {error.message}
            </div>
          {/await}
        {:else}
          <div class="text-gray-500 mb-4">
            No user logged in. Profile will appear here when logged in.
          </div>
        {/if}
        <button
          on:click={() => showRawData = !showRawData}
          class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg text-lg"
        >
          {showRawData ? 'Hide' : 'Show'} Raw Nostr Data
        </button>
        
        {#if showRawData}
          <div class="mt-4 w-full max-w-4xl bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto">
            <pre>{JSON.stringify({
              id: event?.id,
              pubkey: event?.pubkey,
              kind: event?.kind,
              tags: event?.tags,
              content: organization,
              created_at: event?.created_at
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
