import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
import { ORGANIZATION, type OrganizationContent, ORGANIZATION_TAGS } from './kinds';

export async function createOrganization(
  ndk: NDK,
  content: OrganizationContent,
  identifier: string
): Promise<NDKEvent> {
  if (!ndk.signer) {
    throw new Error('NDK signer required to create organization');
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

  // Publish the event
  await event.publish();
  return event;
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
