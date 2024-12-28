import { writable } from 'svelte/store';

export const searchFilters = writable({
  locations: [],
  focusAreas: [],
  engagementTypes: []
});
