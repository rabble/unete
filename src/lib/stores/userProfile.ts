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
  ([$ndk, $userProfile, $loginState], set) => {
    // Only run in browser
    if (typeof window === 'undefined') {
      set(false);
      return;
    }

    // Check if we have a signer and valid user
    const checkLogin = async () => {
      try {
        if ($ndk?.signer) {
          const user = await $ndk.signer.user();
          
          if (user?.pubkey) {
            // Check both storage locations for compatibility
            const storedPubkey = localStorage.getItem('userProfile');
            const storedSession = localStorage.getItem('nostr-session');
            const sessionData = storedSession ? JSON.parse(storedSession) : null;
            
            // Valid if either storage location matches
            const validLogin = storedPubkey === user.pubkey || 
                             sessionData?.pubkey === user.pubkey;
            
            if (validLogin !== $loginState) {
              loginState.set(validLogin);
            }
            
            set(validLogin);
            return;
          }
        }
        
        // If we get here, we're not logged in
        set(false);
        if ($loginState) {
          loginState.set(false);
        }
      } catch (error) {
        console.error('Error checking login state:', error);
        set(false);
        if ($loginState) {
          loginState.set(false);
        }
      }
    };

    // Initial check
    checkLogin();
    
    // Set up periodic checks every 5 seconds
    const interval = setInterval(checkLogin, 5000);
    
    // Cleanup interval on destroy
    return () => clearInterval(interval);
  },
  false // Initial value
);

export async function checkExistingNostrLogin() {
  if (typeof localStorage === 'undefined') return false;
  
  const storedPubkey = localStorage.getItem('userProfile');
  if (!storedPubkey) return false;
  
  const ndkInstance = get(ndkStore);
  if (!ndkInstance) return false;
  
  try {
    // Initialize signer if window.nostr exists
    if (window.nostr && !ndkInstance.signer) {
      ndkInstance.signer = new NDKNip07Signer();
    }
    
    if (ndkInstance.signer) {
      const user = await ndkInstance.signer.user();
      if (user?.pubkey === storedPubkey) {
        await user.fetchProfile();
        userProfile.set(user);
        loginState.set(true);
        return true;
      }
    }
  } catch (e) {
    console.error('Error checking existing Nostr login:', e);
  }
  
  // If we get here, clear invalid login state
  loginState.set(false);
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('userProfile');
  }
  return false;
}

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
