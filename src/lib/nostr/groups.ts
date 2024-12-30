import { ndk } from '$lib/stores/ndk';
import NDK, { NDKEvent, NDKUser, NDKFilter } from '@nostr-dev-kit/ndk';
import { SignerRequiredError, ValidationError, PublishError } from './errors';
import { 
  GROUP_METADATA,
  GROUP_CREATE,
  GROUP_EDIT_METADATA,
  GROUP_ADD_USER,
  GROUP_MEMBERS,
  GROUP_ADMINS
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
  // Fetch group metadata event
  const metadataEvent = await ndk.fetchEvent({
    kinds: [GROUP_METADATA],
    '#d': [groupId]
  });

  if (!metadataEvent) return null;

  // Parse metadata from tags
  const metadata: GroupMetadata = {
    id: groupId,
    name: metadataEvent.tags.find(t => t[0] === 'name')?.[1] || 'Unnamed Group',
    about: metadataEvent.tags.find(t => t[0] === 'about')?.[1],
    picture: metadataEvent.tags.find(t => t[0] === 'picture')?.[1],
    isPrivate: !!metadataEvent.tags.find(t => t[0] === 'private'),
    isClosed: !!metadataEvent.tags.find(t => t[0] === 'closed')
  };

  // Get member count
  const memberEvent = await ndk.fetchEvent({
    kinds: [GROUP_MEMBERS],
    '#d': [groupId]
  });
  if (memberEvent) {
    metadata.memberCount = memberEvent.tags.filter(t => t[0] === 'p').length;
  }

  // Get admin count
  const adminEvent = await ndk.fetchEvent({
    kinds: [GROUP_ADMINS],
    '#d': [groupId]
  });
  if (adminEvent) {
    metadata.adminCount = adminEvent.tags.filter(t => t[0] === 'p').length;
  }

  return metadata;
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

    // Create group with kind:9007
    const createEvent = new NDKEvent(ndk);
    createEvent.kind = GROUP_CREATE;
    createEvent.tags = [
      ['h', identifier]
    ];
    await ndk.publish(createEvent);

    // Set metadata with kind:39000
    const metadataEvent = new NDKEvent(ndk);
    metadataEvent.kind = GROUP_METADATA;
    metadataEvent.tags = [
      ['d', identifier],
      ['name', content.name]
    ];

    if (content.about) metadataEvent.tags.push(['about', content.about]);
    if (content.picture) metadataEvent.tags.push(['picture', content.picture]);
    if (content.isPrivate) metadataEvent.tags.push(['private']);
    else metadataEvent.tags.push(['public']);
    if (content.isClosed) metadataEvent.tags.push(['closed']);
    else metadataEvent.tags.push(['open']);

    await ndk.publish(metadataEvent);

    // Add creator as admin
    const user = await ndk.signer.user();
    const addAdminEvent = new NDKEvent(ndk);
    addAdminEvent.kind = GROUP_ADD_USER;
    addAdminEvent.tags = [
      ['h', identifier],
      ['p', user.pubkey, 'admin']
    ];
    await ndk.publish(addAdminEvent);

    return metadataEvent;

  } catch (error) {
    console.error('Group creation error:', error);
    if (error instanceof ValidationError || error instanceof SignerRequiredError) {
      throw error;
    }
    throw new PublishError(`Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
