import { writable, derived, type Writable } from 'svelte/store';
import type { NDKUser } from '@nostr-dev-kit/ndk';

// Create a writable store for NDK instance
export const ndkStore = writable<any>(null);

// Initialize from localStorage if available
const storedProfile = typeof localStorage !== 'undefined' 
  ? localStorage.getItem('userProfile') 
  : null;

export const userProfile = writable<NDKUser | null>(null);

// Subscribe to changes and update localStorage
if (typeof localStorage !== 'undefined') {
  userProfile.subscribe(value => {
    if (value?.pubkey) {
      localStorage.setItem('userProfile', value.pubkey);
    } else {
      localStorage.removeItem('userProfile');
    }
  });
}

export const loginState = writable(false);
export const isLoggedIn = derived(
  [ndkStore, userProfile, loginState],
  ([$ndk, $userProfile, $loginState]) => {
    return $loginState && !!($ndk?.signer && $userProfile?.pubkey);
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
