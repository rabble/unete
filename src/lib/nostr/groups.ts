import { ndk } from '$lib/stores/ndk';
import NDK, { NDKEvent, NDKUser, NDKFilter } from '@nostr-dev-kit/ndk';
import { NostrClient, GroupEventKind } from './client';
import { SignerRequiredError, ValidationError, PublishError } from './errors';
import { 
  GROUP_MEMBERS, 
  GROUP_ADMINS, 
  GROUP_CREATE_INVITE, 
  GROUP_JOIN,
  GROUP_METADATA 
} from './kinds';

export interface GroupContent {
  name: string;
  about?: string;
  picture?: string;
  isPrivate?: boolean;
  isClosed?: boolean;
}

export interface GroupMetadata {
  id: string;
  name: string;
  about?: string;
  picture?: string;
  isPrivate: boolean;
  isClosed: boolean;
  memberCount?: number;
  adminCount?: number;
}

export interface GroupInvite {
  code: string;
  groupId: string;
  createdAt: number;
  expiresAt?: number;
  maxUses?: number;
  useCount?: number;
}

/**
 * Fetch all groups the current user is a member of
 */
export async function getUserGroups(ndk: NDK): Promise<GroupMetadata[]> {
  if (!ndk?.signer) {
    throw new SignerRequiredError();
  }

  const user = await ndk.signer.user();
  
  // Get groups where user is a member
  const memberFilter: NDKFilter = {
    kinds: [GROUP_MEMBERS],
    '#p': [user.pubkey]
  };

  // Get groups where user is an admin
  const adminFilter: NDKFilter = {
    kinds: [GROUP_ADMINS],
    '#p': [user.pubkey]
  };

  // Get all group memberships
  const memberEvents = await ndk.fetchEvents([memberFilter, adminFilter]);
  const groupIds = new Set<string>();
  
  // Extract unique group IDs from d tags
  for (const event of memberEvents) {
    const dTag = event.tags.find(t => t[0] === 'd');
    if (dTag?.[1]) groupIds.add(dTag[1]);
  }

  // Fetch metadata for each group
  const groups: GroupMetadata[] = [];
  for (const id of groupIds) {
    const metadata = await getGroupMetadata(ndk, id);
    if (metadata) groups.push(metadata);
  }

  return groups;
}

/**
 * Get metadata for a specific group
 */
export async function getGroupMetadata(ndk: NDK, groupId: string): Promise<GroupMetadata | null> {
  // console.log('Getting metadata for group:', groupId);
  
  try {
    // Fetch the group metadata event directly
    const metadataEvent = await ndk.fetchEvent({
      kinds: [GROUP_METADATA],
      '#d': [groupId]
    });

    if (!metadataEvent) {
      console.log('No metadata event found for group:', groupId);
      return null;
    }

    // // Add debugging for the metadata event
    // console.log('Raw metadata event:', {
    //   id: metadataEvent.id,
    //   pubkey: metadataEvent.pubkey,
    //   kind: metadataEvent.kind,
    //   tags: metadataEvent.tags,
    //   content: metadataEvent.content
    // });

    // Try to get metadata from content first, then fall back to tags
    let metadataContent;
    try {
      if (metadataEvent.content) {
        metadataContent = JSON.parse(metadataEvent.content);
        // console.log('Parsed metadata from content:', metadataContent);
      } else {
        // Extract metadata from tags
        // console.log('Content empty, extracting from tags:', metadataEvent.tags);
        metadataContent = {
          name: metadataEvent.tags.find(t => t[0] === 'name')?.[1] || 'Unnamed Group',
          about: metadataEvent.tags.find(t => t[0] === 'about')?.[1],
          picture: metadataEvent.tags.find(t => t[0] === 'picture')?.[1]
        };
        // console.log('Extracted metadata from tags:', metadataContent);
      }
    } catch (err) {
      // console.error('Failed to parse metadata:', err);
      // console.error('Raw event:', metadataEvent);
      return null;
    }

    // Get member and admin counts
    const [memberEvents, adminEvents] = await Promise.all([
      ndk.fetchEvents({
        kinds: [GROUP_MEMBERS],
        '#d': [groupId]
      }),
      ndk.fetchEvents({
        kinds: [GROUP_ADMINS],
        '#d': [groupId]
      })
    ]);

    // Parse metadata
    const result: GroupMetadata = {
      id: groupId,
      name: metadataContent.name || 'Unnamed Group',
      about: metadataContent.about,
      picture: metadataContent.picture,
      isPrivate: !!metadataEvent.tags.find(t => t[0] === 'private'),
      isClosed: !!metadataEvent.tags.find(t => t[0] === 'closed'),
      memberCount: memberEvents.size,
      adminCount: adminEvents.size
    };

    return result;
  } catch (error) {
    // console.error('Error fetching group metadata:', error);
    return null;
  }
}

/**
 * Check if a user is a member of a group
 */
export async function isGroupMember(ndk: NDK, groupId: string, pubkey: string): Promise<boolean> {
  const memberEvent = await ndk.fetchEvent({
    kinds: [GROUP_MEMBERS],
    '#d': [groupId]
  });

  if (!memberEvent) return false;
  return !!memberEvent.tags.find(t => t[0] === 'p' && t[1] === pubkey);
}

/**
 * Check if a user is an admin of a group
 */
export async function isGroupAdmin(ndk: NDK, groupId: string, pubkey: string): Promise<boolean> {
  const adminEvent = await ndk.fetchEvent({
    kinds: [GROUP_ADMINS],
    '#d': [groupId]
  });

  if (!adminEvent) return false;
  return !!adminEvent.tags.find(t => t[0] === 'p' && t[1] === pubkey);
}

function validateGroupContent(content: GroupContent): void {
  if (!content.name?.trim()) {
    throw new ValidationError('Group name is required');
  }
  if (content.name.length < 3) {
    throw new ValidationError('Group name must be at least 3 characters');
  }
  if (content.name.length > 100) {
    throw new ValidationError('Group name must be less than 100 characters');
  }
  
  if (content.picture) {
    try {
      new URL(content.picture);
    } catch {
      throw new ValidationError('Invalid picture URL');
    }
  }
}

export async function createGroupInvite(
  ndk: NDK,
  groupId: string,
  options?: {
    expiresIn?: number;  // Duration in seconds
    maxUses?: number;    // Maximum number of times invite can be used
  }
): Promise<GroupInvite> {
  if (!ndk?.signer) {
    throw new SignerRequiredError();
  }

  // Verify user is an admin
  const isAdmin = await isGroupAdmin(ndk, groupId, (await ndk.signer.user()).pubkey);
  if (!isAdmin) {
    throw new ValidationError('Only group admins can create invites');
  }

  const invite: GroupInvite = {
    code: crypto.randomUUID(),
    groupId,
    createdAt: Math.floor(Date.now() / 1000),
    expiresAt: options?.expiresIn ? Math.floor(Date.now() / 1000) + options.expiresIn : undefined,
    maxUses: options?.maxUses,
    useCount: 0
  };

  // Create invite event
  const inviteEvent = new NDKEvent(ndk);
  inviteEvent.kind = GROUP_CREATE_INVITE;
  inviteEvent.tags = [
    ['d', invite.code],
    ['h', groupId],
    ['created_at', invite.createdAt.toString()]
  ];

  if (invite.expiresAt) {
    inviteEvent.tags.push(['expires_at', invite.expiresAt.toString()]);
  }
  if (invite.maxUses) {
    inviteEvent.tags.push(['max_uses', invite.maxUses.toString()]);
  }

  await inviteEvent.publish();
  return invite;
}

export async function redeemGroupInvite(
  ndk: NDK,
  inviteCode: string
): Promise<boolean> {
  if (!ndk?.signer) {
    throw new SignerRequiredError();
  }

  // Fetch invite event
  const inviteEvent = await ndk.fetchEvent({
    kinds: [GROUP_CREATE_INVITE],
    '#d': [inviteCode]
  });

  if (!inviteEvent) {
    throw new ValidationError('Invalid invite code');
  }

  // Check expiration
  const expiresAt = inviteEvent.tags.find(t => t[0] === 'expires_at')?.[1];
  if (expiresAt && parseInt(expiresAt) < Math.floor(Date.now() / 1000)) {
    throw new ValidationError('Invite code has expired');
  }

  // Check usage limit
  const maxUses = inviteEvent.tags.find(t => t[0] === 'max_uses')?.[1];
  if (maxUses) {
    const useEvents = await ndk.fetchEvents({
      kinds: [GROUP_JOIN],
      '#i': [inviteCode]
    });
    if (useEvents.size >= parseInt(maxUses)) {
      throw new ValidationError('Invite code has reached maximum uses');
    }
  }

  // Get group ID
  const groupId = inviteEvent.tags.find(t => t[0] === 'h')?.[1];
  if (!groupId) {
    throw new ValidationError('Invalid invite: missing group ID');
  }

  // Join the group
  const joinEvent = new NDKEvent(ndk);
  joinEvent.kind = GROUP_JOIN;
  joinEvent.tags = [
    ['h', groupId],
    ['i', inviteCode] // Reference the invite code used
  ];

  await joinEvent.publish();
  return true;
}

export async function createGroup(
  ndk: NDK,
  content: GroupContent,
  identifier: string
): Promise<NDKEvent> {
  try {
    if (!ndk?.signer) {
      throw new SignerRequiredError();
    }

    // Validate content
    validateGroupContent(content);

    // Create a new NDKSimpleGroup instance
    const group = new NDKSimpleGroup(ndk, ndk.pool.relaySet, identifier);

    // Log connected relays before creating group
    console.log('Connected relays before group creation:', 
      Array.from(ndk.pool.relays.values())
        .filter(r => r.connected)
        .map(r => r.url)
    );

    // Create the group and wait for confirmation
    const createEvent = await group.createGroup();
    console.log('Group creation event:', createEvent);
    
    // Log which relay accepted the event
    console.log('Event published to relays:', 
      Array.from(createEvent.relay?.url ? [createEvent.relay.url] : [])
    );

    // Prepare metadata content
    const metadata = {
      name: content.name,
      about: content.about,
      picture: content.picture,
      tags: [
        content.isPrivate ? ['private'] : ['public'],
        content.isClosed ? ['closed'] : ['open']
      ].flat()
    };

    // Set the metadata
    console.log('Setting group metadata:', metadata);
    const metadataEvent = await group.setMetadata(metadata);
    console.log('Raw metadata event:', metadataEvent);
    console.log('Metadata event published to relays:',
      Array.from(metadataEvent.relay?.url ? [metadataEvent.relay.url] : [])
    );

    // Immediately verify the event was published by requesting it
    const verifyEvent = await ndk.fetchEvent({
      ids: [metadataEvent.id]
    });
    
    if (!verifyEvent) {
      console.error('Failed to verify metadata event publication');
      throw new PublishError('Failed to create group: metadata not published');
    }

    console.log('Group metadata publication verified');
    return metadataEvent;
  } catch (error) {
    console.error('Group creation error:', error);
    if (error instanceof ValidationError || error instanceof SignerRequiredError) {
      throw error;
    }
    throw new PublishError(`Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
