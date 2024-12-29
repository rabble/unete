import type NDK from '@nostr-dev-kit/ndk';
import type { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk';

export async function fetchUserContent(ndk: NDK, user: NDKUser) {
  if (!user) return [];
  const postsEvents = await ndk.fetchEvents({
    kinds: [1], // NDKKind.Text
    authors: [user.pubkey],
    limit: 10
  });
  return Array.from(postsEvents);
}

export function getMediaType(url: string): 'image' | 'video' | 'audio' | 'unknown' {
  const extension = url.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
  if (['mp4', 'webm', 'ogg'].includes(extension || '')) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(extension || '')) return 'audio';
  return 'unknown';
}

export function getMediaUrls(content: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg|mp3|wav))/gi;
  return Array.from(content.matchAll(urlRegex), m => m[0]);
}

export async function initializeUser(ndk: NDK): Promise<{
  user: NDKUser | undefined;
  profile: { name?: string; about?: string; picture?: string; } | undefined;
}> {
  if (!ndk?.signer) {
    throw new Error('NDK signer not available');
  }

  const user = await ndk.signer.user();
  if (!user) {
    throw new Error('No user found');
  }

  const profile = await user.fetchProfile();
  return { user, profile };
}
