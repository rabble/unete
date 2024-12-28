import NDK, { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { ndk } from '$lib/stores/ndk';

export async function initNostrLogin() {
  if (typeof window === 'undefined') return;

  // Check if already logged in via Nostr extension
  if (window.nostr) {
    try {
      const pubkey = await window.nostr.getPublicKey();
      if (pubkey) {
        // Already logged in, initialize NDK with current signer
        ndk.set(new NDK({
          explicitRelayUrls: [
            'wss://relay.nos.social',
            'wss://relay.damus.io',
            'wss://relay.nostr.band',
          ],
          signer: new NDKNip07Signer(),
        }));
        
        // Connect the NDK instance
        const ndkInstance = ndk.get();
        if (ndkInstance) {
          await ndkInstance.connect();
        }
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
