// Basic event kinds (0-9)
export const METADATA = 0;              // Profile metadata - NIP-01
export const TEXT_NOTE = 1;             // Short text note - NIP-01
export const RECOMMEND_RELAY = 2;       // Relay recommendation
export const CONTACTS = 3;              // Contact list - NIP-02
export const ENCRYPTED_DM = 4;          // Encrypted direct message - NIP-04
export const EVENT_DELETION = 5;        // Delete event - NIP-09
export const REPOST = 6;                // Repost - NIP-18
export const REACTION = 7;              // Reaction - NIP-25
export const BADGE_AWARD = 8;           // Badge award - NIP-58

// Extended event kinds (10-99)
export const GENERIC_REPOST = 16;       // Generic repost - NIP-18

// Channel event kinds (40-44)
export const CHANNEL_CREATION = 40;     // Create channel - NIP-28
export const CHANNEL_METADATA = 41;     // Channel metadata - NIP-28
export const CHANNEL_MESSAGE = 42;      // Channel message - NIP-28
export const CHANNEL_HIDE_MESSAGE = 43; // Hide channel message - NIP-28
export const CHANNEL_MUTE_USER = 44;    // Mute user in channel - NIP-28

// File and chat events (1000+)
export const FILE_METADATA = 1063;      // File metadata - NIP-94
export const LIVE_CHAT_MSG = 1311;      // Live chat message - NIP-53
export const TIMESTAMP = 1040;          // OpenTimestamps - NIP-03

// Moderation events (1900+)
export const REPORTING = 1984;          // Report - NIP-56
export const LABEL = 1985;              // Label - NIP-32

// Community events (4000+)
export const COMMUNITY_POST_APPROVAL = 4550; // Community post approval - NIP-72

// Zap events (9000+)
export const ZAP_GOAL = 9041;          // Zap goal - NIP-75
export const ZAP_REQUEST = 9734;        // Zap request - NIP-57
export const ZAP_RECEIPT = 9735;        // Zap receipt - NIP-57

// List events (10000+)
export const MUTE_LIST = 10000;         // Mute list - NIP-51
export const PIN_LIST = 10001;          // Pin list - NIP-51
export const RELAY_LIST = 10002;        // Relay list metadata - NIP-65

// Wallet and authentication events (13000+, 22000+)
export const WALLET_INFO = 13194;       // Wallet info - NIP-47
export const CLIENT_AUTH = 22242;       // Client authentication - NIP-42
export const WALLET_REQUEST = 23194;    // Wallet request - NIP-47
export const WALLET_RESPONSE = 23195;   // Wallet response - NIP-47
export const NOSTR_CONNECT = 24133;     // Nostr Connect - NIP-46
export const HTTP_AUTH = 27235;         // HTTP authentication - NIP-98

// Parameterized replaceable events (30000-39999)
export const PEOPLE_LIST = 30000;       // Categorized people list - NIP-51
export const BOOKMARK_LIST = 30001;     // Categorized bookmark list - NIP-51
export const PROFILE_BADGES = 30008;    // Profile badges - NIP-58
export const BADGE_DEFINITION = 30009;  // Badge definition - NIP-58
export const CREATE_STALL = 30017;      // Create/update stall - NIP-15
export const CREATE_PRODUCT = 30018;    // Create/update product - NIP-15
export const LONG_FORM = 30023;         // Long-form content - NIP-23
export const DRAFT_LONG_FORM = 30024;   // Draft long-form content - NIP-23
export const APP_DATA = 30078;          // Application-specific data - NIP-78
export const LIVE_EVENT = 30311;        // Live event - NIP-53
export const USER_STATUS = 30315;       // User status - NIP-38
export const CLASSIFIED = 30402;        // Classified listing - NIP-99
export const DRAFT_CLASSIFIED = 30403;  // Draft classified listing - NIP-99

// Calendar events (31900+)
export const DATE_BASED_EVENT = 31922;  // Date-based calendar event - NIP-52
export const TIME_BASED_EVENT = 31923;  // Time-based calendar event - NIP-52
export const CALENDAR = 31924;          // Calendar - NIP-52
export const CALENDAR_RSVP = 31925;     // Calendar event RSVP - NIP-52

// Handler events (31900+)
export const HANDLER_RECOMMEND = 31989; // Handler recommendation - NIP-89
export const HANDLER_INFO = 31990;      // Handler information - NIP-89

// Community events (34000+)
export const COMMUNITY = 34550;         // Community definition - NIP-72

// Community interfaces
export interface CommunityContent {
  name: string;
  description: string;
  image?: string;
  rules?: string[];
  guidelines?: string[];
  lastUpdated: number;
}

export interface CommunityTags {
  IDENTIFIER: 'd';           // Required unique identifier
  NAME: 'name';             // Community name
  DESCRIPTION: 'description'; // Community description
  IMAGE: 'image';           // Community image URL
  MODERATOR: 'p';          // Moderator pubkey
  RELAY: 'relay';          // Community relay
  APPROVAL: 'a';           // Approval reference
  POST: 'e';               // Post reference
  AUTHOR: 'p';             // Post author
  KIND: 'k';               // Post kind
}

export const COMMUNITY_TAGS: CommunityTags = {
  IDENTIFIER: 'd',
  NAME: 'name', 
  DESCRIPTION: 'description',
  IMAGE: 'image',
  MODERATOR: 'p',
  RELAY: 'relay',
  APPROVAL: 'a',
  POST: 'e',
  AUTHOR: 'p',
  KIND: 'k'
};

// Custom organization events
export const ORGANIZATION = 31312;      // Custom kind for organization directory listings
export const TOPICS = 31313;            // Custom kind for topics

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
export type OrganizationCategory = 
  | 'Nonprofit'
  | 'Mutual Aid'
  | 'Coalition'
  | 'Community Organization'
  | 'Advocacy Group'
  | 'Labor Union'
  | 'Worker Cooperative'
  | 'Social Movement'
  | 'Other';

export interface OrganizationContent {
  name: string;
  category: OrganizationCategory;
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
