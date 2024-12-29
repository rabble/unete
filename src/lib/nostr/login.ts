import NDK, { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { ndk } from '$lib/stores/ndk';

export async function initNostrLogin() {
  if (typeof window === 'undefined') return;

  // Check if already logged in via Nostr extension
  if (window.nostr) {
    try {
      // First ensure nostr object is ready
      await window.nostr.waitReady?.();
      
      const pubkey = await window.nostr.getPublicKey();
      if (pubkey) {
        console.log('Found existing Nostr pubkey:', pubkey);
        
        // Wait for nostr-login to initialize NDK with timeout
        await new Promise<void>((resolve, reject) => {
          const maxAttempts = 150; // 15 seconds total
          let attempts = 0;
          
          const checkNDK = async () => {
            const ndkInstance = ndk.get();
            attempts++;
            
            if (ndkInstance?.signer) {
              try {
                // Wait for NIP-04 capability
                const nip04Promise = new Promise<void>((resolveNip04, rejectNip04) => {
                  const checkNip04 = () => {
                    if (ndkInstance.signer?.nip04) {
                      console.log('NIP-04 support verified');
                      resolveNip04();
                    } else if (attempts >= maxAttempts) {
                      rejectNip04(new Error('Timeout waiting for NIP-04 support'));
                    } else {
                      setTimeout(checkNip04, 100);
                    }
                  };
                  checkNip04();
                });
                
                await nip04Promise;
                
                // Verify pubkey matches
                const user = await ndkInstance.signer.user();
                if (user?.pubkey === pubkey) {
                  console.log('NDK initialized with verified signer');
                  resolve();
                  return;
                }
                console.warn('NDK signer pubkey mismatch');
              } catch (err) {
                console.error('NDK signer verification error:', err);
              }
              
              if (attempts >= maxAttempts) {
                reject(new Error('NDK signer verification failed'));
              } else {
                setTimeout(checkNDK, 100);
              }
            } else if (attempts >= maxAttempts) {
              reject(new Error('NDK initialization timeout'));
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
