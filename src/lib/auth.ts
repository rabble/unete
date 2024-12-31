import { writable } from 'svelte/store';
import { ndk } from './stores/ndk';
import { NDKNip07Signer } from '@nostr-dev-kit/ndk';

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

// Check login status
export async function checkLoginStatus() {
  // Prevent multiple simultaneous checks
  let currentState;
  authStore.subscribe(state => currentState = state)();
  
  if (currentState.checkingLogin) {
    return currentState.isLoggedIn;
  }

  authStore.update(s => ({ ...s, checkingLogin: true }));
  
  try {
    // First check localStorage for existing session
    const storedSession = localStorage.getItem('nostr-session');
    let userInfo = storedSession ? JSON.parse(storedSession) : null;
    
    // If no stored session, check with nostrLogin
    if (!userInfo) {
      userInfo = window.nostrLogin?.getCurrentUser();
    }

    const isLoggedIn = !!userInfo;
    
    if (isLoggedIn) {
      // Persist session to localStorage
      localStorage.setItem('nostr-session', JSON.stringify(userInfo));
      
      // Set up NDK signer if logged in
      ndk.signer = new NDKNip07Signer();
      await ndk.connect();
    } else {
      // Clear any existing session
      localStorage.removeItem('nostr-session');
    }
    
    authStore.set({
      isLoggedIn,
      userInfo,
      checkingLogin: false
    });
    
    return isLoggedIn;
  } catch (error) {
    console.error('Error checking login status:', error);
    authStore.set({
      isLoggedIn: false,
      userInfo: null,
      checkingLogin: false
    });
    localStorage.removeItem('nostr-session');
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
  
  // Debounce login attempt
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
  document.addEventListener('nlAuth', (e: CustomEvent) => {
    const { type } = e.detail;
    
    if (type === 'login' || type === 'signup') {
      const userInfo = window.nostr.getUserInfo();
      // Persist session to localStorage
      localStorage.setItem('nostr-session', JSON.stringify(userInfo));
      authStore.set({
        isLoggedIn: true,
        userInfo
      });
    } else if (type === 'logout') {
      // Clear session from localStorage
      localStorage.removeItem('nostr-session');
      authStore.set({
        isLoggedIn: false,
        userInfo: null
      });
    }
  });
}
