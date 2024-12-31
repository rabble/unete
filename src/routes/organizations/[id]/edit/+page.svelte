<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { initNostrLogin } from '$lib/nostr/login';
  import type { OrganizationContent } from '$lib/types';
  import type { OrganizationCategory } from '$lib/nostr/kinds';
  import { updateOrganization, deleteOrganization } from '$lib/nostr/organizations';
  import { getTopics } from '$lib/topics';
  import NDK, { NDKNip07Signer, NDKEvent } from '@nostr-dev-kit/ndk';
  import { ndk, getCachedEvents } from '$lib/stores/ndk';
  import {
    ValidationError,
    SignerRequiredError,
    PublishError,
  } from '$lib/nostr/errors';
  import { ORGANIZATION } from '$lib/nostr/kinds';

  // --- Reactive Variables ---
  let focusAreas: string[] = [];
  let error: string | null = null;
  let success = false;
  let loading = true;
  let originalEvent: NDKEvent;
  let hasCachedData = false;

  // Form data object
  let otherLocation = '';
  let formData: OrganizationContent = {
    name: '',
    category: 'Nonprofit',
    description: '',
    focusAreas: [],
    locations: [],
    engagementTypes: [],
    website: '',
    picture: '',
    email: '',
    about: '',
    mission: '',
    vision: '',
    founded: '',
    languages: [],
    socialLinks: {
      twitter: '',
      github: '',
      linkedin: '',
      facebook: '',
      instagram: '',
      nostr: '',
    },
    supporter: {
      range: [0, 0],
      description: '',
    },
    staff: {
      range: [0, 0],
      description: '',
    },
  };

  // Category options
  const categoryOptions: OrganizationCategory[] = [
    'Nonprofit',
    'Mutual Aid',
    'Coalition',
    'Community Organization', 
    'Advocacy Group',
    'Labor Union',
    'Worker Cooperative',
    'Social Movement',
    'Other'
  ];

  import { LOCATION_OPTIONS, ENGAGEMENT_TYPE_OPTIONS, LANGUAGE_OPTIONS } from '$lib/constants';
  
  const locationOptions = LOCATION_OPTIONS;
  const engagementTypeOptions = ENGAGEMENT_TYPE_OPTIONS;
  const languageOptions = LANGUAGE_OPTIONS;

  async function loadData() {
    try {
      // Get cached data first
      const cachedEvents = await getCachedEvents({
        kinds: [ORGANIZATION],
        ids: [$page.params.id],
        limit: 1,
        since: 0
      });
      
      const cachedEvent = Array.from(cachedEvents)[0];
      if (cachedEvent) {
        originalEvent = cachedEvent;
        formData = JSON.parse(cachedEvent.content);
        hasCachedData = true;
        loading = false;
      }

      // Initialize Nostr login
      await initNostrLogin();
      
      // Load fresh data
      if ($ndk) {
        const events = await $ndk.fetchEvents({
          ids: [$page.params.id]
        });

        const event = Array.from(events)[0];
        if (event) {
          originalEvent = event;
          formData = JSON.parse(event.content);
        } else if (!hasCachedData) {
          throw new Error('Organization not found');
        }
      }
      
      // Load focus areas
      focusAreas = await getTopics($ndk);

    } catch (err) {
      console.error('Error initializing:', err);
      error = 'Failed to load organization. Please try again.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  function toggleSelection(array: string[], item: string) {
    const index = array.indexOf(item);
    if (index === -1) {
      array.push(item);
    } else {
      array.splice(index, 1);
    }
    array = [...array];
  }

  async function handleSubmit() {
    error = null;
    success = false;
    loading = true;

    try {
      if (!$ndk?.signer) {
        throw new SignerRequiredError();
      }

      if (!originalEvent) {
        throw new Error('Original event not found');
      }

      const event = await updateOrganization($ndk, formData, originalEvent);
      console.log('Organization updated successfully:', event);

      success = true;
      window.location.href = `/organizations/${event.id}`;
    } catch (e) {
      if (e instanceof ValidationError) {
        error = e.message;
      } else if (e instanceof SignerRequiredError) {
        error = 'Please login with a Nostr extension first';
      } else if (e instanceof PublishError) {
        error = 'Failed to update organization. Please try again.';
      } else {
        error = 'An unexpected error occurred';
        console.error(e);
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-4xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Edit Organization</h1>

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {/if}

  {#if success}
    <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
      <p class="text-green-700">Organization successfully updated!</p>
    </div>
  {/if}

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
      <p class="mt-2 text-gray-600">Loading organization details...</p>
    </div>
  {:else if originalEvent}
    <form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow-lg p-8 space-y-6">
      <!-- Basic Information -->
      <div class="space-y-4">
        <h2 class="text-2xl font-bold">Basic Information</h2>
        
        <!-- Name -->
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Organization Name *</label>
          <input
            type="text"
            id="name"
            bind:value={formData.name}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            required
          />
        </div>

        <!-- Category -->
        <div>
          <label for="category" class="block text-sm font-medium text-gray-700">Category *</label>
          <select
            id="category"
            bind:value={formData.category}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            required
          >
            {#each categoryOptions as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </div>

        <!-- Description -->
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">Description *</label>
          <textarea
            id="description"
            bind:value={formData.description}
            rows="3"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            required
          ></textarea>
        </div>

        <!-- Focus Areas -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Focus Areas *</label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            {#each focusAreas as area}
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  value={area}
                  checked={formData.focusAreas.includes(area)}
                  on:change={() => toggleSelection(formData.focusAreas, area)}
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span class="ml-2 text-sm text-gray-700">{area}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Locations -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Locations *</label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            {#each locationOptions as location}
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  value={location}
                  checked={formData.locations.includes(location)}
                  on:change={() => toggleSelection(formData.locations, location)}
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span class="ml-2 text-sm text-gray-700">{location}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Engagement Types -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Ways to Engage *</label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            {#each engagementTypeOptions as type}
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  value={type}
                  checked={formData.engagementTypes.includes(type)}
                  on:change={() => toggleSelection(formData.engagementTypes, type)}
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span class="ml-2 text-sm text-gray-700">{type}</span>
              </label>
            {/each}
          </div>
        </div>
      </div>

      <!-- Contact Information -->
      <div class="space-y-4">
        <h2 class="text-2xl font-bold">Contact Information</h2>
        
        <!-- Website -->
        <div>
          <label for="website" class="block text-sm font-medium text-gray-700">Website</label>
          <input
            type="url"
            id="website"
            bind:value={formData.website}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            bind:value={formData.email}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <!-- Social Links -->
        <div class="space-y-2">
          <h3 class="text-lg font-semibold">Social Links</h3>
          
          {#each Object.entries(formData.socialLinks) as [platform, url]}
            <div>
              <label for={platform} class="block text-sm font-medium text-gray-700 capitalize">{platform}</label>
              <input
                type="url"
                id={platform}
                bind:value={formData.socialLinks[platform]}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          {/each}
        </div>
      </div>

      <!-- Additional Information -->
      <div class="space-y-4">
        <h2 class="text-2xl font-bold">Additional Information</h2>
        
        <!-- About -->
        <div>
          <label for="about" class="block text-sm font-medium text-gray-700">About</label>
          <textarea
            id="about"
            bind:value={formData.about}
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          ></textarea>
        </div>

        <!-- Mission -->
        <div>
          <label for="mission" class="block text-sm font-medium text-gray-700">Mission</label>
          <textarea
            id="mission"
            bind:value={formData.mission}
            rows="3"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          ></textarea>
        </div>

        <!-- Vision -->
        <div>
          <label for="vision" class="block text-sm font-medium text-gray-700">Vision</label>
          <textarea
            id="vision"
            bind:value={formData.vision}
            rows="3"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          ></textarea>
        </div>

        <!-- Founded -->
        <div>
          <label for="founded" class="block text-sm font-medium text-gray-700">Founded Year</label>
          <input
            type="text"
            id="founded"
            bind:value={formData.founded}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <!-- Languages -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Languages</label>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            {#each languageOptions as language}
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  value={language}
                  checked={formData.languages.includes(language)}
                  on:change={() => toggleSelection(formData.languages, language)}
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span class="ml-2 text-sm text-gray-700">{language}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Staff Information -->
        <div>
          <h3 class="text-lg font-semibold mb-2">Staff Information</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="staffMin" class="block text-sm font-medium text-gray-700">Minimum Staff</label>
              <input
                type="number"
                id="staffMin"
                bind:value={formData.staff.range[0]}
                min="0"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label for="staffMax" class="block text-sm font-medium text-gray-700">Maximum Staff</label>
              <input
                type="number"
                id="staffMax"
                bind:value={formData.staff.range[1]}
                min="0"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
          <div class="mt-2">
            <label for="staffDescription" class="block text-sm font-medium text-gray-700">Staff Description</label>
            <textarea
              id="staffDescription"
              bind:value={formData.staff.description}
              rows="2"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            ></textarea>
          </div>
        </div>

        <!-- Supporter Information -->
        <div>
          <h3 class="text-lg font-semibold mb-2">Supporter Information</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="supporterMin" class="block text-sm font-medium text-gray-700">Minimum Supporters</label>
              <input
                type="number"
                id="supporterMin"
                bind:value={formData.supporter.range[0]}
                min="0"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label for="supporterMax" class="block text-sm font-medium text-gray-700">Maximum Supporters</label>
              <input
                type="number"
                id="supporterMax"
                bind:value={formData.supporter.range[1]}
                min="0"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
          <div class="mt-2">
            <label for="supporterDescription" class="block text-sm font-medium text-gray-700">Supporter Description</label>
            <textarea
              id="supporterDescription"
              bind:value={formData.supporter.description}
              rows="2"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end pt-6">
        <button
          type="submit"
          class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  {:else}
    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <p class="text-yellow-700">Organization not found</p>
    </div>
  {/if}
</div>
