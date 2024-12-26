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
    contacts: [],
    communities: [],
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
      { kind: 3, name: 'contacts' },      // Contacts/Following
      { kind: 34550, name: 'communities'}, // Communities
      { kind: 40, name: 'chats' },        // Public Chat Channels
      { kind: 10006, name: 'blockedRelays' }, // Blocked Relays
      { kind: 10007, name: 'searchRelays' },  // Search Relays
      { kind: 10009, name: 'groups' },        // Simple Groups
      { kind: 10015, name: 'interests' },     // Interests
      { kind: 10030, name: 'emojis' },        // Emoji Preferences
      { kind: 10050, name: 'dmRelays' },      // DM Relay Preferences
      { kind: 10101, name: 'wikiAuthors' },   // Wiki Author Preferences
      { kind: 10102, name: 'wikiRelays' }     // Wiki Relay Preferences
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
                  <h5 class="font-semibold">{list.tags.find(t => t[0] === 'd')?.[1] || 'Saved Items'}</h5>
                  <p class="text-gray-800">{list.content}</p>
                  
                  <div class="mt-4 space-y-3">
                    <!-- Saved Notes -->
                    {#if list.tags.filter(t => t[0] === 'e').length > 0}
                      <div>
                        <span class="font-medium">Saved Notes ({list.tags.filter(t => t[0] === 'e').length}):</span>
                        <div class="mt-2 space-y-2">
                          {#each list.tags.filter(t => t[0] === 'e') as tag}
                            <div class="bg-white p-2 rounded border border-gray-200">
                              <span class="text-sm font-mono text-gray-600">{tag[1].slice(0, 8)}...</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    
                    <!-- Saved Articles -->
                    {#if list.tags.filter(t => t[0] === 'a').length > 0}
                      <div>
                        <span class="font-medium">Saved Articles ({list.tags.filter(t => t[0] === 'a').length}):</span>
                        <div class="mt-2 space-y-2">
                          {#each list.tags.filter(t => t[0] === 'a') as tag}
                            <div class="bg-white p-2 rounded border border-gray-200">
                              <span class="text-sm font-mono text-gray-600">{tag[1].slice(0, 8)}...</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    
                    <!-- Saved Hashtags -->
                    {#if list.tags.filter(t => t[0] === 't').length > 0}
                      <div>
                        <span class="font-medium">Saved Hashtags:</span>
                        <div class="flex flex-wrap gap-2 mt-2">
                          {#each list.tags.filter(t => t[0] === 't') as tag}
                            <span class="bg-gray-200 px-2 py-1 rounded-md text-sm">#{tag[1]}</span>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    
                    <!-- Saved URLs -->
                    {#if list.tags.filter(t => t[0] === 'r').length > 0}
                      <div>
                        <span class="font-medium">Saved Links:</span>
                        <div class="mt-2 space-y-2">
                          {#each list.tags.filter(t => t[0] === 'r') as tag}
                            <a 
                              href={tag[1]} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              class="block bg-white p-2 rounded border border-gray-200 text-blue-600 hover:text-blue-800 text-sm truncate"
                            >
                              {tag[1]}
                            </a>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    
                    {#if !list.tags.some(t => ['e', 'a', 't', 'r'].includes(t[0]))}
                      <p class="text-gray-500">No items saved in this list</p>
                    {/if}
                  </div>
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
                  <h5 class="font-semibold">{list.tags.find(t => t[0] === 'd')?.[1] || 'Pinned Notes'}</h5>
                  <p class="text-gray-800">{list.content}</p>
                  
                  <!-- Pinned Notes -->
                  {#if list.tags.filter(t => t[0] === 'e').length > 0}
                    <div class="mt-4">
                      <span class="font-medium">Pinned Notes ({list.tags.filter(t => t[0] === 'e').length}):</span>
                      <div class="mt-2 space-y-3">
                        {#each list.tags.filter(t => t[0] === 'e') as tag}
                          <div class="bg-white p-3 rounded border border-gray-200">
                            <div class="flex justify-between items-center">
                              <span class="text-sm text-gray-500">Note ID:</span>
                              <span class="text-sm font-mono">{tag[1].slice(0, 8)}...</span>
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {:else}
                    <p class="text-gray-500 mt-2">No notes pinned in this list</p>
                  {/if}
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

        <!-- Communities -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Communities</h4>
          {#if userLists.communities.length > 0}
            <div class="space-y-4">
              {#each userLists.communities as community}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <h5 class="font-semibold">{community.tags.find(t => t[0] === 'name')?.[1] || 'Unnamed Community'}</h5>
                  <p class="text-gray-800 mt-2">{community.content}</p>
                  
                  <div class="mt-4 space-y-2">
                    <!-- Community Details -->
                    {#if community.tags.find(t => t[0] === 'description')}
                      <p class="text-sm text-gray-600">
                        {community.tags.find(t => t[0] === 'description')?.[1]}
                      </p>
                    {/if}
                    
                    <!-- Community Moderators -->
                    {#if community.tags.filter(t => t[0] === 'p').length > 0}
                      <div>
                        <span class="text-sm font-medium">Moderators:</span>
                        <span class="text-sm text-gray-600 ml-2">
                          {community.tags.filter(t => t[0] === 'p').length} moderators
                        </span>
                      </div>
                    {/if}
                    
                    <!-- Community Rules -->
                    {#if community.tags.filter(t => t[0] === 'rules').length > 0}
                      <div>
                        <span class="text-sm font-medium">Rules:</span>
                        <div class="mt-1 space-y-1">
                          {#each community.tags.filter(t => t[0] === 'rules') as rule}
                            <p class="text-sm text-gray-600">{rule[1]}</p>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No communities found</p>
          {/if}
        </div>

        <!-- Blocked Relays -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Blocked Relays</h4>
          {#if userLists.blockedRelays.length > 0}
            <div class="space-y-4">
              {#each userLists.blockedRelays as blockedRelay}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="space-y-2">
                    {#each blockedRelay.tags.filter(t => t[0] === 'relay') as [_, relay]}
                      <div class="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                        <span class="font-mono text-sm text-red-600">{relay}</span>
                        <span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Blocked</span>
                      </div>
                    {/each}
                  </div>
                  {#if blockedRelay.content}
                    <p class="text-sm text-gray-600 mt-2">Reason: {blockedRelay.content}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No blocked relays found</p>
          {/if}
        </div>

        <!-- Search Relays -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Search Relays</h4>
          {#if userLists.searchRelays.length > 0}
            <div class="space-y-4">
              {#each userLists.searchRelays as searchRelay}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="space-y-2">
                    {#each searchRelay.tags.filter(t => t[0] === 'relay') as [_, relay]}
                      <div class="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                        <span class="font-mono text-sm text-blue-600">{relay}</span>
                        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Search</span>
                      </div>
                    {/each}
                  </div>
                  {#if searchRelay.content}
                    <p class="text-sm text-gray-600 mt-2">Note: {searchRelay.content}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No search relays found</p>
          {/if}
        </div>

        <!-- Simple Groups -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Groups</h4>
          {#if userLists.groups.length > 0}
            <div class="space-y-4">
              {#each userLists.groups as group}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="space-y-2">
                    {#each group.tags.filter(t => t[0] === 'group') as [_, groupId, relay, name]}
                      <div class="bg-white p-3 rounded border border-green-200">
                        <div class="flex flex-col gap-2">
                          <div class="flex items-center justify-between">
                            <span class="font-medium text-green-700">{name || 'Unnamed Group'}</span>
                            <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Group</span>
                          </div>
                          <span class="font-mono text-sm text-gray-600">ID: {groupId}</span>
                          <span class="font-mono text-sm text-gray-600">Relay: {relay}</span>
                        </div>
                      </div>
                    {/each}
                    {#if group.tags.filter(t => t[0] === 'r').length > 0}
                      <div class="mt-4">
                        <span class="text-sm font-medium">Additional Relays:</span>
                        <div class="mt-2 space-y-2">
                          {#each group.tags.filter(t => t[0] === 'r') as [_, relay]}
                            <div class="bg-white p-2 rounded border border-green-100">
                              <span class="font-mono text-sm text-gray-600">{relay}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                  {#if group.content}
                    <p class="text-sm text-gray-600 mt-2">Note: {group.content}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No groups found</p>
          {/if}
        </div>

        <!-- Interests -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Interests</h4>
          {#if userLists.interests.length > 0}
            <div class="space-y-4">
              {#each userLists.interests as interest}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="space-y-4">
                    <!-- Hashtag Interests -->
                    {#if interest.tags.filter(t => t[0] === 't').length > 0}
                      <div>
                        <span class="font-medium">Topics of Interest:</span>
                        <div class="flex flex-wrap gap-2 mt-2">
                          {#each interest.tags.filter(t => t[0] === 't') as [_, tag]}
                            <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">#{tag}</span>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    <!-- Interest Sets -->
                    {#if interest.tags.filter(t => t[0] === 'a').length > 0}
                      <div>
                        <span class="font-medium">Interest Sets:</span>
                        <div class="mt-2 space-y-2">
                          {#each interest.tags.filter(t => t[0] === 'a') as [_, setId]}
                            <div class="bg-white p-2 rounded border border-purple-200">
                              <span class="font-mono text-sm text-purple-600">{setId}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                  {#if interest.content}
                    <p class="text-sm text-gray-600 mt-4">Note: {interest.content}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No interests found</p>
          {/if}
        </div>

        <!-- Emoji Preferences -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Emoji Preferences</h4>
          {#if userLists.emojis.length > 0}
            <div class="space-y-4">
              {#each userLists.emojis as emojiPref}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="space-y-4">
                    <!-- Individual Emojis -->
                    {#if emojiPref.tags.filter(t => t[0] === 'emoji').length > 0}
                      <div>
                        <span class="font-medium">Favorite Emojis:</span>
                        <div class="flex flex-wrap gap-2 mt-2">
                          {#each emojiPref.tags.filter(t => t[0] === 'emoji') as [_, emoji]}
                            <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-lg">{emoji}</span>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    <!-- Emoji Sets -->
                    {#if emojiPref.tags.filter(t => t[0] === 'a').length > 0}
                      <div>
                        <span class="font-medium">Emoji Sets:</span>
                        <div class="mt-2 space-y-2">
                          {#each emojiPref.tags.filter(t => t[0] === 'a') as [_, setId]}
                            <div class="bg-white p-2 rounded border border-yellow-200">
                              <span class="font-mono text-sm text-yellow-600">{setId}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                  {#if emojiPref.content}
                    <p class="text-sm text-gray-600 mt-4">Note: {emojiPref.content}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No emoji preferences found</p>
          {/if}
        </div>

        <!-- DM Relay Preferences -->
        <div>
          <h4 class="text-xl font-semibold mb-4">DM Relay Preferences</h4>
          {#if userLists.dmRelays.length > 0}
            <div class="space-y-4">
              {#each userLists.dmRelays as dmRelay}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="space-y-2">
                    {#each dmRelay.tags.filter(t => t[0] === 'relay') as [_, relay]}
                      <div class="flex items-center justify-between bg-white p-3 rounded border border-indigo-200">
                        <span class="font-mono text-sm text-indigo-600">{relay}</span>
                        <span class="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">DM Relay</span>
                      </div>
                    {/each}
                  </div>
                  {#if dmRelay.content}
                    <p class="text-sm text-gray-600 mt-2">Note: {dmRelay.content}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No DM relay preferences found</p>
          {/if}
        </div>

        <!-- Wiki Author Preferences -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Recommended Wiki Authors</h4>
          {#if userLists.wikiAuthors.length > 0}
            <div class="space-y-4">
              {#each userLists.wikiAuthors as authorList}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="space-y-2">
                    {#if authorList.tags.filter(t => t[0] === 'p').length > 0}
                      <div>
                        <span class="font-medium">Trusted Authors:</span>
                        <div class="mt-2 space-y-2">
                          {#each authorList.tags.filter(t => t[0] === 'p') as [_, pubkey]}
                            <div class="bg-white p-3 rounded border border-teal-200">
                              <span class="font-mono text-sm text-teal-600">{pubkey}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                  {#if authorList.content}
                    <p class="text-sm text-gray-600 mt-2">Note: {authorList.content}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No wiki author preferences found</p>
          {/if}
        </div>

        <!-- Wiki Relay Preferences -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Recommended Wiki Relays</h4>
          {#if userLists.wikiRelays.length > 0}
            <div class="space-y-4">
              {#each userLists.wikiRelays as relayList}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="space-y-2">
                    {#if relayList.tags.filter(t => t[0] === 'relay').length > 0}
                      <div>
                        <span class="font-medium">Trusted Wiki Relays:</span>
                        <div class="mt-2 space-y-2">
                          {#each relayList.tags.filter(t => t[0] === 'relay') as [_, relay]}
                            <div class="bg-white p-3 rounded border border-cyan-200">
                              <span class="font-mono text-sm text-cyan-600">{relay}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                  {#if relayList.content}
                    <p class="text-sm text-gray-600 mt-2">Note: {relayList.content}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No wiki relay preferences found</p>
          {/if}
        </div>

        <!-- Public Chats -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Public Chat Channels</h4>
          {#if userLists.chats.length > 0}
            <div class="space-y-4">
              {#each userLists.chats as chat}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <!-- Channel Name -->
                  <h5 class="font-semibold">
                    {chat.tags.find(t => t[0] === 'name')?.[1] || 'Unnamed Channel'}
                  </h5>
                  
                  <!-- Channel Description -->
                  <p class="text-gray-800 mt-2">{chat.content}</p>
                  
                  <div class="mt-4 space-y-2">
                    <!-- Channel Picture -->
                    {#if chat.tags.find(t => t[0] === 'picture')}
                      <div class="mb-3">
                        <img 
                          src={chat.tags.find(t => t[0] === 'picture')?.[1]} 
                          alt="Channel picture" 
                          class="w-16 h-16 rounded-lg object-cover"
                        />
                      </div>
                    {/if}
                    
                    <!-- Channel Details -->
                    <div class="text-sm text-gray-600">
                      <!-- Moderators -->
                      {#if chat.tags.filter(t => t[0] === 'p').length > 0}
                        <div class="flex items-center gap-2">
                          <span class="font-medium">Moderators:</span>
                          <span>{chat.tags.filter(t => t[0] === 'p').length}</span>
                        </div>
                      {/if}
                      
                      <!-- Message Types -->
                      {#if chat.tags.find(t => t[0] === 'message_types')}
                        <div class="flex items-center gap-2">
                          <span class="font-medium">Allowed Content:</span>
                          <span>{chat.tags.find(t => t[0] === 'message_types')?.[1]}</span>
                        </div>
                      {/if}
                      
                      <!-- Status -->
                      {#if chat.tags.find(t => t[0] === 'status')}
                        <div class="flex items-center gap-2">
                          <span class="font-medium">Status:</span>
                          <span class="capitalize">{chat.tags.find(t => t[0] === 'status')?.[1]}</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No public chat channels found</p>
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
