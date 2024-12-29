import type NDK from '@nostr-dev-kit/ndk';
import type { NDKEvent } from '@nostr-dev-kit/ndk';
import { COMMUNITY, COMMUNITY_POST_APPROVAL, type CommunityContent } from './kinds';

export async function createCommunity(ndk: NDK, content: CommunityContent, moderators: string[]) {
  if (!ndk?.signer) {
    throw new Error('NDK signer required to create community');
  }

  const event = new ndk.NDKEvent(ndk, {
    kind: COMMUNITY,
    content: JSON.stringify(content),
    tags: [
      ['d', 'allofus.directory'],
      ['name', content.name],
      ['description', content.description],
      ...moderators.map(pubkey => ['p', pubkey, '', 'moderator']),
      ['relay', 'wss://relay.nostr.band', 'requests'],
      ['relay', 'wss://relay.damus.io', 'approvals']
    ]
  });

  await event.publish();
  return event;
}

export async function approveOrganization(
  ndk: NDK, 
  communityEvent: NDKEvent,
  organizationEvent: NDKEvent
) {
  if (!ndk?.signer) {
    throw new Error('NDK signer required to approve organization');
  }

  const approvalEvent = new ndk.NDKEvent(ndk, {
    kind: COMMUNITY_POST_APPROVAL,
    content: JSON.stringify(organizationEvent.rawEvent()),
    tags: [
      ['a', `34550:${communityEvent.pubkey}:allofus.directory`],
      ['e', organizationEvent.id],
      ['p', organizationEvent.pubkey],
      ['k', organizationEvent.kind.toString()]
    ]
  });

  await approvalEvent.publish();
  return approvalEvent;
}

export async function fetchCommunityOrganizations(
  ndk: NDK,
  communityEvent: NDKEvent,
  approvedOnly: boolean = true
) {
  const filter = {
    kinds: [COMMUNITY_POST_APPROVAL],
    '#a': [`34550:${communityEvent.pubkey}:allofus.directory`]
  };

  const approvalEvents = await ndk.fetchEvents(filter);
  const approvedOrgs = new Map<string, NDKEvent>();

  for (const approval of approvalEvents) {
    try {
      const orgEvent = JSON.parse(approval.content);
      approvedOrgs.set(orgEvent.id, new ndk.NDKEvent(ndk, orgEvent));
    } catch (e) {
      console.error('Failed to parse organization event:', e);
    }
  }

  if (!approvedOnly) {
    const pendingOrgs = await ndk.fetchEvents({
      kinds: [ORGANIZATION],
      '#a': [`34550:${communityEvent.pubkey}:allofus.directory`]
    });
    
    for (const org of pendingOrgs) {
      if (!approvedOrgs.has(org.id)) {
        approvedOrgs.set(org.id, org);
      }
    }
  }

  return Array.from(approvedOrgs.values());
}

export async function isCommunityModerator(
  ndk: NDK,
  communityEvent: NDKEvent,
  pubkey: string
): Promise<boolean> {
  const moderators = communityEvent.tags
    .filter(tag => tag[0] === 'p' && tag[3] === 'moderator')
    .map(tag => tag[1]);
  
  return moderators.includes(pubkey);
}
