<script lang="ts">
  import { onMount } from 'svelte';
  import type { OrganizationContent, OrganizationCategory } from '$lib/nostr/kinds';
  import { initNostrLogin } from '$lib/nostr/login';
  import { createOrganization } from '$lib/nostr/organizations';
  import { getTopics } from '$lib/topics';
  import { ndk, ensureConnection } from '$lib/stores/ndk';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import {
    ValidationError,
    SignerRequiredError,
    PublishError,
  } from '$lib/nostr/errors';

  // --- Reactive Variables ---
  import { FOCUS_AREAS, LOCATION_OPTIONS, ENGAGEMENT_TYPE_OPTIONS, LANGUAGE_OPTIONS } from '$lib/constants';
  let focusAreas: string[] = FOCUS_AREAS;
  let error: string | null = null;
  let success = false;
  let loading = false;
  let isLoggedIn = false;

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

  // Category, location, etc. options
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

  const locationOptions = LOCATION_OPTIONS;
  const engagementTypeOptions = ENGAGEMENT_TYPE_OPTIONS;
  const languageOptions = LANGUAGE_OPTIONS;
  const sizeOptions = [ /* ... */ ];

  // Add new states for tracking progress
  let publishingSteps = {
    validating: { status: '', done: false },
    publishing: { status: '', done: false },
    verifying: { status: '', done: false }
  };
  let verificationCount = 0;

  // --- onMount: Initialize NDK and load data
  onMount(async () => {
    try {
      const ndkInstance = await ensureConnection();
      if (!ndkInstance) {
        throw new Error('Failed to establish NDK connection');
      }

      // Wait for at least one relay to be connected
      let connected = false;
      for (let i = 0; i < 10; i++) {
        const relays = Array.from(ndkInstance.pool.relays.values());
        if (relays.some(r => r.status === 1)) {
          connected = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (!connected) {
        throw new Error('Failed to connect to any relays');
      }
      
      // Initialize Nostr login after NDK is ready
      await initNostrLogin();

      // Check login status
      isLoggedIn = !!ndkInstance.signer;

      // Load dynamic "Focus Areas" from your function
      focusAreas = await getTopics(ndkInstance);
    } catch (err) {
      console.error('Error connecting to NDK or loading topics:', err);
      error = 'Failed to initialize. Please try again.';
    }
  });

  // --- Utility
  function toggleSelection(array: string[], item: string) {
    const index = array.indexOf(item);
    if (index === -1) {
      array.push(item);
    } else {
      array.splice(index, 1);
    }
    // Spread to trigger reactivity
    array = [...array];
  }

  // --- Submit Handler
  async function handleSubmit() {
    error = null;
    success = false;
    loading = true;
    // Reset progress
    publishingSteps = {
      validating: { status: 'Validating organization details...', done: false },
      publishing: { status: 'Preparing to publish...', done: false },
      verifying: { status: 'Waiting for network verification...', done: false }
    };
    verificationCount = 0;

    try {
      if (!ndk?.signer) {
        throw new SignerRequiredError();
      }

      publishingSteps.validating.status = 'Organization details validated';
      publishingSteps.validating.done = true;
      publishingSteps.publishing.status = 'Publishing to Nostr network...';

      const identifier = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Subscribe to verification events
      const unsubscribe = ndk.pool.on('event:verified', () => {
        verificationCount++;
        publishingSteps.verifying.status = `Verified by ${verificationCount} relay${verificationCount === 1 ? '' : 's'}`;
      });

      const event = await createOrganization(formData, identifier);
      
      publishingSteps.publishing.status = 'Published successfully';
      publishingSteps.publishing.done = true;
      publishingSteps.verifying.status = 'Waiting for network verification...';

      // Cleanup listener
      unsubscribe();
      
      success = true;
      publishingSteps.verifying.done = true;
      window.location.href = `/organizations/${event.id}`;
    } catch (e) {
      if (e instanceof ValidationError) {
        error = e.message;
      } else if (e instanceof SignerRequiredError) {
        error = 'Please login with a Nostr extension first';
      } else if (e instanceof PublishError) {
        error = 'Failed to publish organization. Please try again.';
      } else {
        error = 'An unexpected error occurred';
        console.error(e);
      }
    } finally {
      loading = false;
    }
  }
</script>

<!-- Your Svelte Markup -->
<div class="max-w-4xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Add Your Organization</h1>

  {#if !isLoggedIn}
    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <p class="text-yellow-700">
        You need to be logged in to submit an organization. 
        <a href="/get-started" class="underline hover:text-yellow-800">Get started here</a>
      </p>
    </div>
  {/if}

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <p class="text-red-700">
        {#if error.includes('NDK signer required')}
          Please <a href="/get-started" class="underline hover:text-red-800">login with a Nostr extension</a> to create an organization
        {:else}
          {error}
        {/if}
      </p>
    </div>
  {/if}

  {#if success}
    <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
      <p class="text-green-700">Organization successfully added!</p>
    </div>
  {/if}

  {#if loading}
    <div class="text-center p-8 space-y-8">
      <div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div class="space-y-6">
          <!-- Validating -->
          <div class="flex items-center space-x-4">
            {#if publishingSteps.validating.done}
              <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            {:else}
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            {/if}
            <span class={publishingSteps.validating.done ? 'text-green-600' : 'text-gray-600'}>
              {publishingSteps.validating.status}
            </span>
          </div>

          <!-- Publishing -->
          <div class="flex items-center space-x-4">
            {#if publishingSteps.publishing.done}
              <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            {:else if publishingSteps.validating.done}
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            {:else}
              <div class="h-6 w-6"></div>
            {/if}
            <span class={publishingSteps.publishing.done ? 'text-green-600' : 'text-gray-600'}>
              {publishingSteps.publishing.status}
            </span>
          </div>

          <!-- Verifying -->
          <div class="flex items-center space-x-4">
            {#if publishingSteps.verifying.done}
              <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            {:else if publishingSteps.publishing.done}
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            {:else}
              <div class="h-6 w-6"></div>
            {/if}
            <span class={publishingSteps.verifying.done ? 'text-green-600' : 'text-gray-600'}>
              {publishingSteps.verifying.status}
            </span>
          </div>

          {#if verificationCount > 0}
            <div class="mt-4 text-sm text-gray-500">
              Verified by {verificationCount} relay{verificationCount === 1 ? '' : 's'}
            </div>
          {/if}
        </div>
      </div>

      <p class="text-gray-600 text-sm">
        {#if !publishingSteps.verifying.done}
          This process may take a few moments while we verify the publication across the Nostr network.
        {:else}
          Redirecting to your organization's page...
        {/if}
      </p>
    </div>
  {:else}
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
              // Remove old other location if it exists
              const oldOtherIndex = formData.locations.indexOf(otherLocation);
              if (oldOtherIndex !== -1) {
                formData.locations.splice(oldOtherIndex, 1);
              }
              // Add new location if checkbox is checked and text is not empty
              if (
                formData.locations.includes(otherLocation) &&
                otherLocation.trim()
              ) {
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


        <div class="space-y-4">
          <label class="block text-sm font-medium text-gray-700">
            Supporters (estimated)
          </label>
          <div class="flex gap-4">
            <div class="flex-1">
              <label for="supporter-min" class="block text-xs text-gray-500">Minimum range</label>
              <input
                id="supporter-min"
                type="number"
                min="0"
                bind:value={formData.supporter.range[0]}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div class="flex-1">
              <label for="supporter-max" class="block text-xs text-gray-500">Maximum range</label>
              <input
                id="supporter-max"
                type="number"
                min="0"
                bind:value={formData.supporter.range[1]}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
          <div>
            <label for="supporter-desc" class="block text-xs text-gray-500">Description</label>
            <textarea
              id="supporter-desc"
              bind:value={formData.supporter.description}
              rows="2"
              placeholder="Describe your supporter base..."
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            ></textarea>
          </div>
        </div>

        <div class="space-y-4">
          <label class="block text-sm font-medium text-gray-700">
            Staff (estimated)
          </label>
          <div class="flex gap-4">
            <div class="flex-1">
              <label for="staff-min" class="block text-xs text-gray-500">Minimum range</label>
              <input
                id="staff-min"
                type="number"
                min="0"
                bind:value={formData.staff.range[0]}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div class="flex-1">
              <label for="staff-max" class="block text-xs text-gray-500">Maximum range</label>
              <input
                id="staff-max"
                type="number"
                min="0"
                bind:value={formData.staff.range[1]}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
          <div>
            <label for="staff-desc" class="block text-xs text-gray-500">Description</label>
            <textarea
              id="staff-desc"
              bind:value={formData.staff.description}
              rows="2"
              placeholder="Describe your staff structure..."
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            ></textarea>
          </div>
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

        <div>
          <label for="nostr" class="block text-sm font-medium text-gray-700">
            Nostr Public Key
          </label>
          <input
            type="text"
            id="nostr" 
            bind:value={formData.socialLinks.nostr}
            placeholder="npub1..."
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
          {loading ? 'Adding Organization...' : 'Add Organization'}
        </button>
      </div>
    </form>
  {/if}
</div>
