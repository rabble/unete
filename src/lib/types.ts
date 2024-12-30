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
  communityId?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
}

export interface Group {
  id: string;
  name: string;
  about?: string;
  picture?: string;
  private: boolean;
  closed: boolean;
  invites?: string[];
  joinRequests?: string[];
  content?: string;
}
