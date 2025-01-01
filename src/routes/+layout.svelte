<script lang="ts">

  import { i18n } from "$lib/i18n";
  import { ParaglideJS } from "@inlang/paraglide-sveltekit";
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { setContext } from 'svelte';
  import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
  import { ndkStore as ndk, ndkConnected, initializeNDK, initNostrLogin, ensureConnection } from '$lib/stores/ndk';
  import { isLoggedIn, loginState, checkExistingNostrLogin } from '$lib/stores/userProfile';
  import { checkLoginStatus } from '$lib/auth';
  import '../app.css';
  import { browser } from '$app/environment';
  
  let localLoginState = false;
  let profile;
  let showDebug = false;
  
  async function logout() {
    try {
      if ($ndk) {
        $ndk.signer = undefined;
        loginState.set(false);
        
        // Optional: Clear any cached user data or state
        // You may want to add additional cleanup here
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  // Make login and logout functions available to all pages
  setContext('login', {
    login,
    logout
  });

  onMount(async () => {
    if (!browser) return;

    try {
      // Use the shared NDK instance from the store
      const ndkInstance = await ensureConnection();
      
      // Check for existing login
      await checkExistingNostrLogin();

      // Initial connection check
      const connectedRelays = Array.from(ndkInstance.pool.relays.values())
        .filter(r => r.status === 1);
      ndkConnected.set(connectedRelays.length > 0);

    } catch (err) {
      console.error('Failed to initialize NDK:', err);
      ndkConnected.set(false);
    }
  });

  async function login() {
    try {
      if (!browser) {
        console.log('Login only available in browser environment');
        return;
      }

      console.log('Starting login process...');
      
      const ndkInstance = get(ndk);
      if (!ndkInstance) {
        throw new Error('NDK not initialized');
      }

      console.log('Initializing Nostr login...');
      await initNostrLogin();

      console.log('Checking login status...');
      const isLoggedIn = await checkLoginStatus();

      if (!isLoggedIn) {
        console.log('No existing login found, launching Nostr login UI');
        document.dispatchEvent(new CustomEvent('nlLaunch', {
          detail: {
            startScreen: 'welcome-login'
          }
        }));
      } else {
        console.log('User already logged in');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert(`Login failed: ${error.message}`);
    }
  }
</script>

<div>
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex items-center justify-between flex-1">
          <div class="flex items-center">
            <div class="flex-shrink-0 flex items-center">
              <img src="https://allofus.directory/logo.png" alt="All of Us Logo" class="h-8 w-8 mr-2" />
              <a href="/" class="text-xl font-bold text-purple-600">All of Us Directory</a>
            </div>
          </div>

          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <!-- Organizations Dropdown -->
            <div class="relative group">
              <a href="/organizations" class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-gray-500 group-hover:border-gray-300 group-hover:text-gray-700">
                Organizations
                <svg class="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </a>
              <div class="absolute hidden group-hover:block w-48 bg-white shadow-lg py-2 rounded-md z-50" style="top: 100%; margin-top: -2px;">
                <a href="/organizations" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Search</a>
                <a href="/organizations/add" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Add Organization</a>
                {#if isLoggedIn}
                  <a href="/organizations/manage" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Manage Your Organizations</a>
                {/if}
              </div>
            </div>

            <!-- Topics Dropdown -->
            <div class="relative group">
              <a href="/topics" class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-gray-500 group-hover:border-gray-300 group-hover:text-gray-700">
                Topics
                <svg class="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </a>
              <div class="absolute hidden group-hover:block w-64 bg-white shadow-lg py-2 rounded-md z-50" style="top: 100%; margin-top: -2px;">
                <a href="/topics" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">All Topics</a>
                <div class="border-t border-gray-100 my-1"></div>
                <a href="/topics/climate" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Climate Justice</a>
                <a href="/topics/community" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Community</a>
                <a href="/topics/democracy" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Democracy</a>
                <a href="/topics/economic" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Economic Democracy</a>
                <a href="/topics/feminism" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Feminism</a>
                <a href="/topics/food" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Food</a>
                <a href="/topics/healthcare" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Healthcare</a>
                <a href="/topics/housing" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Housing</a>
                <a href="/topics/immigration" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Immigration</a>
                <a href="/topics/indigenous" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Indigenous</a>
                <a href="/topics/lgbtqia" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">LGBTQIA+</a>
                <a href="/topics/palestine" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Palestine Solidarity</a>
                <a href="/topics/racial" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Racial Justice</a>
                <a href="/topics/reproductive" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Reproductive Justice</a>
                <a href="/topics/workplace" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Workplace Justice</a>
                <a href="/topics/youth" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Youth</a>
              </div>
            </div>

            <!-- Social Media Dropdown -->
            <div class="relative group">
              <a href="/social-media" class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-gray-500 group-hover:border-gray-300 group-hover:text-gray-700">
                Social Media
                <svg class="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </a>
              <div class="absolute hidden group-hover:block w-48 bg-white shadow-lg py-2 rounded-md z-50" style="top: 100%; margin-top: -2px;">
                <!-- Social Media Links will go here -->
              </div>
            </div>

            <!-- About Dropdown -->
            <div class="relative group">
              <a href="/about" class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-gray-500 group-hover:border-gray-300 group-hover:text-gray-700">
                About
                <svg class="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </a>
              <div class="absolute hidden group-hover:block w-48 bg-white shadow-lg py-2 rounded-md z-50" style="top: 100%; margin-top: -2px;">
                <a href="/about" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">About Us</a>
                <a href="/conveners" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Conveners</a>
                <a href="/testimonials" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Testimonials</a>
                <a href="/get-started" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Join All Of Us</a>
                <a href="/contact" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Contact</a>
                {#if $ndk?.signer}
                  {#await $ndk.signer.user()}
                    <!-- Loading state -->
                  {:then user}
                    {#if user?.pubkey}
                      <a 
                        href="/dashboard" 
                        class="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                        on:click|preventDefault={async (e) => {
                          try {
                            // Ensure we're logged in
                            const isLoggedIn = await checkLoginStatus();
                            if (!isLoggedIn) {
                              await login();
                              return;
                            }
                            // If logged in, proceed to dashboard
                            window.location.href = '/dashboard';
                          } catch (error) {
                            console.error('Error navigating to dashboard:', error);
                            alert('Please login using the Nostr extension to access the dashboard');
                          }
                        }}
                      >
                        Dashboard
                      </a>
                    {/if}
                  {:catch error}
                    <div class="text-red-500 text-sm p-2">
                      Error loading user: {error.message}
                    </div>
                  {/await}
                {/if}
              </div>
            </div>
          </div>
          
          <!-- Right side navigation items -->
          <div class="flex items-center">
            {#if $isLoggedIn}
              {#await $ndk.signer.user()}
                <!-- Loading state -->
                <div class="ml-4 flex items-center space-x-2">
                  <div class="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  <div class="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              {:then user}
                <div class="ml-4 flex items-center space-x-2">
                  {#if user.profile?.picture}
                    <img 
                      src={user.profile.picture} 
                      alt="Profile picture" 
                      class="w-8 h-8 rounded-full object-cover"
                    />
                  {:else}
                    <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span class="text-gray-500 text-sm">{user.npub.slice(0, 2)}</span>
                    </div>
                  {/if}
                  <div class="flex flex-col">
                    <span class="text-sm font-medium">
                      {user.profile?.name || user.profile?.displayName || user.npub.slice(0, 16) + '...'}
                    </span>
                    <button 
                      on:click={logout}
                      class="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              {:catch error}
                <div class="ml-4 text-red-500 text-sm">
                  Error loading profile
                </div>
              {/await}
            {/if}
          </div>
        </div>
      </div>
    </div>
  </nav>

  <main>
    <slot></slot>
  </main>

  <footer class="bg-white mt-12 border-t">
    <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
      <div class="flex justify-center space-x-6 md:order-2">
        <a href="/contact" class="text-gray-400 hover:text-gray-500">Contact</a>
        <a href="/organizations/add" class="text-gray-400 hover:text-gray-500">Add Organization</a>
        {#if !$isLoggedIn}
          <button
            on:click={async () => {
              console.log('Login button clicked');
              try {
                await login();
                // Force a page reload to ensure all components update
                window.location.reload();
              } catch (error) {
                console.error('Login error:', error);
                alert(`Login error: ${error.message}`);
              }
            }}
            class="text-gray-400 hover:text-gray-500"
          >
            Login with Nostr
          </button>
        {/if}
      </div>
    </div>
  </footer>

  <!-- Debug Info -->
  <div class="bg-gray-100 border-t border-gray-200 p-4 mt-8">
    <div class="max-w-7xl mx-auto">
      <button
        on:click={() => showDebug = !showDebug}
        class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg mb-4"
        style="display: none;"
      >
        {showDebug ? 'Hide' : 'Show'} Debug Information
      </button>
      
      {#if showDebug}
        <h3 class="text-lg font-semibold mb-2">Debug Information</h3>
        <div class="bg-white rounded-lg shadow p-4">
          <!-- Basic Status -->
          <div class="mb-4">
            <h4 class="font-medium mb-2">System Status:</h4>
            <div class="text-sm space-y-1">
              <p>Browser Environment: <span class="font-mono">{browser ? 'Yes' : 'No'}</span></p>
              <p>window.nostr exists: <span class="font-mono">{browser && window.nostr ? 'Yes' : 'No'}</span></p>
              {#if browser && window.nostr}
                <p>window.nostr.user: <span class="font-mono">{JSON.stringify(window.nostr.user)}</span></p>
              {/if}
              <p>window.nostrLogin exists: <span class="font-mono">{browser && window.nostrLogin ? 'Yes' : 'No'}</span></p>
            </div>
          </div>

          <!-- NDK Status -->
          <div class="mb-4 pt-4 border-t">
            <h4 class="font-medium mb-2">NDK Status:</h4>
            <div class="text-sm space-y-1">
              <p>NDK Instance: <span class="font-mono">{$ndk && $ndk.pool ? 'Created' : 'Not Created'}</span></p>
              <p>NDK Connected: <span class="font-mono">{$ndk && $ndk.pool && $ndkConnected ? 'Yes' : 'No'}</span></p>
              <p>Has NDK Signer: <span class="font-mono">{Boolean($ndk?.signer) ? 'Yes' : 'No'}</span></p>
              {#if $ndk?.signer}
                {#await $ndk.signer.user()}
                  <p>Loading signer user...</p>
                {:then user}
                  <p>Signer NPub: <span class="font-mono">{user.npub}</span></p>
                  <p>Signer Pubkey: <span class="font-mono">{user.pubkey}</span></p>
                {:catch error}
                  <p class="text-red-500">Error loading signer user: {error.message}</p>
                {/await}
              {/if}
            </div>
          </div>

          <!-- Nostr Extension Status -->
          {#if browser && window.nostr}
            <div class="mb-4 pt-4 border-t">
              <h4 class="font-medium mb-2">Nostr Extension:</h4>
              {#await Promise.race([
                window.nostr.getPublicKey(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout getting public key')), 5000)
                )
              ]).catch(e => ({error: e}))}
                <p class="text-sm">Checking public key...</p>
              {:then result}
                {#if result?.error}
                  <p class="text-sm text-red-500">Error getting public key: {result.error.message}</p>
                {:else}
                  <p class="text-sm">Public Key: <span class="font-mono">{result || 'None'}</span></p>
                {/if}
              {/await}
            </div>
          {/if}

          <!-- User Profile -->
          {#if $ndk?.signer}
            {#await $ndk.signer.user()}
              <div class="mb-4 pt-4 border-t">
                <p class="text-sm">Loading user info...</p>
              </div>
            {:then user}
              <div class="mb-4 pt-4 border-t">
                <h4 class="font-medium mb-2">User Profile:</h4>
                {#await user.fetchProfile()}
                  <p class="text-sm">Loading profile data...</p>
                {:then profile}
                  <div class="bg-gray-50 p-2 rounded mt-1 text-sm">
                    <p>Name: <span class="font-mono">{profile?.name || 'Not set'}</span></p>
                    <p>Display Name: <span class="font-mono">{profile?.displayName || 'Not set'}</span></p>
                    <p>NIP-05: <span class="font-mono">{profile?.nip05 || 'Not set'}</span></p>
                    <p>About: <span class="font-mono">{profile?.about || 'Not set'}</span></p>
                  </div>
                {:catch error}
                  <p class="text-sm text-red-500">Error loading profile: {error.message}</p>
                {/await}
              </div>
            {:catch error}
              <div class="mb-4 pt-4 border-t">
                <p class="text-sm text-red-500">Error loading user: {error.message}</p>
              </div>
            {/await}
          {:else if !$isLoggedIn}
            <div class="text-gray-500 pt-4 border-t">
              <p class="mb-4">Not logged in. User info will appear here when logged in.</p>
              <button
                on:click={login}
                class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                Connect with Nostr
              </button>
            </div>
          {:else}
            <div class="text-gray-500 pt-4 border-t">
              <p class="mb-4">Loading user information...</p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
