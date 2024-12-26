<script lang="ts">
  import { NDKUser } from '@nostr-dev-kit/ndk';
  import { onMount } from 'svelte';
  import { NDKSvelte } from '@nostr-dev-kit/ndk-svelte';

  let ndk: NDKSvelte;
  let user: NDKUser | undefined;
  let isLoggedIn = false;

  onMount(() => {
    ndk = new NDKSvelte({
      explicitRelayUrls: [
        'wss://relay.damus.io',
        'wss://relay.nostr.band'
      ]
    });
  });

  async function login() {
    try {
      await ndk.connect();
      user = await ndk.signer?.user();
      if (user) {
        isLoggedIn = true;
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  }
</script>

<main class="container">
  <h1>Nostr Login Demo</h1>
  
  {#if isLoggedIn && user}
    <div class="logged-in">
      <h2>Welcome!</h2>
      <p>You are logged in with public key: {user.npub}</p>
    </div>
  {:else}
    <button on:click={login} class="login-button">
      Login with Nostr
    </button>
  {/if}
</main>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
  }

  .login-button {
    background-color: #4CAF50;
    border: none;
    color: white;
    padding: 15px 32px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    margin: 4px 2px;
    cursor: pointer;
    border-radius: 4px;
  }

  .logged-in {
    margin-top: 2rem;
    padding: 1rem;
    background-color: #f0f0f0;
    border-radius: 8px;
  }
</style>
