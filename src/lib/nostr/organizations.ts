import { ndk, ensureConnection, getCachedEvents } from '$lib/stores/ndk';
import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
import { ORGANIZATION, type OrganizationContent, ORGANIZATION_TAGS } from './kinds';
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
      await event.publish(); // Publish the updated event
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

    // Validate content
    validateOrganizationContent(content);

    // Validate identifier
    if (!identifier?.trim()) {
      throw new ValidationError('Organization identifier is required');
    }
    if (!/^[a-z0-9-]+$/.test(identifier)) {
      throw new ValidationError('Organization identifier must contain only lowercase letters, numbers, and hyphens');
    }

    const event = new NDKEvent(ndk);
    event.kind = ORGANIZATION;
    event.content = JSON.stringify(content);
  
    // Add required 'd' tag for parameterized replaceable events
    // Use a consistent format for the identifier to ensure replaceability
    const dTag = `org:${identifier}`; // Namespace the identifier
    event.tags = [
      ['d', dTag]  // This makes it a parameterized replaceable event
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
      console.log('Publishing event:', event);
      const connectedRelays = Array.from(ndk.pool.relays.values())
        .filter(r => r.connected)
        .map(r => r.url);
      console.log('Connected relays:', connectedRelays);
      
      if (connectedRelays.length === 0) {
        throw new Error('No connected relays available');
      }

      // Publish the event
      await event.publish();

      console.log('Event published, waiting for verification...');
      
      // Then wait for verification with a longer timeout
      const verified = await new Promise<NDKEvent>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('Event verification timed out after 30 seconds');
          // Don't reject - some relays might be slow
          resolve(event);
        }, 30000); // 30 second timeout

        let verifiedCount = 0;
        const requiredVerifications = 1; // Adjust as needed
        
        const handleVerification = (e: NDKEvent) => {
          if (e.id === event.id) {
            verifiedCount++;
            console.log(`Event verified by relay (${verifiedCount}/${requiredVerifications})`);
            
            if (verifiedCount >= requiredVerifications) {
              clearTimeout(timeout);
              ndk.pool.removeListener('event:verified', handleVerification);
              resolve(e);
            }
          }
        };

        ndk.pool.on('event:verified', handleVerification);
      });

      console.log('Event fully verified');
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

    // Create a deletion event (kind 5)
    const event = new NDKEvent(ndk);
    event.kind = 5; // Standard Nostr deletion event kind
    event.content = reason || ''; // Optional reason for deletion
    event.tags = [
      ['e', originalEvent.id], // Reference the event to delete
      ['a', `${ORGANIZATION}:${originalEvent.tags.find(t => t[0] === 'd')?.[1]}`] // Reference the parameterized replaceable event
    ];

    console.log('Creating deletion event:', {
      kind: event.kind,
      content: event.content,
      tags: event.tags,
      originalEventId: originalEvent.id
    });

    try {
      // Ensure we're using NDK's publish method
      await ndk.publish(event);
      return event;
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
