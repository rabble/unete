import NDK, { NDKNip07Signer } from '@nostr-dev-kit/ndk';

export async function initNostrLogin() {
  if (typeof window === 'undefined') return;

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
      const ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.nos.social',
          'wss://relay.damus.io',
          'wss://relay.nostr.band',
        ],
        signer: new NDKNip07Signer(),
      });
      ndk.connect();
    }
  });
}
