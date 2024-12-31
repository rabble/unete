import { ORGANIZATION, type OrganizationContent } from '$lib/nostr/kinds';
import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';

// Constants
export const locationOptions = [
  'National', 'International', 'USA', 'Canada', 'UK', 
  'California', 'New York', 'Florida', 'Texas', 
  'Massachusetts', 'Washington D.C.', 'Southern U.S.', 
  'Border regions'
];

export const focusAreaOptions = [
  'Climate Justice', 'Community', 'Democracy', 'Economic Democracy',
  'Education', 'Feminism', 'Food', 'Healthcare', 'Housing',
  'Immigration', 'Indigenous', 'International', 'LGBTQIA+',
  'Palestine Solidarity', 'Racial Justice', 'Reproductive Justice',
  'Workplace Justice', 'Youth'
].sort();

export const engagementTypeOptions = [
  'In-person', 'Online', 'Hybrid', 'Construction', 'Cooking',
  'Driving/transporting', 'Editing', 'Event/protest planning & logistics',
  'Fundraising', 'Legal', 'Medical', 
  'Messaging and Narrative (arts/media/graphics)', 'Outreach',
  'Participate in trainings', 'Research', 'Strike Support',
  'Sanctuary support', 'Tech support (programming, etc.)',
  'Translation', 'Writing'
].sort();

// Helper Functions
export function getOrgContent(event: NDKEvent): OrganizationContent {
  // ... rest of the function remains the same ...
}

export function matchesFilter(tags: string[][], key: string, filterSet: Set<string>, mark?: string): boolean {
  // ... rest of the function remains the same ...
}

export async function fetchEvents(ndk: NDK): Promise<NDKEvent[]> {
  // ... rest of the function remains the same ...
}

export function setupRealtimeSubscription(ndk: NDK, callback: (event: NDKEvent) => void) {
  // ... rest of the function remains the same ...
} 