// Organization event kind (31000-32000 range for addressable events)
export const ORGANIZATION = 31312;
export const TOPICS = 30079;

// Topics event content schema
export interface TopicsContent {
  topics: string[];
  description?: string;
  lastUpdated: number;
}

// Topics event tags
export const TOPICS_TAGS = {
  IDENTIFIER: 'd',           // Required for addressable events
  TOPIC: 't',               // Topic identifier
  DESCRIPTION: 'description' // Topic description
};

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
