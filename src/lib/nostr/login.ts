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
        
        // Wait for nostr-login to initialize NDK
        await new Promise<void>((resolve) => {
          const checkNDK = () => {
            const ndkInstance = ndk.get();
            if (ndkInstance?.signer) {
              resolve();
            } else {
              setTimeout(checkNDK, 100);
            }
          };
          checkNDK();
        });
        
        const ndkInstance = ndk.get();
        if (!ndkInstance?.signer) {
          throw new Error('NDK not properly initialized by nostr-login');
        }

        // Verify signer is working with correct pubkey
        const user = await ndkInstance.signer.user();
        if (!user || user.pubkey !== pubkey) {
          console.error('Signer/pubkey mismatch:', {
            signerPubkey: user?.pubkey,
            windowPubkey: pubkey
          });
          throw new Error('NDK signer has incorrect pubkey');
        }
        
        console.log('Using NDK instance from nostr-login with verified signer');
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
      console.log('Nostr login successful, NDK instance should be ready');
    }
  });
}
