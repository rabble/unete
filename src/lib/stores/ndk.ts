import { writable } from 'svelte/store';
import NDK from '@nostr-dev-kit/ndk';

// Create NDK instance
const ndk = new NDK({
  explicitRelayUrls: [
    'wss://relay.nos.social',
    'wss://relay.damus.io',
    'wss://relay.nostr.band'
  ]
});

// Create a store for connection status
export const ndkConnected = writable(false);

import { get } from 'svelte/store';

// Function to ensure connection
export async function ensureConnection() {
  if (!get(ndkConnected)) {
    try {
      await ndk.connect();
      ndkConnected.set(true);
    } catch (error) {
      console.error('Failed to connect to relays:', error);
      // Try to reconnect on failure
      setTimeout(ensureConnection, 5000);
    }
  }
}

// Export NDK instance
export { ndk };
