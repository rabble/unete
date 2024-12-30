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

// Group event kinds (NIP-29)
export const GROUP_METADATA = 39000;      // Group metadata
export const GROUP_ADMINS = 39001;        // Group admins list
export const GROUP_MEMBERS = 39002;       // Group members list
export const GROUP_ROLES = 39003;         // Group roles definition

// Group moderation events (NIP-29)
export const GROUP_ADD_USER = 9000;       // Add user to group
export const GROUP_REMOVE_USER = 9001;    // Remove user from group
export const GROUP_EDIT_METADATA = 9002;  // Edit group metadata
export const GROUP_DELETE_EVENT = 9005;   // Delete event from group
export const GROUP_CREATE = 9007;         // Create group
export const GROUP_DELETE = 9008;         // Delete group
export const GROUP_CREATE_INVITE = 9009;  // Create invite code

// Group user events (NIP-29)
export const GROUP_JOIN = 9021;           // Request to join group
export const GROUP_LEAVE = 9022;          // Request to leave group

// Custom organization events
export const ORGANIZATION = 31312;      // Custom kind for organization directory listings
export const TOPICS = 31313;            // Custom kind for topics
export const ORGANIZATION_LIST = 31314;  // Custom kind for curated organization lists

// Organization list tags
export const ORGANIZATION_LIST_TAGS = {
  IDENTIFIER: 'd',           // Required for addressable events
  ORGANIZATION: 'o',         // Reference to organization event
  CURATOR: 'p',             // Curator's pubkey
  REASON: 'reason',         // Optional reason for inclusion
};

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
