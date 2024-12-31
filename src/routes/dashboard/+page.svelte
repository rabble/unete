<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getStores } from '$app/stores';
  const { page } = getStores();
  import type { NDKEvent, NDKUser, NDKRelay } from '@nostr-dev-kit/ndk';
  import { writable } from 'svelte/store';
  import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
  import { ndk, initNostrLogin, ensureConnection, ndkConnected } from '$lib/stores/ndk';
  import { isLoggedIn, userProfile } from '$lib/stores/userProfile';
  import { ORGANIZATION, GROUP_MEMBERS, type OrganizationContent } from '$lib/nostr/kinds';
  import { initializeUser } from '$lib/nostr/ndk-utils';
  import { getUserGroups, type GroupMetadata, createGroupInvite } from '$lib/nostr/groups';

  // Get notice from URL params if present
  $: notice = $page.url.searchParams.get('notice');

  // Create a store for relay status
  const relayStatus = writable<Map<string, boolean>>(new Map());
  
  let user: NDKUser | undefined;
  let profile: { name?: string; about?: string; picture?: string; } | undefined;
  let unsubscribeHandlers: (() => void)[] = [];
  let userEvents: NDKEvent[] | null = null;
  let cachedOrganizations: NDKEvent[] | null = null;
  let filterTimeout: ReturnType<typeof setTimeout> | null = null;
  let loading = true;
  let error: string | null = null;
  let userGroups: GroupMetadata[] = [];
  let revealedSections: Set<string> = new Set();
  let selectedGroupId: string = '';
  let inviteExpiration: boolean = false;
  let inviteMaxUses: number | null = null;
  let inviteCode: string | null = null;
  let copied: boolean = false;

  async function login() {
    try {
      if (!$ndk) {
        throw new Error('NDK not initialized');
      }
      
      $ndk.signer = new NDKNip07Signer();
      await $ndk.connect();
      
      const result = await initializeUser($ndk);
      user = result.user;
      profile = result.profile;
      userProfile.set(user);
      
      // Clear any previous errors
      error = null;
      
      // Fetch organizations and groups in parallel
      if (user?.pubkey) {
        const [events, groups] = await Promise.all([
          $ndk.fetchEvents({
            authors: [user.pubkey],
            kinds: [ORGANIZATION]
          }),
          getUserGroups($ndk)
        ]);
        
        cachedOrganizations = Array.from(events);
        refreshOrganizations();
        userGroups = groups;
        loading = false; // Update loading state
      }
    } catch (err) {
      console.error('Login failed:', err);
      error = err.message;
    }
  }

  let filteredOrganizations: NDKEvent[] = [];
  let currentFilters: Record<string, any> = {};

  function sortOrganizations(organizations: NDKEvent[]): NDKEvent[] {
    if (!organizations) return [];
    // Create a new array to avoid mutating the original
    return [...organizations].sort((a, b) => b.created_at - a.created_at);
  }

  function applyFilters(organizations: NDKEvent[], filters: Record<string, any>) {
    console.log('Applying filters with criteria:', filters);
    return organizations.filter(event => {
      const org = getOrgContent(event);
      // Add filter logic based on the filters object
      // Example: if (filters.category && org.category !== filters.category) return false;
      return true; // Default to showing all organizations
    });
  }

  // Call this when filter criteria changes
  function updateFilters(newFilters: Record<string, any>) {
    if (!cachedOrganizations) return;
    
    // Update current filters
    currentFilters = { ...currentFilters, ...newFilters };
    
    // Apply sorting and filtering
    const sorted = sortOrganizations(cachedOrganizations);
    filteredOrganizations = applyFilters(sorted, currentFilters);
  }

  // Initial load - show all organizations sorted
  onMount(() => {
    if (cachedOrganizations) {
      filteredOrganizations = sortOrganizations(cachedOrganizations);
      loading = false; // Update loading state
    }
  });

  // Call this when organizations need to be refreshed (e.g., new data loaded)
  function refreshOrganizations() {
    if (cachedOrganizations) {
      const sorted = sortOrganizations(cachedOrganizations);
      filteredOrganizations = applyFilters(sorted, currentFilters);
      loading = false; // Update loading state
    }
  }

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
      loading = true;
      error = null;

      // Ensure we have a connected NDK instance
      const ndkInstance = await ensureConnection();
      if (!ndkInstance) {
        throw new Error('Failed to establish NDK connection');
      }

      // Check if we're already logged in
      if ($isLoggedIn && $userProfile) {
        user = $userProfile;
        profile = await user.fetchProfile();
      } else if (ndkInstance.signer) {
        // Initialize user and profile
        const result = await initializeUser(ndkInstance);
        user = result.user;
        profile = result.profile;
        userProfile.set(user);
      } else {
        throw new Error('Please login using the Nostr extension');
      }

      // Setup relay status monitoring
      if (ndkInstance.pool) {
        // Initialize current status
        const initialStatus = new Map();
        ndkInstance.pool.relays.forEach((relay, url) => {
          initialStatus.set(url, relay.status === 1);
        });
        relayStatus.set(initialStatus);

        // Setup listeners for each relay
        ndkInstance.pool.relays.forEach((relay, url) => {
          const connectHandler = () => {
            relayStatus.update(status => {
              const newStatus = new Map(status);
              newStatus.set(url, true);
              return newStatus;
            });
          };

          const disconnectHandler = () => {
            relayStatus.update(status => {
              const newStatus = new Map(status);
              newStatus.set(url, false);
              return newStatus;
            });
          };

          relay.on('connect', connectHandler);
          relay.on('disconnect', disconnectHandler);
          relay.on('error', disconnectHandler);

          unsubscribeHandlers.push(() => {
            relay.off('connect', connectHandler);
            relay.off('disconnect', disconnectHandler);
            relay.off('error', disconnectHandler);
          });
        });
      }

      // Only fetch organizations if we have a user
      if (user?.pubkey) {
        try {
          const events = await ndkInstance.fetchEvents({
            authors: [user.pubkey],
            kinds: [ORGANIZATION]
          });
          
          cachedOrganizations = Array.from(events);
          refreshOrganizations(); // This will update filteredOrganizations
          
          // Fetch groups separately to avoid blocking the initial render
          getUserGroups(ndkInstance).then(groups => {
            userGroups = groups;
          });
        } catch (err) {
          console.error('Error fetching organizations:', err);
          error = 'Failed to load organizations';
        }
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  });

  // Move cleanup to onDestroy
  onDestroy(() => {
    // Cleanup relay listeners
    unsubscribeHandlers.forEach(handler => handler());
  });
</script>


<div class="max-w-7xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Dashboard</h1>

  {#if notice}
    <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
      <p class="text-green-700">{notice}</p>
    </div>
  {/if}

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <p class="text-red-700">{error}</p>
      {#if error.includes('Please login')}
        <button
          on:click={login}
          class="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Login with Nostr
        </button>
      {/if}
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
  {#if $ndk?.pool}
    <div class="mb-8 bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-xl font-semibold mb-4">Connected Relays</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        {#each Array.from($relayStatus) as [url, connected]}
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <div class={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span class="text-sm font-mono">{url}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}


  <div class="grid grid-cols-1 gap-8">

    <!-- Debug Section -->
    <div class="bg-gray-100 p-4 rounded-lg mb-8">
      <h3 class="font-bold mb-2">Debug Info:</h3>
      <pre class="text-sm">Loading: {loading}</pre>
      <pre class="text-sm">User Events: {JSON.stringify(userEvents, null, 2)}</pre>
      <pre class="text-sm">Cached Organizations: {JSON.stringify(cachedOrganizations, null, 2)}</pre>
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
      
      {#if loading || filteredOrganizations.length === 0}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      {:else if filteredOrganizations.length > 0}
        <div class="space-y-6">
          {#each filteredOrganizations as event}
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
              <div class="mt-2 space-y-2">
                <div class="flex flex-wrap gap-2">
                  {#each org.focusAreas as area}
                    <span class="bg-purple-100 text-purple-700 text-sm px-2 py-1 rounded">
                      {area}
                    </span>
                  {/each}
                </div>
                {#if org.communityId}
                  <div class="text-sm text-gray-600">
                    Community: {org.communityId}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    <!-- User Groups -->
    <!--
    <div class="bg-white rounded-lg shadow-lg p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-semibold">Your Groups</h2>
        <div class="flex gap-2">
          <a 
            href="/groups/create"
            class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Create Group
          </a>
          <button
            on:click={() => revealedSections.add('createInvite')}
            class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Create Invite
          </button>
        </div>
      </div>

      {#if revealedSections.has('createInvite')}
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 class="text-lg font-semibold mb-4">Create Group Invite</h3>
          <form on:submit|preventDefault={async () => {
            try {
              const invite = await createGroupInvite($ndk, selectedGroupId, {
                expiresIn: inviteExpiration ? 86400 : undefined,
                maxUses: inviteMaxUses || undefined
              });
              inviteCode = invite.code;
              error = null;
            } catch (err) {
              error = err.message;
            }
          }}>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Select Group
                </label>
                <select
                  bind:value={selectedGroupId}
                  class="w-full rounded-md border border-gray-300 p-2"
                  required
                >
                  <option value="">Choose a group...</option>
                  {#each userGroups as group}
                    <option value={group.id}>{group.name}</option>
                  {/each}
                </select>
              </div>

              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="expiration"
                  bind:checked={inviteExpiration}
                  class="rounded border-gray-300"
                />
                <label for="expiration" class="text-sm text-gray-700">
                  Expires in 24 hours
                </label>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Uses
                </label>
                <input
                  type="number"
                  bind:value={inviteMaxUses}
                  min="1"
                  class="w-full rounded-md border border-gray-300 p-2"
                  placeholder="Unlimited"
                />
              </div>

              <button
                type="submit"
                class="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Generate Invite
              </button>
            </div>
          </form>

          {#if inviteCode}
            <div class="mt-4 p-4 bg-white rounded border">
              <p class="text-sm font-medium text-gray-700 mb-2">Invite Code:</p>
              <div class="flex items-center gap-2">
                <code class="flex-1 p-2 bg-gray-100 rounded">{inviteCode}</code>
                <button
                  on:click={() => {
                    navigator.clipboard.writeText(inviteCode);
                    copied = true;
                    setTimeout(() => copied = false, 2000);
                  }}
                  class="text-purple-600 hover:text-purple-700"
                >
                  {#if copied}
                    Copied!
                  {:else}
                    Copy
                  {/if}
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}
      
      {#if loading}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      {:else if userGroups.length === 0}
        <p class="text-gray-600 text-center py-8">You're not a member of any groups yet.</p>
      {:else}
        <div class="space-y-6">
          {#each userGroups as group}
            <div class="border rounded-lg p-4 hover:bg-gray-50">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-xl font-semibold">{group.name}</h3>
                  {#if group.about}
                    <p class="text-gray-600 mt-1">{group.about}</p>
                  {/if}
                  <div class="mt-2 flex gap-4 text-sm text-gray-500">
                    <span>{group.memberCount || 0} members</span>
                    <span>{group.adminCount || 0} admins</span>
                    <span>{group.isPrivate ? 'Private' : 'Public'}</span>
                    <span>{group.isClosed ? 'Closed' : 'Open'}</span>
                  </div>
                </div>
                {#if group.picture}
                  <img 
                    src={group.picture} 
                    alt={group.name}
                    class="w-16 h-16 rounded-lg object-cover"
                  />
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    -->
  </div>
</div>
