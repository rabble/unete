import { ndk, ensureConnection } from '$lib/stores/ndk';
import { NDKEvent } from '@nostr-dev-kit/ndk';

// Admin list kind (30000-32000 range for addressable events)
export const ADMIN_LIST = 31314;

// Default admin
export const DEFAULT_ADMIN = "npub1wmr34t36fy03m8hvgl96zl3znndyzyaqhwmwdtshwmtkg03fetaqhjg240";

export async function isAdmin(pubkey: string): Promise<boolean> {
  await ensureConnection();
  if (pubkey === DEFAULT_ADMIN) {
    return true;
  }

  // Try to fetch admin list
  const adminEvents = await ndk.fetchEvents({
    kinds: [ADMIN_LIST],
    authors: [DEFAULT_ADMIN], // Only the default admin can create admin lists
    limit: 1
  });

  const adminEvent = Array.from(adminEvents)[0];
  if (!adminEvent) {
    return pubkey === DEFAULT_ADMIN;
  }

  try {
    const adminList = JSON.parse(adminEvent.content);
    return adminList.admins.includes(pubkey);
  } catch (e) {
    console.error('Failed to parse admin list:', e);
    return pubkey === DEFAULT_ADMIN;
  }
}

export async function addAdmin(newAdminPubkey: string): Promise<NDKEvent> {
  await ensureConnection();
  if (!ndk.signer) {
    throw new Error('NDK signer required');
  }

  const signerPubkey = await ndk.signer.user().then(user => user.pubkey);
  if (signerPubkey !== DEFAULT_ADMIN) {
    throw new Error('Only the default admin can add new admins');
  }

  // Fetch current admin list or create new one
  const adminEvents = await ndk.fetchEvents({
    kinds: [ADMIN_LIST],
    authors: [DEFAULT_ADMIN],
    limit: 1
  });

  const existingEvent = Array.from(adminEvents)[0];
  let currentAdmins: string[] = [];

  if (existingEvent) {
    try {
      const content = JSON.parse(existingEvent.content);
      currentAdmins = content.admins;
    } catch (e) {
      console.error('Failed to parse existing admin list:', e);
    }
  }

  // Add new admin if not already in list
  if (!currentAdmins.includes(newAdminPubkey)) {
    currentAdmins.push(newAdminPubkey);
  }

  // Create new event
  const event = new NDKEvent(ndk);
  event.kind = ADMIN_LIST;
  event.content = JSON.stringify({ admins: currentAdmins });
  event.tags = [['d', 'allofus.directory.admins']];

  await event.publish();
  return event;
}
