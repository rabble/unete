import { writable, derived } from 'svelte/store';
import { ndk } from './ndk';
import type { NDKUser } from '@nostr-dev-kit/ndk';

export const userProfile = writable<NDKUser | null>(null);

export const isLoggedIn = derived(
  [ndk, userProfile],
  ([$ndk, $userProfile]) => {
    return !!($ndk?.signer && $userProfile?.pubkey);
  }
);

export async function fetchUserProfile() {
  const ndkInstance = ndk.get();
  if (!ndkInstance?.signer) return null;
  
  try {
    const user = await ndkInstance.signer.user();
    if (user?.pubkey) {
      await user.fetchProfile();
      userProfile.set(user);
      return user;
    }
  } catch (e) {
    console.error('Error fetching user profile:', e);
  }
  
  return null;
}
