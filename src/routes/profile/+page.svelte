<script lang="ts">
  import NDK, { NDKNip07Signer, NDKKind } from '@nostr-dev-kit/ndk';
  import type { NDKUser, NDKEvent } from '@nostr-dev-kit/ndk';
  import { onMount } from 'svelte';
  import { authStore, handleLogin } from '$lib/auth';
  import { getMediaUrls, getMediaType, fetchUserContent } from '$lib/nostr/ndk-utils';

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

  let user: NDKUser | undefined;
  let isLoggedIn = false;
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
    if (!user || !ndk) return;
    userPosts = await fetchUserContent(ndk, user);
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
    await handleLogin();
  }
</script>

<main class="container mx-auto max-w-2xl p-8 text-center">
  <h1 class="text-4xl font-bold mb-8">Profile</h1>
  
  {#if $authStore.isLoggedIn}
    <!-- Rest of the existing profile content -->
    <div class="bg-white shadow-lg rounded-lg p-6 mt-8">
      <!-- ... (keep all the existing profile content) ... -->
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
