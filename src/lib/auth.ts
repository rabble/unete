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

// Create auth store
export const authStore = writable({
  isLoggedIn: false,
  userInfo: null,
  checkingLogin: false
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
    const userInfo = window.nostrLogin?.getCurrentUser();
    const isLoggedIn = !!userInfo;
    
    if (isLoggedIn) {
      // Set up NDK signer if logged in
      ndk.signer = new NDKNip07Signer();
      await ndk.connect();
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
    return false;
  }
}

// Handle login with debounce
let loginAttemptTimeout: NodeJS.Timeout;
export async function handleLogin() {
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

// Listen for auth events
document.addEventListener('nlAuth', (e: CustomEvent) => {
  const { type } = e.detail;
  
  if (type === 'login' || type === 'signup') {
    const userInfo = window.nostr.getUserInfo();
    authStore.set({
      isLoggedIn: true,
      userInfo
    });
  } else if (type === 'logout') {
    authStore.set({
      isLoggedIn: false,
      userInfo: null
    });
  }
});