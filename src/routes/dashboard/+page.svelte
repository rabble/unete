<script lang="ts">
  import { onMount } from 'svelte';
  import type { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk';
  import { ndk } from '$lib/stores/ndk';
  import { isLoggedIn, userProfile } from '$lib/stores/userProfile';
  import type { OrganizationContent } from '$lib/nostr/kinds';
  import { fetchUserContent, getMediaType, getMediaUrls, initializeUser } from '$lib/nostr/ndk-utils';

  let user: NDKUser | undefined;
  let profile: { name?: string; about?: string; picture?: string; } | undefined;
  let userPosts: NDKEvent[] = [];
  let userEvents: NDKEvent[] = [];
  let loading = true;
  let error: string | null = null;
  let userLists: { [key: string]: NDKEvent[] } = {
    followSets: [],
    pins: [],
    relaySets: [],
    bookmarkSets: [],
    curationSets: [],
    videoSets: [],
    muteSets: [],
    interestSets: [],
    emojiSets: [],
    releaseSets: [],
    mutes: [],
    bookmarks: [],
    communities: [],
    contacts: [],
    people: [],
    chats: [],
    blockedRelays: [],
    searchRelays: [],
    groups: [],
    interests: [],
    emojis: [],
    dmRelays: [],
    wikiAuthors: [],
    wikiRelays: []
  };
  let revealedSections: Set<string> = new Set();

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
      // Initialize user and profile
      const result = await initializeUser($ndk);
      user = result.user;
      profile = result.profile;
      
      if (!user) {
        throw new Error('Please login using the Nostr extension');
      }

      // Update the global user profile store
      userProfile.set(user);
      
      // Fetch user content in parallel
      const [posts, events] = await Promise.all([
        fetchUserContent($ndk, user),
        $ndk.fetchEvents({
          authors: [user.pubkey],
          kinds: [31337] // Organization kind
        })
      ]);
      
      userPosts = posts;
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

  <!-- User Profile -->
  {#if user && profile}
    <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div class="flex items-start gap-6">
        {#if profile.picture}
          <img 
            src={profile.picture} 
            alt="Profile" 
            class="w-24 h-24 rounded-full"
          />
        {/if}
        <div class="flex-1">
          <h2 class="text-2xl font-semibold">
            Welcome, {profile.name || 'Nostr User'}
          </h2>
          {#if profile.about}
            <p class="text-gray-600 mt-2">{profile.about}</p>
          {/if}
          <p class="text-sm text-gray-500 mt-2">Public key: {user.npub}</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Relay Status -->
  {#if $ndk?.pool?.relays}
    <div class="mb-8 bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-xl font-semibold mb-4">Connected Relays</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        {#each Object.entries($ndk.pool.relays) as [url, relay]}
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <div class={`w-2 h-2 rounded-full ${relay.status === 1 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span class="text-sm font-mono">{url}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Recent Posts -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-semibold mb-6">Recent Posts</h2>
      {#if loading}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      {:else if userPosts.length === 0}
        <p class="text-gray-600 text-center py-8">You haven't made any posts yet.</p>
      {:else}
        <div class="space-y-6">
          {#each userPosts as post}
            <div class="border rounded-lg p-4">
              <p class="text-gray-800">{post.content}</p>
              
              <!-- Media Gallery -->
              {#if getMediaUrls(post.content).length > 0}
                <div class="mt-4 grid grid-cols-2 gap-4">
                  {#each getMediaUrls(post.content) as mediaUrl}
                    {#if getMediaType(mediaUrl) === 'image'}
                      <img 
                        src={mediaUrl} 
                        alt="Post media" 
                        class="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90"
                        loading="lazy"
                      />
                    {:else if getMediaType(mediaUrl) === 'video'}
                      <video 
                        src={mediaUrl} 
                        controls 
                        class="w-full h-48 object-cover rounded-lg"
                      >
                        <track kind="captions">
                      </video>
                    {:else if getMediaType(mediaUrl) === 'audio'}
                      <audio 
                        src={mediaUrl} 
                        controls 
                        class="w-full mt-2"
                      >
                        <track kind="captions">
                      </audio>
                    {/if}
                  {/each}
                </div>
              {/if}

              <p class="text-sm text-gray-500 mt-2">
                {new Date(post.created_at * 1000).toLocaleString()}
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Your Organizations -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-semibold">Your Organizations</h2>
        <a 
          href="/organizations/add" 
          class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Add New
        </a>
      </div>
      
      {#if loading}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      {:else if userEvents.length === 0}
        <p class="text-gray-600 text-center py-8">You haven't created any organizations yet.</p>
      {:else}
        <div class="space-y-6">
          {#each userEvents as event}
            {@const org = getOrgContent(event)}
            <div class="border rounded-lg p-4 hover:bg-gray-50">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="text-xl font-semibold">{org.name}</h3>
                  <p class="text-sm text-gray-600">Created {new Date(event.created_at * 1000).toLocaleString()}</p>
                </div>
                <a 
                  href="/organizations/{event.id}/edit" 
                  class="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Edit
                </a>
              </div>
              <p class="text-gray-700 line-clamp-2">{org.description}</p>
              <div class="mt-2 flex flex-wrap gap-2">
                {#each org.focusAreas as area}
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
  </div>
</div>
