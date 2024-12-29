<script lang="ts">
  import { initNostrLogin } from '$lib/nostr/login';
  import { userProfile, isLoggedIn } from '$lib/stores/userProfile';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import NDK, { NDKNip07Signer, type NDKUser, type NDKEvent } from '@nostr-dev-kit/ndk';

  const images = [
    'diego_rivera_mural.jpg',
    'solidarity.jpg',
    'solar_commons_mural.jpg',
    'chalk_mural.jpg',
    'imagine_wall.jpg',
    'students_trafford.jpg',
    'in_solidarity_mural.jpg',
    'BLM_street_art.jpg',
    'iowa_mural.jpg'
  ];
  const randomImage = images[Math.floor(Math.random() * images.length)];

  let ndk: NDK;
  
  // Interface for relay sets
  interface RelaySet {
    id: string;
    name: string;
    title?: string;
    image?: string;
    description?: string;
    relays: string[];
  }

  let selectedRelaySet: RelaySet | null = null;
  let relaySets: RelaySet[] = [];

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

  let user: NDKUser | undefined;
  let profile: { name?: string; about?: string; picture?: string; } | undefined;
  let userPosts: NDKEvent[] = [];
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

  const LIST_TYPES = {
    followSets: 'Follow Sets',
    relaySets: 'Relay Sets', 
    bookmarkSets: 'Bookmark Sets',
    curationSets: 'Curation Sets',
    videoSets: 'Video Sets',
    muteSets: 'Mute Sets',
    interestSets: 'Interest Sets',
    emojiSets: 'Emoji Sets',
    releaseSets: 'Release Sets'
  };

  function extractRelaySets(events: NDKEvent[]): RelaySet[] {
    const sets: RelaySet[] = [];
    events.forEach(event => {
      const setId = event.tags.find(t => t[0] === 'd')?.[1] || 'default';
      const relays = event.tags.filter(t => t[0] === 'relay').map(t => t[1]);
      if (relays.length > 0) {
        sets.push({
          id: setId,
          name: event.content || setId,
          title: event.tags.find(t => t[0] === 'title')?.[1],
          image: event.tags.find(t => t[0] === 'image')?.[1],
          description: event.tags.find(t => t[0] === 'description')?.[1],
          relays
        });
      }
    });
    return sets;
  }

  async function fetchUserContent() {
    if (!user) return;

    // Fetch recent posts (kind 1)
    const postsEvents = await ndk.fetchEvents({
      kinds: [NDKKind.Text],
      authors: [user.pubkey],
      limit: 10
    });
    userPosts = Array.from(postsEvents);
  }

  async function fetchListContent(listType: string) {
    if (!user || !revealedSections.has(listType)) return;

    // Initialize the list array if it doesn't exist
    if (!userLists[listType]) {
      userLists[listType] = [];
    }

    // Skip if already loaded
    if (userLists[listType].length > 0) return;

    const listKindMap = {
      followSets: { kind: 30000 },    // Follow Sets
      pinSets: { kind: 30001 },       // Pin Sets
      relaySets: { kind: 30002 },     // Relay Sets
      bookmarkSets: { kind: 30003 },   // Bookmark Sets
      curationSets: { kind: 30004 },    // Curation Sets
      videoSets: { kind: 30005 },       // Video Sets
      muteSets: { kind: 30007 },        // Kind-specific Mute Sets
      interestSets: { kind: 30015 },    // Interest Sets
      emojiSets: { kind: 30030 },       // Emoji Sets
      releaseSets: { kind: 30063 },      // Release Artifact Sets
      mutes: { kind: 30000, d: 'mute' },     // Mute Lists
      bookmarks: { kind: 30001, d: 'bookmark' },     // Bookmark Lists
      communities: { kind: 30001, d: 'community' },     // Communities Lists
      muteList: { kind: 10000 },     // Mute List (pubkeys, hashtags, words, threads)
      pinnedNotes: { kind: 10001 },     // Pinned Notes (kind:1 notes for profile)
      bookmarkList: { kind: 10003 },     // Bookmarks (notes, articles, hashtags, URLs)
      communityList: { kind: 10004 },     // NIP-72 Communities (kind:34550 definitions)
      chatList: { kind: 10005 },     // NIP-28 Chat Channels (kind:40 definitions)
      blockedRelayList: { kind: 10006 },     // Blocked Relays (never connect to these)
      searchRelayList: { kind: 10007 },     // Search Relays (for search queries)
      groupList: { kind: 10009 }     // NIP-29 Groups (group id + relay URL + name)
    };

    const kind = listKindMap[listType]?.kind;
    const events = await ndk.fetchEvents({
      kinds: [kind],
      authors: [user.pubkey]
    });
    userLists[listType] = Array.from(events);
    
    // Process relay sets after fetching events
    if (listType === 'searchRelays') {
      relaySets = extractRelaySets(Array.from(events));
      if (relaySets.length > 0) {
        selectedRelaySet = relaySets[0];
      }
    }
  }

  function toggleSection(section: string) {
    if (revealedSections.has(section)) {
      revealedSections.delete(section);
    } else {
      revealedSections.add(section);
      fetchListContent(section);
    }
    revealedSections = revealedSections; // Trigger reactivity
  }

  onMount(() => {
    ndk = new NDK({
      explicitRelayUrls: [
        'wss://relay.nos.social',
        'wss://relay.damus.io',
        'wss://relay.nostr.band'
      ],
      signer: new NDKNip07Signer()
    });
    ndk.connect();
  });

  async function login() {
    try {
      console.log('Starting login process...');
      await ndk.connect();
      console.log('NDK connected');
      
      user = await ndk.signer?.user();
      console.log('User obtained:', user);
      
      if (user) {
        $isLoggedIn = true;
        console.log('User logged in, fetching profile...');
        
        // Fetch profile data
        const profileData = await user.fetchProfile();
        profile = profileData;
        console.log('Profile fetched:', profile);
        
        // Initialize user content
        await fetchUserContent();
        console.log('User content fetched');
        
        // Force a UI update
        userLists = { ...userLists };
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  async function logout() {
    try {
      console.log('Logging out...');
      // Clear NDK state
      ndk.signer = undefined;
      user = undefined;
      profile = undefined;
      userPosts = [];
      userLists = {};
      isLoggedIn = false;
      revealedSections = new Set();
      
      // Disconnect NDK
      await ndk.disconnect();
      
      // Create new NDK instance
      ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.nos.social',
          'wss://relay.damus.io',
          'wss://relay.nostr.band'
        ],
        signer: new NDKNip07Signer()
      });
      
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
</script>

<main class="container mx-auto max-w-4xl p-8">
  <div class="mb-12">
    <div class="bg-white rounded-lg shadow-lg p-8 mb-12">
      <h1 class="text-4xl font-bold mb-4">All of Us: A Directory To Connect, Care, and Build</h1>
      <h3 class="text-xl text-gray-700 mb-8">Contact campaigns and organizations that need your help to help everyone.</h3>
      <p class="text-gray-700 mb-6 text-left">
        <strong>All of Us</strong> wants to help you find and join efforts to make
        neighborhoods, schools, jobs, and daily lives better. Use the search
        below to find and work with organizations on a wide range of issues
        throughout the country. Enter your information and find ways to help
        people in need, stop evictions, stop deportations, win higher wages and
        greater respect on the job, work for racial and gender justice, bring
        healthcare and reproductive rights to all, protect our environment,
        achieve climate justice, win electoral reforms, and more opportunities for organizing together.
      </p>

      <h2 class="text-2xl font-bold mb-4">Get Involved</h2>
      <p class="text-gray-700 mb-6">
        Use your skills for positive change, learn new ones, and connect with
        campaigns and organizations that need your help to help your community.
      </p>
      
      <a 
        href="/organizations" 
        class="block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors text-center mb-8"
      >
        Get Involved Now
      </a>

      <!-- Random inspirational image -->
      <img 
        src={`/assets/${randomImage}`}
        alt="Inspirational Movement Art"
        class="w-full rounded-lg shadow-lg"
      />
    </div>

    <!-- Login/Profile Section -->
    <div class="fixed bottom-4 right-4">
      {#if $isLoggedIn && $userProfile}
        <a href="/dashboard" class="text-purple-600 hover:text-purple-800 flex items-center space-x-2">
          {#if $userProfile.profile?.picture}
            <img src={$userProfile.profile.picture} alt="Profile" class="w-6 h-6 rounded-full">
          {/if}
          <span>{$userProfile.profile?.name || 'Dashboard'}</span>
        </a>
      {:else}
        <button
          on:click={() => initNostrLogin()}
          class="text-purple-600 hover:text-purple-800 text-sm"
        >
          Login with Nostr
        </button>
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <!-- Latest Updates -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Latest Updates</h2>
      <div class="space-y-6">
        {#if userLists.communities?.length > 0}
          {#each userLists.communities.slice(0, 5) as org}
            <div class="border-b pb-4">
              <h3 class="font-semibold text-lg mb-2">
                {org.tags.find(t => t[0] === 'name')?.[1] || 'Organization'}
              </h3>
              <p class="text-gray-600 mb-2">{org.content}</p>
              <p class="text-sm text-gray-500">
                {new Date(org.created_at * 1000).toLocaleDateString()}
              </p>
            </div>
          {/each}
        {:else}
          <p class="text-gray-600">No updates available</p>
        {/if}
        <a href="/announcements" class="text-purple-600 hover:text-purple-800 font-medium">
          View all updates →
        </a>
      </div>
    </div>

    <!-- Recent Reports -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Recent Reports</h2>
      <div class="space-y-6">
        {#if userLists.communities?.length > 0}
          {#each userLists.communities.slice(0, 5) as org}
            <div class="border-b pb-4">
              <p class="text-sm text-gray-500 mb-1">
                {org.tags.find(t => t[0] === 'name')?.[1] || 'Organization'} 
                {new Date(org.created_at * 1000).toLocaleDateString()}
              </p>
              <h3 class="font-semibold text-lg mb-2">
                {org.tags.find(t => t[0] === 'description')?.[1] || 'Report Title'}
              </h3>
              <p class="text-gray-600 mb-2">{org.content}</p>
              <a href={`/reports/${org.id}`} class="text-purple-600 hover:text-purple-800">
                Read full report →
              </a>
            </div>
          {/each}
        {:else}
          <p class="text-gray-600">No reports available</p>
        {/if}
        <a href="/reports" class="text-purple-600 hover:text-purple-800 font-medium">
          View all reports →
        </a>
      </div>
    </div>
  </div>

  
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
        <h3 class="text-2xl font-semibold mb-2">Lists</h3>
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p class="text-yellow-700">
            <strong>Note:</strong> Some clients may still use legacy list formats. 
            We recommend transitioning to the standardized NIP-51 list formats shown below 
            for better interoperability and feature support.
          </p>
        </div>
        
        <!-- People Lists/Sets -->
        <div>
          <h4 class="text-xl font-semibold mb-4">People Lists & Sets</h4>
          {#if userLists.people.length > 0}
            <div class="space-y-4">
              <!-- Group lists by their 'd' identifier -->
              {#each Array.from(new Set(userLists.people.map(list => list.tags.find(t => t[0] === 'd')?.[1] || 'default'))).sort() as setId}
                <div class="border-l-4 border-blue-400 pl-4">
                  <div class="mb-4">
                    <h5 class="font-semibold text-blue-800">
                      {list.tags.find(t => t[0] === 'title')?.[1] || `Set: ${setId}`}
                    </h5>
                    {#if list.tags.find(t => t[0] === 'image')}
                      <img 
                        src={list.tags.find(t => t[0] === 'image')?.[1]} 
                        alt="Set image"
                        class="mt-2 w-24 h-24 object-cover rounded-lg"
                      />
                    {/if}
                    {#if list.tags.find(t => t[0] === 'description')}
                      <p class="mt-2 text-sm text-gray-600">
                        {list.tags.find(t => t[0] === 'description')?.[1]}
                      </p>
                    {/if}
                  </div>
                  <div class="space-y-3">
                    {#each userLists.people.filter(list => (list.tags.find(t => t[0] === 'd')?.[1] || 'default') === setId) as list}
                      <div class="bg-gray-50 p-4 rounded-lg text-left">
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-sm text-gray-500">Set ID: {setId}</span>
                          <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Set</span>
                        </div>
                        <p class="text-gray-800">{list.content}</p>
                        <!-- Display people in this set -->
                        {#if list.tags.filter(t => t[0] === 'p').length > 0}
                          <div class="mt-3">
                            <span class="text-sm font-medium">People in set:</span>
                            <div class="mt-2 space-y-2">
                              {#each list.tags.filter(t => t[0] === 'p') as [_, pubkey]}
                                <div class="bg-white p-2 rounded border border-blue-200">
                                  <span class="font-mono text-sm text-blue-600">{pubkey}</span>
                                </div>
                              {/each}
                            </div>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No people lists or sets found</p>
          {/if}
        </div>

        <!-- Bookmarks & Curations -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Bookmarks & Curations</h4>
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
                    
                    <!-- Topics & Curations -->
                    {#if list.tags.filter(t => t[0] === 't').length > 0}
                      <div>
                        <span class="font-medium">Topics & Curations:</span>
                        <div class="flex flex-wrap gap-2 mt-2">
                          {#each list.tags.filter(t => t[0] === 't') as tag}
                            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-blue-200 transition-colors">
                              #{tag[1]}
                            </span>
                          {/each}
                        </div>
                        {#if list.tags.find(t => t[0] === 'd')}
                          <div class="mt-2 text-sm text-gray-600">
                            Curation Set: {list.tags.find(t => t[0] === 'd')?.[1]}
                          </div>
                        {/if}
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
          {#if userLists.mutes?.filter(list => list.tags.find(t => t[0] === 'd')?.[1] === 'mute').length > 0}
            <div class="space-y-4">
              {#each userLists.mutes.filter(list => list.tags.find(t => t[0] === 'd')?.[1] === 'mute') as list}
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
          <div class="flex justify-between items-center mb-4">
            <h4 class="text-xl font-semibold">Search Relays</h4>
            {#if relaySets.length > 0}
              <div class="relative">
                <select 
                  bind:value={selectedRelaySet}
                  class="bg-white border border-gray-300 rounded-md py-2 px-4 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={null}>Select Relay Set</option>
                  {#each relaySets as set}
                    <option value={set}>
                      {set.name} {set.title ? `- ${set.title}` : ''}
                    </option>
                  {/each}
                </select>
              </div>
            {/if}
          </div>
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

        <!-- Follow Sets -->
        <div>
          <div class="flex justify-between items-center mb-4">
            <h4 class="text-xl font-semibold">Follow Sets</h4>
            <button
              on:click={() => toggleSection('followSets')}
              class="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg transition-colors"
            >
              {revealedSections.has('followSets') ? 'Hide' : 'Reveal'}
            </button>
          </div>
          {#if revealedSections.has('followSets')}
            {#if userLists.followSets?.length > 0}
              <div class="space-y-4">
                {#each userLists.followSets as followSet}
                  <div class="bg-gray-50 p-4 rounded-lg text-left">
                    <div class="mb-4">
                      <h5 class="font-semibold text-blue-800">
                        {followSet.content || 'Unnamed Set'}
                      </h5>
                      {#if followSet.tags.find(t => t[0] === 'description')}
                        <p class="mt-2 text-sm text-gray-600">
                          {followSet.tags.find(t => t[0] === 'description')?.[1]}
                        </p>
                      {/if}
                    </div>
                    
                    <!-- Display users in the set -->
                    {#if followSet.tags.filter(t => t[0] === 'p').length > 0}
                      <div class="mt-3">
                        <span class="text-sm font-medium">People in set ({followSet.tags.filter(t => t[0] === 'p').length}):</span>
                        <div class="mt-2 space-y-2">
                          {#each followSet.tags.filter(t => t[0] === 'p') as [_, pubkey]}
                            <div class="bg-white p-2 rounded border border-blue-200">
                              <span class="font-mono text-sm text-blue-600">{pubkey}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {:else}
                      <p class="text-gray-500">No users in this set</p>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-gray-500">No follow sets found</p>
            {/if}
          {/if}
        </div>

        <!-- Relay Sets -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Relay Sets</h4>
          {#if userLists.relaySets.length > 0}
            <div class="space-y-4">
              {#each userLists.relaySets as relaySet}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="mb-4">
                    <h5 class="font-semibold text-blue-800">
                      {relaySet.content || 'Unnamed Set'}
                    </h5>
                    {#if relaySet.tags.find(t => t[0] === 'description')}
                      <p class="mt-2 text-sm text-gray-600">
                        {relaySet.tags.find(t => t[0] === 'description')?.[1]}
                      </p>
                    {/if}
                  </div>
                  
                  <!-- Display relays in the set -->
                  {#if relaySet.tags.filter(t => t[0] === 'relay').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Relays in set ({relaySet.tags.filter(t => t[0] === 'relay').length}):</span>
                      <div class="mt-2 space-y-2">
                        {#each relaySet.tags.filter(t => t[0] === 'relay') as [_, relay]}
                          <div class="bg-white p-2 rounded border border-blue-200">
                            <span class="font-mono text-sm text-blue-600">{relay}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {:else}
                    <p class="text-gray-500">No relays in this set</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No relay sets found</p>
          {/if}
        </div>

        <!-- Curation Sets -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Curation Sets</h4>
          {#if userLists.curationSets.length > 0}
            <div class="space-y-4">
              {#each userLists.curationSets as curationSet}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="mb-4">
                    <h5 class="font-semibold text-blue-800">
                      {curationSet.content || 'Unnamed Curation'}
                    </h5>
                    {#if curationSet.tags.find(t => t[0] === 'description')}
                      <p class="mt-2 text-sm text-gray-600">
                        {curationSet.tags.find(t => t[0] === 'description')?.[1]}
                      </p>
                    {/if}
                  </div>
                  
                  <!-- Display curated articles -->
                  {#if curationSet.tags.filter(t => t[0] === 'a').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Curated Articles ({curationSet.tags.filter(t => t[0] === 'a').length}):</span>
                      <div class="mt-2 space-y-2">
                        {#each curationSet.tags.filter(t => t[0] === 'a') as [_, articleId]}
                          <div class="bg-white p-2 rounded border border-amber-200">
                            <span class="font-mono text-sm text-amber-600">{articleId}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Display curated notes -->
                  {#if curationSet.tags.filter(t => t[0] === 'e').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Curated Notes ({curationSet.tags.filter(t => t[0] === 'e').length}):</span>
                      <div class="mt-2 space-y-2">
                        {#each curationSet.tags.filter(t => t[0] === 'e') as [_, noteId]}
                          <div class="bg-white p-2 rounded border border-blue-200">
                            <span class="font-mono text-sm text-blue-600">{noteId}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if !curationSet.tags.some(t => ['e', 'a'].includes(t[0]))}
                    <p class="text-gray-500">No curated content in this set</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No curation sets found</p>
          {/if}
        </div>

        <!-- Video Sets -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Video Sets</h4>
          {#if userLists.videoSets.length > 0}
            <div class="space-y-4">
              {#each userLists.videoSets as videoSet}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="mb-4">
                    <h5 class="font-semibold text-blue-800">
                      {videoSet.content || 'Unnamed Video Set'}
                    </h5>
                    {#if videoSet.tags.find(t => t[0] === 'description')}
                      <p class="mt-2 text-sm text-gray-600">
                        {videoSet.tags.find(t => t[0] === 'description')?.[1]}
                      </p>
                    {/if}
                  </div>
                  
                  <!-- Display curated videos -->
                  {#if videoSet.tags.filter(t => t[0] === 'a').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Curated Videos ({videoSet.tags.filter(t => t[0] === 'a').length}):</span>
                      <div class="mt-2 space-y-2">
                        {#each videoSet.tags.filter(t => t[0] === 'a') as [_, videoId]}
                          <div class="bg-white p-2 rounded border border-red-200">
                            <span class="font-mono text-sm text-red-600">{videoId}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {:else}
                    <p class="text-gray-500">No videos in this set</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No video sets found</p>
          {/if}
        </div>

        <!-- Interest Sets -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Interest Sets</h4>
          {#if userLists.interestSets.length > 0}
            <div class="space-y-4">
              {#each userLists.interestSets as interestSet}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="mb-4">
                    <h5 class="font-semibold text-green-800">
                      {interestSet.content || 'Unnamed Interest Set'}
                    </h5>
                    {#if interestSet.tags.find(t => t[0] === 'description')}
                      <p class="mt-2 text-sm text-gray-600">
                        {interestSet.tags.find(t => t[0] === 'description')?.[1]}
                      </p>
                    {/if}
                  </div>
                  
                  <!-- Display hashtags -->
                  {#if interestSet.tags.filter(t => t[0] === 't').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Interest Topics:</span>
                      <div class="flex flex-wrap gap-2 mt-2">
                        {#each interestSet.tags.filter(t => t[0] === 't') as [_, tag]}
                          <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                            #{tag}
                          </span>
                        {/each}
                      </div>
                    </div>
                  {:else}
                    <p class="text-gray-500">No interests in this set</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No interest sets found</p>
          {/if}
        </div>

        <!-- Emoji Sets -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Emoji Sets</h4>
          {#if userLists.emojiSets.length > 0}
            <div class="space-y-4">
              {#each userLists.emojiSets as emojiSet}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="mb-4">
                    <h5 class="font-semibold text-yellow-800">
                      {emojiSet.content || 'Unnamed Emoji Set'}
                    </h5>
                    {#if emojiSet.tags.find(t => t[0] === 'description')}
                      <p class="mt-2 text-sm text-gray-600">
                        {emojiSet.tags.find(t => t[0] === 'description')?.[1]}
                      </p>
                    {/if}
                  </div>
                  
                  <!-- Display emojis -->
                  {#if emojiSet.tags.filter(t => t[0] === 'emoji').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Emojis:</span>
                      <div class="flex flex-wrap gap-2 mt-2">
                        {#each emojiSet.tags.filter(t => t[0] === 'emoji') as [_, emoji]}
                          <span class="bg-yellow-100 text-2xl px-3 py-1 rounded-lg">
                            {emoji}
                          </span>
                        {/each}
                      </div>
                    </div>
                  {:else}
                    <p class="text-gray-500">No emojis in this set</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No emoji sets found</p>
          {/if}
        </div>

        <!-- Release Artifact Sets -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Release Artifact Sets</h4>
          {#if userLists.releaseSets.length > 0}
            <div class="space-y-4">
              {#each userLists.releaseSets as releaseSet}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="mb-4">
                    <h5 class="font-semibold text-purple-800">
                      {releaseSet.content || 'Unnamed Release Set'}
                    </h5>
                    {#if releaseSet.tags.find(t => t[0] === 'description')}
                      <p class="mt-2 text-sm text-gray-600">
                        {releaseSet.tags.find(t => t[0] === 'description')?.[1]}
                      </p>
                    {/if}
                  </div>

                  <!-- Application Info -->
                  {#if releaseSet.tags.find(t => t[0] === 'i')}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Application:</span>
                      <span class="ml-2 font-mono text-sm text-purple-600">
                        {releaseSet.tags.find(t => t[0] === 'i')?.[1]}
                      </span>
                    </div>
                  {/if}

                  <!-- Version Info -->
                  {#if releaseSet.tags.find(t => t[0] === 'version')}
                    <div class="mt-2">
                      <span class="text-sm font-medium">Version:</span>
                      <span class="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                        {releaseSet.tags.find(t => t[0] === 'version')?.[1]}
                      </span>
                    </div>
                  {/if}
                  
                  <!-- Release Files -->
                  {#if releaseSet.tags.filter(t => t[0] === 'e').length > 0}
                    <div class="mt-4">
                      <span class="text-sm font-medium">Release Files:</span>
                      <div class="mt-2 space-y-2">
                        {#each releaseSet.tags.filter(t => t[0] === 'e') as [_, fileId]}
                          <div class="bg-white p-3 rounded border border-purple-200">
                            <div class="flex items-center justify-between">
                              <span class="font-mono text-sm text-purple-600">{fileId}</span>
                              <span class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                                kind:1063
                              </span>
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {:else}
                    <p class="text-gray-500 mt-2">No files in this release</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No release artifact sets found</p>
          {/if}
        </div>

        <!-- Kind-specific Mute Sets -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Kind-specific Mute Sets</h4>
          {#if userLists.muteSets.length > 0}
            <div class="space-y-4">
              {#each userLists.muteSets as muteSet}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  {#if muteSet.tags.find(t => t[0] === 'd')}
                    <div class="mb-4">
                      <h5 class="font-semibold text-red-800">
                        {muteSet.content || 'Unnamed Mute Set'}
                      </h5>
                      {#if muteSet.tags.find(t => t[0] === 'description')}
                        <p class="mt-2 text-sm text-gray-600">
                          {muteSet.tags.find(t => t[0] === 'description')?.[1]}
                        </p>
                      {/if}
                    </div>
                  
                    <!-- Display muted pubkeys by kind -->
                    {#if muteSet.tags.filter(t => t[0] === 'p').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Muted Users by Kind:</span>
                      <div class="mt-2 space-y-2">
                        {#each muteSet.tags.filter(t => t[0] === 'p') as [_, pubkey]}
                          <div class="bg-white p-2 rounded border border-red-200">
                            <div class="flex justify-between items-center">
                              <span class="font-mono text-sm text-red-600">{pubkey}</span>
                              {#if muteSet.tags.find(t => t[0] === 'kind')}
                                <span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                                  Kind: {muteSet.tags.find(t => t[0] === 'kind')?.[1]}
                                </span>
                              {/if}
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                    {:else}
                      <p class="text-gray-500">No muted users in this set</p>
                    {/if}
                  {:else}
                    <p class="text-red-500">Invalid mute set: missing or incorrect 'd' tag</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No kind-specific mute sets found</p>
          {/if}
        </div>

        <!-- Bookmark Sets -->
        <div>
          <h4 class="text-xl font-semibold mb-4">Bookmark Sets</h4>
          {#if userLists.bookmarkSets.length > 0}
            <div class="space-y-4">
              {#each userLists.bookmarkSets as bookmarkSet}
                <div class="bg-gray-50 p-4 rounded-lg text-left">
                  <div class="mb-4">
                    <h5 class="font-semibold text-blue-800">
                      {bookmarkSet.content || 'Unnamed Set'}
                    </h5>
                    {#if bookmarkSet.tags.find(t => t[0] === 'description')}
                      <p class="mt-2 text-sm text-gray-600">
                        {bookmarkSet.tags.find(t => t[0] === 'description')?.[1]}
                      </p>
                    {/if}
                  </div>
                  
                  <!-- Display notes -->
                  {#if bookmarkSet.tags.filter(t => t[0] === 'e').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Bookmarked Notes ({bookmarkSet.tags.filter(t => t[0] === 'e').length}):</span>
                      <div class="mt-2 space-y-2">
                        {#each bookmarkSet.tags.filter(t => t[0] === 'e') as [_, noteId]}
                          <div class="bg-white p-2 rounded border border-blue-200">
                            <span class="font-mono text-sm text-blue-600">{noteId}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Display articles -->
                  {#if bookmarkSet.tags.filter(t => t[0] === 'a').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Bookmarked Articles ({bookmarkSet.tags.filter(t => t[0] === 'a').length}):</span>
                      <div class="mt-2 space-y-2">
                        {#each bookmarkSet.tags.filter(t => t[0] === 'a') as [_, articleId]}
                          <div class="bg-white p-2 rounded border border-amber-200">
                            <span class="font-mono text-sm text-amber-600">{articleId}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Display hashtags -->
                  {#if bookmarkSet.tags.filter(t => t[0] === 't').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Tagged Topics:</span>
                      <div class="flex flex-wrap gap-2 mt-2">
                        {#each bookmarkSet.tags.filter(t => t[0] === 't') as [_, tag]}
                          <span class="bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm">#{tag}</span>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Display URLs -->
                  {#if bookmarkSet.tags.filter(t => t[0] === 'r').length > 0}
                    <div class="mt-3">
                      <span class="text-sm font-medium">Bookmarked URLs:</span>
                      <div class="mt-2 space-y-2">
                        {#each bookmarkSet.tags.filter(t => t[0] === 'r') as [_, url]}
                          <a 
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="block bg-white p-2 rounded border border-purple-200 text-purple-600 hover:text-purple-800 text-sm truncate"
                          >
                            {url}
                          </a>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if !bookmarkSet.tags.some(t => ['e', 'a', 't', 'r'].includes(t[0]))}
                    <p class="text-gray-500">No bookmarks in this set</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">No bookmark sets found</p>
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
  {/if}
</main>
