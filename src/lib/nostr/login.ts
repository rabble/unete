import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { ndk, ndkSigner, ensureConnection } from '$lib/stores/ndk';
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
        
        // Initialize NDK with signer first
        const signer = new NDKNip07Signer();
        await signer.blockUntilReady();
        
        // Verify signer
        const user = await signer.user();
        if (!user?.pubkey || user.pubkey !== pubkey) {
          throw new Error('Signer verification failed');
        }

        // First get NDK instance and ensure it's ready
        const ndkInstance = await ensureConnection();
        if (!ndkInstance) {
          throw new Error('Failed to initialize NDK');
        }

        // Set up signer
        ndkInstance.signer = signer;
        ndkSigner.set(signer);
        
        // Wait for NDK to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          // Now fetch and cache the user profile
          await user.fetchProfile();
          console.log('NDK signer initialized with pubkey:', user.pubkey);
          
          // Import and update user profile store
          const { userProfile } = await import('$lib/stores/userProfile');
          userProfile.set(user);
        } catch (profileError) {
          console.error('Failed to fetch profile:', profileError);
          // Continue anyway since we have the basic user info
        }
      }
    }
  } catch (e) {
    console.error('Nostr login error:', e);
    throw e;
  }
}
