import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
import { ORGANIZATION, type OrganizationContent, ORGANIZATION_TAGS } from './kinds';
import { SignerRequiredError, ValidationError, PublishError } from './errors';

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
  const urlPattern = /^https?:\/\/.+/i;

  for (const field of urlFields) {
    if (content[field] && !urlPattern.test(content[field]!)) {
      throw new ValidationError(`${field} must be a valid URL starting with http:// or https://`);
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
    const socialPattern = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/;
    for (const [platform, url] of Object.entries(content.socialLinks)) {
      if (url && !socialPattern.test(url)) {
        throw new ValidationError(`Invalid ${platform} URL format`);
      }
    }
  }
}

export async function createOrganization(
  ndk: NDK,
  content: OrganizationContent,
  identifier: string
): Promise<NDKEvent> {
  try {
    if (!ndk.signer) {
      throw new SignerRequiredError();
    }

    // Validate content
    validateOrganizationContent(content);

    // Validate identifier
    if (!identifier?.trim()) {
      throw new ValidationError('Organization identifier is required');
    }

    const event = new NDKEvent(ndk);
    event.kind = ORGANIZATION;
    event.content = JSON.stringify(content);
  
  // Add required tags
  event.tags = [
    [ORGANIZATION_TAGS.IDENTIFIER, identifier]
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
      // Publish the event
      await event.publish();
      return event;
    } catch (error) {
      throw new PublishError(
        `Failed to publish organization event: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } catch (error) {
    if (error instanceof NostrError) {
      throw error;
    }
    throw new NostrError(`Unexpected error creating organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to test organization creation
export async function createTestOrganization(ndk: NDK): Promise<NDKEvent> {
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

  return createOrganization(ndk, content, "test-org-1");
}
