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
  let userLists: NDKEvent[] = [];

  async function fetchUserContent() {
    if (!user) return;

    // Fetch recent posts (kind 1)
    const postsEvents = await ndk.fetchEvents({
      kinds: [NDKKind.Text],
      authors: [user.pubkey],
      limit: 10
    });
    userPosts = Array.from(postsEvents);

    // Fetch lists (kind 30001)
    const listsEvents = await ndk.fetchEvents({
      kinds: [30001],
      authors: [user.pubkey]
    });
    userLists = Array.from(listsEvents);
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
      <div>
        <h3 class="text-xl font-semibold mb-4">Lists</h3>
        {#if userLists.length > 0}
          <div class="space-y-4">
            {#each userLists as list}
              <div class="bg-gray-50 p-4 rounded-lg text-left">
                <h4 class="font-semibold">{list.tags.find(t => t[0] === 'd')?.[1] || 'Unnamed List'}</h4>
                <p class="text-gray-800">{list.content}</p>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-gray-500">No lists found</p>
        {/if}
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
