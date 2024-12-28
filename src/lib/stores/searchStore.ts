import { writable } from 'svelte/store';

export const searchFilters = writable({
  location: '',
  focusArea: '',
  engagementType: ''
});
