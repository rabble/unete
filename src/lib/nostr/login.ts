import NDK, { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { ndk } from '$lib/stores/ndk';

export async function initNostrLogin() {
  if (typeof window === 'undefined') return;

  // Check if already logged in via Nostr extension
  if (window.nostr) {
    try {
      const pubkey = await window.nostr.getPublicKey();
      if (pubkey) {
        console.log('Found existing Nostr pubkey:', pubkey);
        
        // Create NDK instance with NIP-07 signer and user
        const signer = new NDKNip07Signer();
        const ndkInstance = new NDK({
          explicitRelayUrls: [
            'wss://relay.nos.social',
            'wss://relay.damus.io',
            'wss://relay.nostr.band',
          ],
          signer
        });
         
        // Set the user explicitly
        await signer.user().then(user => {
          ndkInstance.signer = signer;
          ndkInstance.activeUser = user;
        });

        // Connect before setting the store
        await ndkInstance.connect();
        console.log('NDK connected successfully');

        // Verify signer is working
        const signer = await ndkInstance.signer?.user();
        if (signer?.pubkey !== pubkey) {
          throw new Error('Signer pubkey mismatch');
        }
        
        // Set the connected instance to the store
        ndk.set(ndkInstance);
        return;
      }
    } catch (e) {
      console.log('Not logged in via Nostr extension:', e);
    }
  }

  // If not logged in, initialize nostr-login component
  const { init: initNostrLogin } = await import('nostr-login');
  initNostrLogin({
    startScreen: 'welcome-login',
    noBanner: true,
    theme: 'purple',
    'data-skip-if-logged-in': 'true'
  });

  // Listen for auth events
  document.addEventListener('nlAuth', (e) => {
    if (e.detail.type === 'login' || e.detail.type === 'signup') {
      const ndkInstance = new NDK({
        explicitRelayUrls: [
          'wss://relay.nos.social',
          'wss://relay.damus.io',
          'wss://relay.nostr.band',
        ],
        signer: new NDKNip07Signer(),
      });
      ndk.set(ndkInstance);
      ndkInstance.connect();
    }
  });
}
