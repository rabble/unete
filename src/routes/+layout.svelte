<script lang="ts">
  declare global {
    interface Window {
      nostrLogin: {
        getUserInfo: () => any;
        getCurrentUser: () => any;
      }
    }
  }

  import { i18n } from "$lib/i18n";
  import { ParaglideJS } from "@inlang/paraglide-sveltekit";
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { setContext } from 'svelte';
  import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
  import { ndkState as ndk, ensureConnection, initializeNDK, ndkConnected } from '$lib/stores/ndk';
  import '../app.css';
  import { browser } from '$app/environment';
  
  let isLoggedIn = false;
  let profile;
  
  // Make login function available to all pages
  setContext('login', login);

  onMount(async () => {
    if (browser) {
      try {
        // Initialize NDK first
        await initializeNDK();

        // Listen for nostr-login auth events
        document.addEventListener('nlAuth', async (event: CustomEvent) => {
          const { detail } = event;
          console.log('nostr-login auth event:', detail);
          
          // Update NDK signer when nostr-login provides one
          if (detail?.signer) {
            ndk.signer = detail.signer;
            ndkSigner.set(detail.signer);
            console.log('NDK signer updated from nostr-login');
          }
        });

      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    }
  });

  async function login() {
    try {
      if (browser) {
        // Launch nostr-login dialog with signup screen
        const { launch } = await import('nostr-login');
        launch({
          startScreen: 'signup'
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert(error.message);
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
                <a href="/add-organization" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Add Organization</a>
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
                <a href="/dashboard" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  {isLoggedIn ? 'Dashboard' : 'Login'}
                </a>
              </div>
            </div>
          </div>
          
          <!-- Right side navigation items -->
          <div class="flex items-center">
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
        <a href="/add-organization" class="text-gray-400 hover:text-gray-500">Add Organization</a>
      </div>
    </div>
  </footer>

  <!-- Debug Info -->
  <div class="bg-gray-100 border-t border-gray-200 p-4 mt-8">
    <div class="max-w-7xl mx-auto">
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
            <p>NDK Instance: <span class="font-mono">{Boolean($ndk) ? 'Created' : 'Not Created'}</span></p>
            <p>NDK Connected: <span class="font-mono">{$ndkConnected ? 'Yes' : 'No'}</span></p>
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
                <p class="text-sm">Extension Public Key: <span class="font-mono">{result || 'None'}</span></p>
              {/if}
            {/await}
          </div>
        {/if}

        <!-- Nostr Login Status -->
        {#if browser && window.nostrLogin}
          <div class="mb-4 pt-4 border-t">
            <h4 class="font-medium mb-2">Nostr Login Status:</h4>
            {#await window.nostrLogin.getCurrentUser().catch(e => ({error: e}))}
              <p class="text-sm">Checking current user...</p>
            {:then result}
              {#if result?.error}
                <p class="text-sm text-red-500">Error getting current user: {result.error.message}</p>
              {:else}
                <p class="text-sm">Current User: <span class="font-mono">{JSON.stringify(result)}</span></p>
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
        {:else}
          <div class="text-gray-500 pt-4 border-t">
            <p>No NDK signer available. User info will appear here when logged in.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
