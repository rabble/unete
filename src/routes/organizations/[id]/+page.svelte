<script lang="ts">
  import { page } from '$app/stores';
  import TagLink from '$lib/components/TagLink.svelte';
  import { ndk } from '$lib/stores/ndk';
  import { userProfile } from '$lib/stores/userProfile';
  import type { OrganizationContent } from '$lib/nostr/kinds';
  import { isAdmin } from '$lib/nostr/admin';
  import { goto } from '$app/navigation';
  import { SignerRequiredError, PublishError } from '$lib/nostr/errors';
  import { deleteOrganization } from '$lib/nostr/organizations';
  import { ORGANIZATION_TAGS } from '$lib/nostr/kinds';

  export let data;
  
  let organization: OrganizationContent | null = data.initialData?.organization || null;
  let event: NDKEvent | null = data.initialData?.event || null;
  let loading = !data.initialData;
  let error: string | null = null;
  let showJson = false;
  let rawEvent: any = null;
  let isOwner = false;
  let hasCachedData = false;
  let relayStatus = 'Checking relay connections...';
  let connectedRelays: string[] = [];
  let disconnectedRelays: string[] = [];

  // Check relay connections
  const checkRelays = async () => {
    if (!$ndk) return;
    
    const status = await $ndk.checkRelayConnections();
    connectedRelays = status.connected;
    disconnectedRelays = status.disconnected;
    
    if (connectedRelays.length > 0) {
      relayStatus = `Connected to ${connectedRelays.length} relay(s): ${connectedRelays.join(', ')}`;
    } else {
      relayStatus = 'Not connected to any relays';
    }
  };

  // Load data once on mount
  const loadData = async () => {
    if (!data.promise) return;
    
    if (!data.initialData) {
      loading = true;
    }
    
    try {
      const result = await data.promise;
      organization = result.organization;
      event = result.event;
      
      // Check ownership using the existing NDK signer
      if ($ndk?.signer && event && $userProfile) {
        isOwner = $userProfile.pubkey === event.pubkey;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load organization';
    } finally {
      loading = false;
    }
  };

  // Run once on mount and when data.promise changes
  $: if (data.promise) {
    loadData();
  }

  // Watch for changes in userProfile to update ownership status
  $: if ($userProfile && event) {
    isOwner = $userProfile.pubkey === event.pubkey;
  }
</script>

<div class="container mx-auto px-4 py-12">
  <!-- Main two-column layout -->
  <div class="flex flex-col lg:flex-row gap-8">
    <!-- Left column - Main content -->
    <div class="w-full">
      <!-- Admin controls -->
      {#if organization && isOwner}
        <div class="flex justify-end mb-4 space-x-4">
          <button
            on:click={() => showJson = !showJson}
            class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            {showJson ? 'Hide JSON' : 'Show JSON'}
          </button>
          <a
            href="/organizations/{$page.params.id}/edit"
            class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Edit Organization
          </a>
          <button
            on:click={async () => {/* deletion logic */}}
            class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Delete Organization
          </button>
        </div>
      {/if}

      <!-- Loading and error states -->
      {#if loading && !hasCachedData}
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          <p class="mt-2 text-gray-600">Loading organization details...</p>
        </div>
      {:else if error}
        <div class="bg-red-50 border-l-4 border-red-400 p-4">
          <p class="text-red-700">{error}</p>
        </div>
      {:else if organization}
        <!-- Organization content -->
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          <!-- JSON preview -->
          {#if showJson}
            <div class="p-8 bg-gray-50 border-b">
              <h2 class="text-2xl font-bold mb-4">Raw Event Data</h2>
              <pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          {/if}

          <!-- Organization header -->
          <div class="bg-purple-100 p-8 flex justify-center items-center">
            {#if organization.picture}
              <img
                src={organization.picture}
                alt=""
                class="max-h-48 w-auto"
                aria-hidden="true"
                role="presentation"
              />
            {/if}
          </div>

          <!-- Organization details -->
          <div class="p-8">
            <!-- Basic info section -->
            <div class="mb-8">
              <h1 class="text-4xl font-bold mb-2">{organization.name || 'Unnamed Organization'}</h1>
              <div class="inline-block bg-purple-100 text-purple-800 px-4 py-2 rounded-full mb-4">
                {organization.category || 'Uncategorized'}
              </div>
              {#if organization.description}
                <p class="text-gray-700 text-lg leading-relaxed">{organization.description}</p>
              {/if}
            </div>

            <!-- Contact info section -->
            {#if organization.website || organization.email}
              <div class="mb-8 bg-gray-50 p-6 rounded-lg">
                <h2 class="text-2xl font-bold mb-4">Contact Information</h2>
                <div class="grid gap-4">
                  {#if organization.website}
                    <div class="flex items-center">
                      <span class="font-medium min-w-[100px]">Website:</span>
                      <a href={organization.website} class="text-purple-600 hover:text-purple-800 hover:underline flex items-center"
                        target="_blank" rel="noopener noreferrer">
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
                      <a href="mailto:{organization.email}" class="text-purple-600 hover:text-purple-800 hover:underline flex items-center">
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
                        
            <!-- Main container -->
            <div class="flex flex-col lg:flex-row gap-8 w-full">
              <!-- Left column (2/3) -->
              <div class="w-full lg:w-2/3">
                <!-- Additional info section -->
                {#if organization.about || organization.mission || organization.vision || organization.founded || organization.size || organization.languages?.length}
                  <div class="mb-8">
                    <h2 class="text-2xl font-bold mb-4">Additional Information</h2>
                    
                    <!-- Basic fields -->
                    {#each ['about', 'mission', 'vision', 'founded', 'size'] as field}
                      {#if organization[field]}
                        <div class="mb-4">
                          <h3 class="text-xl font-semibold mb-2">{field.charAt(0).toUpperCase() + field.slice(1)}</h3>
                          <p class="text-gray-700">{organization[field]}</p>
                        </div>
                      {/if}
                    {/each}
                    
                    <!-- Languages section -->
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

                    <!-- Complex fields -->
                    {#each ['communityId', 'supporter', 'staff'] as field}
                      {#if organization[field]}
                        <div class="mb-4">
                          <h3 class="text-xl font-semibold mb-2">
                            {field === 'communityId' ? 'Community ID' : field.charAt(0).toUpperCase() + field.slice(1)}
                          </h3>
                          {#if field === 'communityId'}
                            <p class="text-gray-700">{organization[field]}</p>
                          {:else}
                            <p class="text-gray-700">
                              Range: {organization[field].range[0]} - {organization[field].range[1]}
                              {#if organization[field].description}
                                <br>
                                {organization[field].description}
                              {/if}
                            </p>
                          {/if}
                        </div>
                      {/if}
                    {/each}
                  </div>
                {/if}

                <!-- Social links section -->
                {#if organization.socialLinks && Object.values(organization.socialLinks).some(link => link)}
                  <div class="mb-8 bg-gray-50 p-6 rounded-lg">
                    <h2 class="text-2xl font-bold mb-4">Connect With {organization.name}</h2>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {#each Object.entries(organization.socialLinks) as [platform, link]}
                        {#if link}
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors">
                            <!-- Social icons here -->
                            <span class="text-gray-700 font-medium">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                          </a>
                        {/if}
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Right column (1/3) -->
              <div class="lg:w-1/3">
                <div class="bg-gray-50 p-6 rounded-lg sticky top-4">
                  <div class="space-y-2 mt-auto overflow-auto">
                    <!-- Focus Areas section -->
                    <div>
                      <h3 class="text-sm font-semibold mb-1">Focus Areas:</h3>
                      <div class="flex flex-wrap gap-1">
                        {#each event?.tags.filter(t => t[0] === ORGANIZATION_TAGS.FOCUS_AREA) as [_, area]}
                          <a 
                            href="/topics/{encodeURIComponent(area.toLowerCase())}"
                            class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs hover:bg-purple-200 transition-colors"
                          >
                            {area}
                          </a>
                        {/each}
                      </div>
                    </div>
                    
                    <!-- Locations section -->
                    <div>
                      <h3 class="text-sm font-semibold mb-1">Locations:</h3>
                      <div class="flex flex-wrap gap-1">
                        {#each event?.tags.filter(t => t[0] === ORGANIZATION_TAGS.LOCATION) as [_, location]}
                          <a 
                            href="/organizations?locations={encodeURIComponent(location)}"
                            class="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs hover:bg-gray-200 transition-colors"
                          >
                            {location}
                          </a>
                        {/each}
                      </div>
                    </div>

                    <!-- Engagement Types section -->
                    <div>
                      <h3 class="text-sm font-semibold mb-1">Engagement Types:</h3>
                      <div class="flex flex-wrap gap-1">
                        {#each event?.tags.filter(t => t[0] === ORGANIZATION_TAGS.ENGAGEMENT) as [_, type]}
                          <a 
                            href="/topics/{encodeURIComponent(type.toLowerCase())}"
                            class="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs hover:bg-green-200 transition-colors"
                          >
                            {type}
                          </a>
                        {/each}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div> 
          </div>
        </div>
      {/if}
    </div>
  </div>

 
  <!-- Developer tools section -->
  <div class="mt-8 flex flex-col items-center border-t pt-8">
    <h3 class="text-xl font-semibold mb-4">Developer Tools</h3>
    
    <!-- Organization data -->
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

    <!-- User profile section -->
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
  </div>
</div>
