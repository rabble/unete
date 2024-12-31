import { writable, get } from 'svelte/store';
import { ndk, initializeNDK } from './stores/ndk';
import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { userProfile } from './stores/userProfile';

// Add this type declaration
declare global {
  interface Window {
    nostrLogin: {
      getUserInfo: () => any;
      getCurrentUser: () => any;
    }
  }
}

// Get initial state from localStorage if available
const storedSession = typeof localStorage !== 'undefined' 
  ? localStorage.getItem('nostr-session')
  : null;

const initialAuthState = storedSession 
  ? {
      isLoggedIn: true,
      userInfo: JSON.parse(storedSession),
      checkingLogin: false
    }
  : {
      isLoggedIn: false,
      userInfo: null,
      checkingLogin: false
    };

// Create auth store with initial state
export const authStore = writable(initialAuthState);

// Log auth store changes
authStore.subscribe(state => {
  console.log('Auth store updated:', state);
});

// Check login status after a short delay to allow extension to load
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      await checkLoginStatus();
    } catch (error) {
      console.error('Error checking login status after page load:', error);
    }
  }, 500); // 500ms delay to allow extension to initialize
}

// Check login status
export async function checkLoginStatus() {
  try {
    // Ensure NDK is initialized
    let ndkInstance = get(ndk);
    if (!ndkInstance) {
      ndkInstance = await initializeNDK();
      if (!ndkInstance) {
        throw new Error('Failed to initialize NDK');
      }
    }

    // Wait for window.nostr to be available
    if (typeof window !== 'undefined' && !window.nostr) {
      await new Promise(resolve => {
        const checkNostr = () => {
          if (window.nostr) {
            resolve(true);
          } else {
            setTimeout(checkNostr, 100);
          }
        };
        checkNostr();
      });
    }
    
    // If no stored session, check with nostr extension
    if (window.nostr) {
      const pubkey = await window.nostr.getPublicKey();
      if (pubkey) {
        // Set up NDK signer if logged in
        const signer = new NDKNip07Signer();
        ndkInstance.signer = signer;
        
        // Wait for signer to be ready
        await signer.blockUntilReady();
        
        // Get user and store in userProfile
        const user = await signer.user();
        if (user?.pubkey) {
          await user.fetchProfile();
          userProfile.set(user);
          localStorage.setItem('userProfile', user.pubkey);
          return true;
        }
      }
    }
    
    // Clear profile if not logged in
    userProfile.set(null);
    localStorage.removeItem('userProfile');
    return false;
    
  } catch (error) {
    console.error('Error checking login status:', error);
    userProfile.set(null);
    localStorage.removeItem('userProfile');
    return false;
  }
}

// Handle login with debounce
let loginAttemptTimeout: NodeJS.Timeout;
export async function handleLogin() {
  if (typeof document === 'undefined') return;

  // Clear any pending login attempts
  if (loginAttemptTimeout) {
    clearTimeout(loginAttemptTimeout);
  }
  
  loginAttemptTimeout = setTimeout(async () => {
    const isLoggedIn = await checkLoginStatus();
    if (!isLoggedIn) {
      document.dispatchEvent(new CustomEvent('nlLaunch', { 
        detail: {
          startScreen: 'welcome-login'
        }
      }));
    }
  }, 100);
}

// Listen for auth events (browser only)
if (typeof document !== 'undefined') {
  document.addEventListener('nlAuth', async (e: CustomEvent) => {
    const { type } = e.detail;
    
    if (type === 'login' || type === 'signup') {
      await checkLoginStatus(); // This will update userProfile
    } else if (type === 'logout') {
      userProfile.set(null);
      localStorage.removeItem('userProfile');
    }
  });
}
