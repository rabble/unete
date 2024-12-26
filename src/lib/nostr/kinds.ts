// Organization event kind (30000-40000 range for addressable events)
export const ORGANIZATION = 30078;

// Organization event content schema
export interface OrganizationContent {
  name: string;
  category: string;
  description: string;
  focusAreas: string[];
  locations: string[];
  engagementTypes: string[];
  picture?: string;
  website?: string;
  email?: string;
  // Additional metadata fields
  about?: string;
  mission?: string;
  vision?: string;
  founded?: string;
  size?: string;
  languages?: string[];
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
}

// Organization event tags
export const ORGANIZATION_TAGS = {
  IDENTIFIER: 'd',           // Required for addressable events
  FOCUS_AREA: 'f',          // Focus areas
  LOCATION: 'l',            // Locations
  ENGAGEMENT: 'e',          // Engagement types
  WEBSITE: 'w',             // Website URL
  PICTURE: 'picture',       // Profile picture URL
  BANNER: 'banner',         // Banner image URL
  CONTACT: 'contact',       // Contact information
  LANGUAGE: 'lang',         // Languages supported
  SOCIAL: 'social',         // Social media links
  RELAY: 'relay'           // Recommended relay
};
