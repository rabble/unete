import { ndk, ensureConnection, getCachedEvents } from '$lib/stores/ndk';
import NDK, { NDKEvent, NDKSimpleGroup } from '@nostr-dev-kit/ndk';
import { ORGANIZATION, ORGANIZATION_TAGS } from './kinds';
import type { OrganizationContent } from '../types';
import { SignerRequiredError, ValidationError, PublishError } from './errors';

function validateAndFormatUrl(url: string): string {
  const urlPattern = /^https?:\/\//i;
  if (!urlPattern.test(url)) {
    return `https://${url}`;
  }
  return url;
}

function validateOrganizationContent(content: OrganizationContent): void {
  // Required string fields
  const requiredStrings = {
    name: 'Organization name',
    category: 'Organization category',
    description: 'Organization description'
  } as const;

  for (const [field, label] of Object.entries(requiredStrings)) {
    if (!content[field as keyof typeof requiredStrings]?.trim()) {
      throw new ValidationError(`${label} is required`);
    }
    if (content[field as keyof typeof requiredStrings].length < 3) {
      throw new ValidationError(`${label} must be at least 3 characters long`);
    }
    if (content[field as keyof typeof requiredStrings].length > 500) {
      throw new ValidationError(`${label} must be less than 500 characters`);
    }
  }

  // Required array fields
  const requiredArrays = {
    focusAreas: 'Focus areas',
    locations: 'Locations',
    engagementTypes: 'Engagement types'
  } as const;

  for (const [field, label] of Object.entries(requiredArrays)) {
    if (!Array.isArray(content[field as keyof typeof requiredArrays])) {
      throw new ValidationError(`${label} must be an array`);
    }
    if (content[field as keyof typeof requiredArrays].length === 0) {
      throw new ValidationError(`At least one ${label.toLowerCase()} is required`);
    }
    if (content[field as keyof typeof requiredArrays].length > 20) {
      throw new ValidationError(`Maximum of 20 ${label.toLowerCase()} allowed`);
    }
    // Validate each item in the array
    content[field as keyof typeof requiredArrays].forEach((item: string) => {
      if (!item?.trim()) {
        throw new ValidationError(`Empty ${label.toLowerCase()} are not allowed`);
      }
      if (item.length < 2) {
        throw new ValidationError(`${label} must be at least 2 characters long`);
      }
      if (item.length > 100) {
        throw new ValidationError(`${label} must be less than 100 characters`);
      }
    });
  }

  // Optional URL fields
  const urlFields = ['website', 'picture'] as const;

  for (const field of urlFields) {
    if (content[field]) {
      content[field] = validateAndFormatUrl(content[field]!);
    }
  }

  // Optional email field
  if (content.email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(content.email)) {
      throw new ValidationError('Invalid email address format');
    }
  }

  // Optional social links
  if (content.socialLinks) {
    for (const [platform, url] of Object.entries(content.socialLinks)) {
      if (url) {
        content.socialLinks[platform] = validateAndFormatUrl(url);
      }
    }
  }
}

export async function updateOrganization(
  ndk: NDK,
  content: OrganizationContent,
  originalEvent: NDKEvent
): Promise<NDKEvent> {
  // Get the d tag from the original event
  const dTag = originalEvent.tags.find(t => t[0] === 'd');
  if (!dTag) {
    throw new ValidationError('Original event missing d tag');
  }
  try {
    await ensureConnection();
    const ndkInstance = ndk;
    if (!ndkInstance?.signer) {
      throw new SignerRequiredError();
    }

    // Validate content
    validateOrganizationContent(content);

    // Create a new event with the same d tag
    const event = new NDKEvent(ndk);
    event.kind = ORGANIZATION;
    event.content = JSON.stringify(content);
    event.tags = [
      ['d', dTag[1]]  // Use the same d tag to ensure replacement
    ];

    // Add other tags
    if (content.focusAreas?.length) {
      content.focusAreas.forEach(area => {
        event.tags.push([ORGANIZATION_TAGS.FOCUS_AREA, area]);
      });
    }

    if (content.locations?.length) {
      content.locations.forEach(location => {
        event.tags.push([ORGANIZATION_TAGS.LOCATION, location]);
      });
    }

    if (content.engagementTypes?.length) {
      content.engagementTypes.forEach(type => {
        event.tags.push([ORGANIZATION_TAGS.ENGAGEMENT, type]);
      });
    }

    try {
      await ndk.publish(event); // Publish the updated event
      return event;
    } catch (error) {
      console.error('Publish error:', error);
      throw new PublishError(
        `Failed to update organization: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } catch (error) {
    console.error('Organization update error:', error);
    if (error instanceof ValidationError || error instanceof SignerRequiredError || error instanceof PublishError) {
      throw error;
    }
    throw new PublishError(`Unexpected error updating organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createOrganization(
  ndk: NDK,
  content: OrganizationContent,
  identifier: string
): Promise<NDKEvent> {
  try {
    const ndkInstance = ndk;
    if (!ndkInstance?.signer) {
      throw new SignerRequiredError();
    }

    // Verify signer is working
    try {
      const user = await ndkInstance.signer.user();
      if (!user?.pubkey) {
        throw new SignerRequiredError('Signer not properly initialized');
      }
    } catch (e) {
      console.error('Signer verification failed:', e);
      throw new SignerRequiredError('Failed to verify signer');
    }

    // Validate content and identifier
    validateOrganizationContent(content);
    if (!identifier?.trim()) {
      throw new ValidationError('Organization identifier is required');
    }
    if (!/^[a-z0-9-]+$/.test(identifier)) {
      throw new ValidationError('Organization identifier must contain only lowercase letters, numbers, and hyphens');
    }

    // Create organization event
    const event = new NDKEvent(ndk);
    event.kind = ORGANIZATION;
    event.content = JSON.stringify(content);
    event.tags = [
      ['d', `org:${identifier}`] // Organization identifier
    ];

    // Add optional tags
    if (content.focusAreas?.length) {
      content.focusAreas.forEach(area => {
        event.tags.push([ORGANIZATION_TAGS.FOCUS_AREA, area]);
      });
    }

    if (content.locations?.length) {
      content.locations.forEach(location => {
        event.tags.push([ORGANIZATION_TAGS.LOCATION, location]);
      });
    }

    if (content.engagementTypes?.length) {
      content.engagementTypes.forEach(type => {
        event.tags.push([ORGANIZATION_TAGS.ENGAGEMENT, type]);
      });
    }

    if (content.website) {
      event.tags.push([ORGANIZATION_TAGS.WEBSITE, content.website]);
    }

    if (content.picture) {
      event.tags.push([ORGANIZATION_TAGS.PICTURE, content.picture]);
    }

    if (content.languages?.length) {
      content.languages.forEach(lang => {
        event.tags.push([ORGANIZATION_TAGS.LANGUAGE, lang]);
      });
    }

    if (content.socialLinks) {
      Object.entries(content.socialLinks).forEach(([platform, url]) => {
        if (url) {
          event.tags.push([ORGANIZATION_TAGS.SOCIAL, platform, url]);
        }
      });
    }

    try {
      // Publish the event using NDK directly
      await ndk.publish(event);
      return event;
    } catch (error) {
      console.error('Publish error details:', {
        error,
        eventId: event.id,
        relayStatus: Array.from(ndk.pool.relays.values()).map(r => ({
          url: r.url,
          connected: r.connected,
          connecting: r.connecting
        }))
      });
      
      throw new PublishError(
        `Failed to publish organization event: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } catch (error) {
    console.error('Organization creation error:', error);
    if (error instanceof ValidationError || error instanceof SignerRequiredError || error instanceof PublishError) {
      throw error;
    }
    throw new PublishError(`Unexpected error creating organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to test organization creation
export async function deleteOrganization(
  ndk: NDK, 
  originalEvent: NDKEvent,
  reason?: string
): Promise<NDKEvent> {
  try {
    await ensureConnection();
    const ndkInstance = ndk;
    if (!ndkInstance?.signer) {
      throw new SignerRequiredError();
    }

    // console.log('Deleting organization event:', {
    //   id: originalEvent.id,
    //   kind: originalEvent.kind,
    //   tags: originalEvent.tags,
    //   pubkey: originalEvent.pubkey,
    //   content: originalEvent.content
    // });
    
    try {
      // Create deletion event
      const deletionEvent = new NDKEvent(ndk);
      deletionEvent.kind = 5; // Deletion event kind
      deletionEvent.tags = [
        ['e', originalEvent.id], // Reference to event being deleted
        ['a', `${ORGANIZATION}:${originalEvent.tags.find(t => t[0] === 'd')?.[1]}`] // Reference to the replaceable event identifier
      ];
      deletionEvent.content = reason || 'Organization deleted by owner';
      
      // console.log('Publishing deletion event:', {
      //   kind: deletionEvent.kind,
      //   tags: deletionEvent.tags,
      //   content: deletionEvent.content
      // });
      
      await ndk.publish(deletionEvent);
      // console.log('Deletion event published successfully:', deletionEvent.id);
      return deletionEvent;
    } catch (error) {
      console.error('Delete publish error:', error);
      throw new PublishError(
        `Failed to delete organization: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } catch (error) {
    console.error('Organization deletion error:', error);
    if (error instanceof ValidationError || error instanceof SignerRequiredError || error instanceof PublishError) {
      throw error;
    }
    throw new PublishError(`Unexpected error deleting organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function addToCuratorList(
  ndk: NDK,
  organizationEvent: NDKEvent,
  reason?: string
): Promise<NDKEvent> {
  try {
    await ensureConnection();
    const ndkInstance = ndk;
    if (!ndkInstance?.signer) {
      throw new SignerRequiredError();
    }

    // Create curator list event
    const listEvent = new NDKEvent(ndk);
    listEvent.kind = ORGANIZATION_LIST;
    listEvent.tags = [
      ['d', 'curator-list'], // Identifier for the curator list
      ['o', organizationEvent.id], // Reference to the organization event
      ['p', organizationEvent.pubkey], // Organization creator's pubkey
    ];

    if (reason) {
      listEvent.tags.push(['reason', reason]);
    }

    // Set content with metadata
    const content: OrganizationListContent = {
      name: "Curated Organizations",
      organizations: [organizationEvent.id],
      lastUpdated: Math.floor(Date.now() / 1000)
    };
    listEvent.content = JSON.stringify(content);

    try {
      await ndk.publish(listEvent);
      return listEvent;
    } catch (error) {
      throw new PublishError(
        `Failed to add organization to curator list: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof SignerRequiredError || error instanceof PublishError) {
      throw error;
    }
    throw new PublishError(`Unexpected error adding to curator list: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function removeFromCuratorList(
  ndk: NDK,
  organizationEvent: NDKEvent,
  reason?: string
): Promise<NDKEvent> {
  try {
    await ensureConnection();
    const ndkInstance = ndk;
    if (!ndkInstance?.signer) {
      throw new SignerRequiredError();
    }

    // Create deletion event for the organization from the curator list
    const deletionEvent = new NDKEvent(ndk);
    deletionEvent.kind = EVENT_DELETION;
    deletionEvent.tags = [
      ['e', organizationEvent.id],
      ['a', `${ORGANIZATION_LIST}:curator-list`]
    ];
    deletionEvent.content = reason || 'Organization removed from curator list';

    try {
      await ndk.publish(deletionEvent);
      return deletionEvent;
    } catch (error) {
      throw new PublishError(
        `Failed to remove organization from curator list: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof SignerRequiredError || error instanceof PublishError) {
      throw error;
    }
    throw new PublishError(`Unexpected error removing from curator list: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getVisibleOrganizations(
  ndk: NDK,
  curatorPubkeys: string[]
): Promise<NDKEvent[]> {
  try {
    await ensureConnection();
    
    // Fetch curator list events
    const filter = {
      kinds: [ORGANIZATION_LIST],
      authors: curatorPubkeys,
      '#d': ['curator-list']
    };

    const events = await ndk.fetchEvents(filter);
    const visibleOrgIds = new Set<string>();

    // Collect all organization IDs from curator lists
    events.forEach(event => {
      const orgTags = event.tags.filter(t => t[0] === 'o');
      orgTags.forEach(tag => visibleOrgIds.add(tag[1]));
    });

    // Fetch the actual organization events
    if (visibleOrgIds.size === 0) return [];

    const orgFilter = {
      kinds: [ORGANIZATION],
      ids: Array.from(visibleOrgIds)
    };

    const orgEvents = await ndk.fetchEvents(orgFilter);
    return Array.from(orgEvents);
  } catch (error) {
    console.error('Error fetching visible organizations:', error);
    return [];
  }
}

export async function createTestOrganization(): Promise<NDKEvent> {
  await ensureConnection();
  const content: OrganizationContent = {
    name: "Test Organization",
    category: "Nonprofit",
    description: "A test organization for development purposes",
    focusAreas: ["Climate Justice", "Community"],
    locations: ["USA", "Online"],
    engagementTypes: ["Direct Action", "Education"],
    picture: "https://placekitten.com/200/200",
    website: "https://example.org",
    email: "contact@example.org",
    about: "This is a test organization to verify event creation",
    mission: "To test organization events",
    vision: "A world with working test cases",
    founded: "2024",
    size: "1-10",
    languages: ["en", "es"],
    socialLinks: {
      twitter: "https://twitter.com/testorg",
      github: "https://github.com/testorg"
    }
  };

  const event = await createOrganization(ndk, content, "test-org");
  return event;
}
