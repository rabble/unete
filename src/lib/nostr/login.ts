import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { ndk, ndkSigner } from '$lib/stores/ndk';
import { get } from 'svelte/store';

export async function initNostrLogin() {
  if (typeof window === 'undefined') return;

  try {
    // Check if already logged in via Nostr extension
    if (window.nostr) {
      await window.nostr.waitReady?.();
      
      const pubkey = await window.nostr.getPublicKey();
      if (pubkey) {
        console.log('Found existing Nostr pubkey:', pubkey);
        
        const ndkInstance = get(ndk);
        if (!ndkInstance) {
          throw new Error('NDK not initialized');
        }

        // Set up NIP-07 signer
        const signer = new NDKNip07Signer();
        await signer.blockUntilReady();
        
        // Verify signer
        const user = await signer.user();
        if (!user?.pubkey || user.pubkey !== pubkey) {
          throw new Error('Signer verification failed');
        }

        ndkInstance.signer = signer;
        ndkSigner.set(signer);
        
        // Fetch and cache the user profile
        await user.fetchProfile();
        console.log('NDK signer initialized with pubkey:', user.pubkey);
        
        // Import and update user profile store
        const { userProfile } = await import('$lib/stores/userProfile');
        userProfile.set(user);
      }
    }
  } catch (e) {
    console.error('Nostr login error:', e);
    throw e;
  }
}
