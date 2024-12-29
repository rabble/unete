<script lang="ts">
  import { onMount } from 'svelte';
  import { isLoggedIn } from '$lib/stores/userProfile';
  import { goto } from '$app/navigation';
  import NDK, { NDKNip07Signer, type NDKUser, type NDKEvent } from '@nostr-dev-kit/ndk';
  import { fetchUserContent, getMediaType, getMediaUrls, initializeUser } from '$lib/nostr/ndk-utils';
  import { ndk } from '$lib/stores/ndk';

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
      const result = await initializeUser($ndk);
      user = result.user;
      profile = result.profile;
      
      if (user) {
        isLoggedIn.set(true);
        userPosts = await fetchUserContent($ndk, user);
        userLists = { ...userLists };
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  async function logout() {
    try {
      $ndk.signer = undefined;
      user = undefined;
      profile = undefined;
      userPosts = [];
      userLists = {};
      isLoggedIn.set(false);
      revealedSections = new Set();
      await $ndk.disconnect();
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

  {#if $isLoggedIn && user}
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

    </div>
  {/if}
</main>
