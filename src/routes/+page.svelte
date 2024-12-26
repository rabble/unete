<script lang="ts">
  import NDK, { NDKNip07Signer, NDKKind } from '@nostr-dev-kit/ndk';
  import type { NDKUser, NDKEvent } from '@nostr-dev-kit/ndk';
  import { onMount } from 'svelte';

  // Media detection helpers
  function getMediaUrls(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    const urls = content.match(urlRegex) || [];
    return urls.filter(url => {
      return url.match(/\.(jpg|jpeg|png|gif|mp4|webm|mp3|wav)$/i);
    });
  }

  function getMediaType(url: string): 'image' | 'video' | 'audio' | null {
    if (url.match(/\.(jpg|jpeg|png|gif)$/i)) return 'image';
    if (url.match(/\.(mp4|webm)$/i)) return 'video';
    if (url.match(/\.(mp3|wav)$/i)) return 'audio';
    return null;
  }

  let ndk: NDK;
  let user: NDKUser | undefined;
  let isLoggedIn = false;
  let profile: { name?: string; about?: string; picture?: string; } | undefined;
  let userPosts: NDKEvent[] = [];
  let userLists: { [key: string]: NDKEvent[] } = {
    people: [],
    bookmarks: [],
    mutes: [],
    pins: [],
    contacts: []
  };

  async function fetchUserContent() {
    if (!user) return;

    // Fetch recent posts (kind 1)
    const postsEvents = await ndk.fetchEvents({
      kinds: [NDKKind.Text],
      authors: [user.pubkey],
      limit: 10
    });
    userPosts = Array.from(postsEvents);

    // Fetch all types of lists
    const listKinds = [
      { kind: 30000, name: 'people' },    // People Lists
      { kind: 30001, name: 'bookmarks' }, // Bookmarks
      { kind: 10000, name: 'mutes' },     // Mute Lists
      { kind: 10001, name: 'pins' },      // Pin Lists
      { kind: 3, name: 'contacts' }       // Contacts/Following
    ];

    for (const { kind, name } of listKinds) {
      const events = await ndk.fetchEvents({
        kinds: [kind],
        authors: [user.pubkey]
      });
      userLists[name] = Array.from(events);
    }
  }

  onMount(() => {
    ndk = new NDK({
      explicitRelayUrls: [
        'wss://relay.damus.io',
        'wss://relay.nostr.band'
      ],
      signer: new NDKNip07Signer()
    });
    ndk.connect();
  });

  async function login() {
    try {
      await ndk.connect();
      user = await ndk.signer?.user();
      if (user) {
        isLoggedIn = true;
        // Fetch profile data
        const profileData = await user.fetchProfile();
        profile = profileData;
        await fetchUserContent();
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  }
</script>

<main class="container mx-auto max-w-2xl p-8 text-center">
  <h1 class="text-4xl font-bold mb-8">Nostr Login Demo</h1>
  
  {#if isLoggedIn && user}
    <div class="bg-white shadow-lg rounded-lg p-6 mt-8">
      <h2 class="text-2xl font-semibold mb-4">
        Welcome, {profile?.name || 'Nostr User'}!
      </h2>
      {#if profile?.picture}
        <img 
          src={profile.picture} 
          alt="Profile" 
          class="w-24 h-24 rounded-full mx-auto mb-4"
        />
      {/if}
      {#if profile?.about}
        <p class="text-gray-600 mb-4">{profile.about}</p>
      {/if}
      <p class="text-gray-600">You are logged in with public key:</p>
      <p class="font-mono bg-gray-100 p-2 rounded mt-2 mb-8 break-all">{user.npub}</p>

      <!-- Recent Posts -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-4">Recent Posts</h3>
        {#if userPosts.length > 0}
          <div class="space-y-4">
            {#each userPosts as post}
              <div class="bg-gray-50 p-4 rounded-lg text-left">
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
        {:else}
          <p class="text-gray-500">No recent posts found</p>
        {/if}
      </div>

      <!-- Lists -->
      <div class="space-y-8">
        <h3 class="text-2xl font-semibold mb-6">Lists</h3>
        
        <!-- People Lists -->
        <div>
          <h4 class="text-xl font-semibold mb-4">People Lists</h4>
          {#if userLists.people.length > 0}
            <div class="space-y-4">
              {#each userLists.people as list}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <h5 class="font-semibold">{list.tags.find(t => t[0] === 'd')?.[1] || 'Unnamed List'}</h5>
                  <p class="text-gray-800">{list.content}</p>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No people lists found</p>
          {/if}
        </div>

        <!-- Bookmarks -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Bookmarks</h4>
          {#if userLists.bookmarks.length > 0}
            <div class="space-y-4">
              {#each userLists.bookmarks as list}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <h5 class="font-semibold">{list.tags.find(t => t[0] === 'd')?.[1] || 'Unnamed List'}</h5>
                  <p class="text-gray-800">{list.content}</p>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No bookmarks found</p>
          {/if}
        </div>

        <!-- Mute Lists -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Mute Lists</h4>
          {#if userLists.mutes.length > 0}
            <div class="space-y-4">
              {#each userLists.mutes as list}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <h5 class="font-semibold">{list.tags.find(t => t[0] === 'd')?.[1] || 'Unnamed List'}</h5>
                  <p class="text-gray-800">{list.content}</p>
                  
                  <div class="mt-4 space-y-2">
                    <!-- Muted Users -->
                    {#if list.tags.filter(t => t[0] === 'p').length > 0}
                      <div>
                        <span class="font-medium">Muted Users:</span>
                        <span class="text-gray-600">{list.tags.filter(t => t[0] === 'p').length} users</span>
                      </div>
                    {/if}
                    
                    <!-- Muted Hashtags -->
                    {#if list.tags.filter(t => t[0] === 't').length > 0}
                      <div>
                        <span class="font-medium">Muted Hashtags:</span>
                        <div class="flex flex-wrap gap-2 mt-1">
                          {#each list.tags.filter(t => t[0] === 't') as tag}
                            <span class="bg-gray-200 px-2 py-1 rounded-md text-sm">#{tag[1]}</span>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    
                    <!-- Muted Words -->
                    {#if list.tags.filter(t => t[0] === 'word').length > 0}
                      <div>
                        <span class="font-medium">Muted Words:</span>
                        <div class="flex flex-wrap gap-2 mt-1">
                          {#each list.tags.filter(t => t[0] === 'word') as tag}
                            <span class="bg-gray-200 px-2 py-1 rounded-md text-sm">{tag[1]}</span>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    
                    <!-- Muted Threads -->
                    {#if list.tags.filter(t => t[0] === 'e').length > 0}
                      <div>
                        <span class="font-medium">Muted Threads:</span>
                        <span class="text-gray-600">{list.tags.filter(t => t[0] === 'e').length} threads</span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No mute lists found</p>
          {/if}
        </div>

        <!-- Pin Lists -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Pin Lists</h4>
          {#if userLists.pins.length > 0}
            <div class="space-y-4">
              {#each userLists.pins as list}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <h5 class="font-semibold">{list.tags.find(t => t[0] === 'd')?.[1] || 'Unnamed List'}</h5>
                  <p class="text-gray-800">{list.content}</p>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No pin lists found</p>
          {/if}
        </div>

        <!-- Contacts/Following -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Contacts</h4>
          {#if userLists.contacts.length > 0}
            <div class="space-y-4">
              {#each userLists.contacts as list}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <p class="text-gray-800">Following {list.tags.filter(t => t[0] === 'p').length} people</p>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No contacts found</p>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <button
      on:click={login}
      class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
    >
      Login with Nostr
    </button>
  {/if}
</main>
