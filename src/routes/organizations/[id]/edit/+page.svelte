<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { initNostrLogin } from '$lib/nostr/login';
  import type { OrganizationContent, OrganizationCategory } from '$lib/nostr/kinds';
  import { updateOrganization } from '$lib/nostr/organizations';
  import { getTopics } from '$lib/topics';
  import NDK, { NDKNip07Signer, NDKEvent } from '@nostr-dev-kit/ndk';
  import {
    ValidationError,
    SignerRequiredError,
    PublishError,
  } from '$lib/nostr/errors';

  // --- Reactive Variables ---
  let ndk: NDK;
  let focusAreas: string[] = [];
  let error: string | null = null;
  let success = false;
  let loading = false;
  let originalEvent: NDKEvent;

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
    size: '',
    languages: [],
    socialLinks: {
      twitter: '',
      github: '',
      linkedin: '',
      facebook: '',
      instagram: '',
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

  const locationOptions = [
    'National',
    'International',
    'USA',
    'Canada', 
    'UK',
    'California',
    'New York',
    'Florida',
    'Texas',
    'Massachusetts',
    'Washington D.C.',
    'Southern U.S.',
    'Border regions'
  ];

  const engagementTypeOptions = [
    'In-person',
    'Online', 
    'Hybrid',
    'Construction',
    'Cooking',
    'Driving/transporting',
    'Editing',
    'Event/protest planning & logistics',
    'Fundraising',
    'Legal',
    'Medical',
    'Messaging and Narrative (arts/media/graphics)',
    'Outreach',
    'Participate in trainings',
    'Research',
    'Strike Support',
    'Sanctuary support', 
    'Tech support (programming, etc.)',
    'Translation',
    'Writing'
  ];

  const languageOptions = ['en', 'es', 'fr'];
  const sizeOptions = ['1-10', '11-50', '51-200', '201-500', '500+'];

  onMount(async () => {
    try {
      ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.nos.social',
          'wss://relay.damus.io',
          'wss://relay.nostr.band',
        ],
        signer: new NDKNip07Signer(),
      });

      await ndk.connect();
      
      // Initialize Nostr login
      await initNostrLogin();
      
      // Load organization data
      const events = await ndk.fetchEvents({
        ids: [$page.params.id]
      });

      originalEvent = Array.from(events)[0];
      if (!originalEvent) {
        throw new Error('Organization not found');
      }

      // Parse and populate form data
      formData = JSON.parse(originalEvent.content);
      
      // Load focus areas
      focusAreas = await getTopics(ndk);

    } catch (err) {
      console.error('Error initializing:', err);
      error = 'Failed to load organization. Please try again.';
    }
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
      if (!ndk?.signer) {
        throw new SignerRequiredError();
      }

      if (!originalEvent) {
        throw new Error('Original event not found');
      }

      const event = await updateOrganization(ndk, formData, originalEvent);
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

  <form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow-lg p-8">
    <!-- Basic Information -->
    <div class="space-y-6 mb-8">
      <h2 class="text-2xl font-bold">Basic Information</h2>
      
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">
          Organization Name *
        </label>
        <input
          type="text"
          id="name"
          bind:value={formData.name}
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label for="category" class="block text-sm font-medium text-gray-700">Category *</label>
        <select
          id="category"
          bind:value={formData.category}
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        >
          {#each categoryOptions as category}
            <option value={category}>{category}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="description" class="block text-sm font-medium text-gray-700">
          Description *
        </label>
        <textarea
          id="description"
          bind:value={formData.description}
          required
          rows="4"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        ></textarea>
      </div>
    </div>

    <!-- Focus Areas -->
    <div class="space-y-6 mb-8">
      <h2 class="text-2xl font-bold">Focus Areas *</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each focusAreas as area}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.focusAreas.includes(area)}
              on:change={() => toggleSelection(formData.focusAreas, area)}
              class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span>{area}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Locations -->
    <div class="space-y-6 mb-8">
      <h2 class="text-2xl font-bold">Locations *</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each locationOptions as location}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.locations.includes(location)}
              on:change={() => toggleSelection(formData.locations, location)}
              class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span>{location}</span>
          </label>
        {/each}
      </div>
      
      <!-- Other Location -->
      <div class="mt-4">
        <label class="flex items-center space-x-2 mb-2">
          <input
            type="checkbox"
            checked={formData.locations.includes(otherLocation)}
            on:change={() => {
              if (otherLocation.trim()) {
                toggleSelection(formData.locations, otherLocation);
              }
            }}
            class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span>Other:</span>
        </label>
        <input
          type="text"
          bind:value={otherLocation}
          placeholder="Enter other location"
          on:input={() => {
            const oldOtherIndex = formData.locations.indexOf(otherLocation);
            if (oldOtherIndex !== -1) {
              formData.locations.splice(oldOtherIndex, 1);
            }
            if (formData.locations.includes(otherLocation) && otherLocation.trim()) {
              formData.locations = [...formData.locations, otherLocation];
            }
          }}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>
    </div>

    <!-- Engagement Types -->
    <div class="space-y-6 mb-8">
      <h2 class="text-2xl font-bold">Engagement Types *</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each engagementTypeOptions as type}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.engagementTypes.includes(type)}
              on:change={() => toggleSelection(formData.engagementTypes, type)}
              class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span>{type}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Contact Information -->
    <div class="space-y-6 mb-8">
      <h2 class="text-2xl font-bold">Contact Information</h2>
      
      <div>
        <label for="website" class="block text-sm font-medium text-gray-700">
          Website
        </label>
        <input
          type="url"
          id="website"
          bind:value={formData.website}
          placeholder="https://"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          bind:value={formData.email}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label for="picture" class="block text-sm font-medium text-gray-700">
          Logo/Picture URL
        </label>
        <input
          type="url"
          id="picture"
          bind:value={formData.picture}
          placeholder="https://"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>
    </div>

    <!-- Additional Information -->
    <div class="space-y-6 mb-8">
      <h2 class="text-2xl font-bold">Additional Information</h2>
      
      <div>
        <label for="about" class="block text-sm font-medium text-gray-700">
          About
        </label>
        <textarea
          id="about"
          bind:value={formData.about}
          rows="4"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        ></textarea>
      </div>

      <div>
        <label for="mission" class="block text-sm font-medium text-gray-700">
          Mission
        </label>
        <textarea
          id="mission"
          bind:value={formData.mission}
          rows="4"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        ></textarea>
      </div>

      <div>
        <label for="vision" class="block text-sm font-medium text-gray-700">
          Vision
        </label>
        <textarea
          id="vision"
          bind:value={formData.vision}
          rows="4"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        ></textarea>
      </div>

      <div>
        <label for="founded" class="block text-sm font-medium text-gray-700">
          Founded Year
        </label>
        <input
          type="text"
          id="founded"
          bind:value={formData.founded}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label for="size" class="block text-sm font-medium text-gray-700">
          Organization Size
        </label>
        <select
          id="size"
          bind:value={formData.size}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        >
          <option value="">Select size...</option>
          {#each sizeOptions as size}
            <option value={size}>{size}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Languages
        </label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          {#each languageOptions as language}
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.languages?.includes(language)}
                on:change={() => toggleSelection(formData.languages, language)}
                class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span>{language}</span>
            </label>
          {/each}
        </div>
      </div>
    </div>

    <!-- Social Links -->
    <div class="space-y-6 mb-8">
      <h2 class="text-2xl font-bold">Social Media Links</h2>
      
      <div>
        <label for="twitter" class="block text-sm font-medium text-gray-700">
          Twitter
        </label>
        <input
          type="url"
          id="twitter"
          bind:value={formData.socialLinks.twitter}
          placeholder="https://twitter.com/username"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label for="github" class="block text-sm font-medium text-gray-700">
          GitHub
        </label>
        <input
          type="url"
          id="github"
          bind:value={formData.socialLinks.github}
          placeholder="https://github.com/organization"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label for="linkedin" class="block text-sm font-medium text-gray-700">
          LinkedIn
        </label>
        <input
          type="url"
          id="linkedin"
          bind:value={formData.socialLinks.linkedin}
          placeholder="https://linkedin.com/company/name"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label for="facebook" class="block text-sm font-medium text-gray-700">
          Facebook
        </label>
        <input
          type="url"
          id="facebook"
          bind:value={formData.socialLinks.facebook}
          placeholder="https://facebook.com/pagename"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label for="instagram" class="block text-sm font-medium text-gray-700">
          Instagram
        </label>
        <input
          type="url"
          id="instagram"
          bind:value={formData.socialLinks.instagram}
          placeholder="https://instagram.com/username"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>
    </div>

    <!-- Submit Button -->
    <div class="flex justify-center">
      <button
        type="submit"
        disabled={loading}
        class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Updating Organization...' : 'Update Organization'}
      </button>
    </div>
  </form>
</div>
