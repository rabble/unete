<script lang="ts">
  import type { OrganizationContent, OrganizationCategory } from '$lib/nostr/kinds';
  import { createOrganization } from '$lib/nostr/organizations';
  import { getTopics } from '$lib/topics';
  import NDK, { NDKNip07Signer } from '@nostr-dev-kit/ndk';
  import { onMount } from 'svelte';
  import { ValidationError, SignerRequiredError, PublishError } from '$lib/nostr/errors';

  let ndk: NDK;
  let focusAreas: string[] = [];
  let error: string | null = null;
  let success: boolean = false;
  let loading: boolean = false;

  // Form fields
  let name = '';
  let category: OrganizationCategory = 'Nonprofit';
  
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
  let description = '';
  let selectedFocusAreas: string[] = [];
  let locations: string[] = [];
  let engagementTypes: string[] = [];
  let website = '';
  let picture = '';
  let email = '';
  let about = '';
  let mission = '';
  let vision = '';
  let founded = '';
  let size = '';
  let languages: string[] = [];
  let socialLinks = {
    twitter: '',
    github: '',
    linkedin: '',
    facebook: '',
    instagram: ''
  };

  // Available options
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
    'Direct Action',
    'Community Organizing',
    'Policy Advocacy',
    'Education',
    'Mutual Aid',
    'Legal Support',
    'Research',
    'Media',
    'Technical Support'
  ];

  const languageOptions = [
    'English',
    'Spanish',
    'French',
    'Portuguese',
    'Arabic',
    'Chinese',
    'Hindi'
  ];

  const sizeOptions = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501+'
  ];

  onMount(async () => {
    ndk = new NDK({
      explicitRelayUrls: [
        'wss://relay.nos.social',
        'wss://relay.damus.io',
        'wss://relay.nostr.band'
      ],
      signer: new NDKNip07Signer()
    });
    await ndk.connect();
    
    // Load focus areas
    focusAreas = await getTopics(ndk);
  });

  function toggleSelection(array: string[], item: string) {
    const index = array.indexOf(item);
    if (index === -1) {
      array.push(item);
    } else {
      array.splice(index, 1);
    }
    array = [...array]; // Trigger reactivity
  }

  async function handleSubmit() {
    error = null;
    success = false;
    loading = true;
    
    // Validate URLs
    const urlFields = {
      website,
      picture,
      'Twitter URL': socialLinks.twitter,
      'GitHub URL': socialLinks.github,
      'LinkedIn URL': socialLinks.linkedin,
      'Facebook URL': socialLinks.facebook,
      'Instagram URL': socialLinks.instagram
    };

    const urlPattern = /^https?:\/\/.+/i;
    for (const [field, url] of Object.entries(urlFields)) {
      if (url && !urlPattern.test(url)) {
        error = `${field} must be a valid URL starting with http:// or https://`;
        loading = false;
        return;
      }
    }

    // Validate email
    if (email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        error = 'Please enter a valid email address';
        loading = false;
        return;
      }
    }

    // Validate required arrays
    if (!selectedFocusAreas.length) {
      error = 'Please select at least one focus area';
      loading = false;
      return;
    }

    if (!locations.length) {
      error = 'Please select at least one location';
      loading = false;
      return;
    }

    if (!engagementTypes.length) {
      error = 'Please select at least one engagement type';
      loading = false;
      return;
    }

    try {
      const content: OrganizationContent = {
        name,
        category,
        description,
        focusAreas: selectedFocusAreas,
        locations,
        engagementTypes,
        website,
        picture,
        email,
        about,
        mission,
        vision,
        founded,
        size,
        languages,
        socialLinks
      };

      // Generate a unique identifier for the organization
      const identifier = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const event = await createOrganization(ndk, content, identifier);
      success = true;
      
      // Redirect to the organization view page
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

<style lang="postcss">
</style>

<div class="max-w-4xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold mb-8">Apply to Join the All of Us Directory</h1>

  <div class="bg-white rounded-lg shadow-lg p-8 mb-12">
    <h2 class="text-2xl font-bold mb-6">Does Your Organization Align with and want to be included in the AllofUS directory?</h2>
    
    <p class="mb-6">
      Fill out the form below, the entries will populate your unique organization page in the All of US Directory
    </p>

    <div class="mb-8">
      <h3 class="text-xl font-semibold mb-4">We welcome groups to join our directory if you meet these criteria:</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700">
        <li>Your organization is active in the U.S.</li>
        <li>Your organization is able to welcome and orient desired new members and/or volunteers.</li>
        <li>Your organization takes a progressive, liberatory approach to the issues it focuses on.</li>
        <li>Your organization is non-Commercial, i.e., does it not prioritize profit-making over its core values.</li>
        <li>Your organization avoids divisive sectarianism and ideological purity tests.</li>
        <li>Your organization values mutual support and collective action.</li>
      </ul>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <!-- Basic Information -->
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">Organization Name</label>
        <input
          type="text"
          id="name"
          bind:value={formData.name}
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <!-- Locations -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Locations</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          {#each locationOptions as location}
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                value={location}
                checked={formData.locations.includes(location)}
                on:change={(e) => {
                  if (e.target.checked) {
                    formData.locations = [...formData.locations, location];
                  } else {
                    formData.locations = formData.locations.filter(l => l !== location);
                  }
                }}
                class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span>{location}</span>
            </label>
          {/each}
        </div>
      </div>

      <!-- Focus Areas -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Focus Areas</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          {#each focusAreaOptions as area}
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                value={area}
                checked={formData.focusAreas.includes(area)}
                on:change={(e) => {
                  if (e.target.checked) {
                    formData.focusAreas = [...formData.focusAreas, area];
                  } else {
                    formData.focusAreas = formData.focusAreas.filter(a => a !== area);
                  }
                }}
                class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span>{area}</span>
            </label>
          {/each}
        </div>
      </div>

      <!-- Engagement Types -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Engagement Types</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          {#each engagementTypeOptions as type}
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                value={type}
                checked={formData.engagementTypes.includes(type)}
                on:change={(e) => {
                  if (e.target.checked) {
                    formData.engagementTypes = [...formData.engagementTypes, type];
                  } else {
                    formData.engagementTypes = formData.engagementTypes.filter(t => t !== type);
                  }
                }}
                class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span>{type}</span>
            </label>
          {/each}
        </div>
      </div>

      <!-- Contact Information -->
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Organization Email</label>
        <input
          type="email"
          id="email"
          bind:value={formData.email}
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label for="website" class="block text-sm font-medium text-gray-700">Organization Website</label>
        <input
          type="url"
          id="website"
          bind:value={formData.website}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <!-- Description -->
      <div>
        <label for="description" class="block text-sm font-medium text-gray-700">Organization Description</label>
        <textarea
          id="description"
          bind:value={formData.description}
          required
          rows="4"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        ></textarea>
      </div>

      <!-- Additional Information -->
      <div>
        <label for="mission" class="block text-sm font-medium text-gray-700">Mission Statement</label>
        <textarea
          id="mission"
          bind:value={formData.mission}
          rows="3"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        ></textarea>
      </div>

      <div>
        <label for="vision" class="block text-sm font-medium text-gray-700">Vision Statement</label>
        <textarea
          id="vision"
          bind:value={formData.vision}
          rows="3"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        ></textarea>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label for="founded" class="block text-sm font-medium text-gray-700">Year Founded</label>
          <input
            type="text"
            id="founded"
            bind:value={formData.founded}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="size" class="block text-sm font-medium text-gray-700">Organization Size</label>
          <select
            id="size"
            bind:value={formData.size}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="">Select size...</option>
            <option value="1-10">1-10 members</option>
            <option value="11-50">11-50 members</option>
            <option value="51-200">51-200 members</option>
            <option value="201-1000">201-1000 members</option>
            <option value="1000+">1000+ members</option>
          </select>
        </div>
      </div>

      <div class="pt-6">
        <button
          type="submit"
          class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
        >
          Submit Organization to All of Us Directory
        </button>
      </div>
    </form>
  </div>
</div>
  
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
  let description = '';
  let selectedFocusAreas: string[] = [];
  let locations: string[] = [];
  let engagementTypes: string[] = [];
  let website = '';
  let picture = '';
  let email = '';
  let about = '';
  let mission = '';
  let vision = '';
  let founded = '';
  let size = '';
  let languages: string[] = [];
  let socialLinks = {
    twitter: '',
    github: '',
    linkedin: '',
    facebook: '',
    instagram: ''
  };

  // Available options
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
    'Direct Action',
    'Community Organizing',
    'Policy Advocacy',
    'Education',
    'Mutual Aid',
    'Legal Support',
    'Research',
    'Media',
    'Technical Support'
  ];

  const languageOptions = [
    'English',
    'Spanish',
    'French',
    'Portuguese',
    'Arabic',
    'Chinese',
    'Hindi'
  ];

  const sizeOptions = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501+'
  ];

  onMount(async () => {
    ndk = new NDK({
      explicitRelayUrls: [
        'wss://relay.nos.social',
        'wss://relay.damus.io',
        'wss://relay.nostr.band'
      ],
      signer: new NDKNip07Signer()
    });
    await ndk.connect();
    
    // Load focus areas
    focusAreas = await getTopics(ndk);
  });

  function toggleSelection(array: string[], item: string) {
    const index = array.indexOf(item);
    if (index === -1) {
      array.push(item);
    } else {
      array.splice(index, 1);
    }
    array = [...array]; // Trigger reactivity
  }

  async function handleSubmit() {
    error = null;
    success = false;
    loading = true;
    
    // Validate URLs
    const urlFields = {
      website,
      picture,
      'Twitter URL': socialLinks.twitter,
      'GitHub URL': socialLinks.github,
      'LinkedIn URL': socialLinks.linkedin,
      'Facebook URL': socialLinks.facebook,
      'Instagram URL': socialLinks.instagram
    };

    const urlPattern = /^https?:\/\/.+/i;
    for (const [field, url] of Object.entries(urlFields)) {
      if (url && !urlPattern.test(url)) {
        error = `${field} must be a valid URL starting with http:// or https://`;
        loading = false;
        return;
      }
    }

    // Validate email
    if (email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        error = 'Please enter a valid email address';
        loading = false;
        return;
      }
    }

    // Validate required arrays
    if (!selectedFocusAreas.length) {
      error = 'Please select at least one focus area';
      loading = false;
      return;
    }

    if (!locations.length) {
      error = 'Please select at least one location';
      loading = false;
      return;
    }

    if (!engagementTypes.length) {
      error = 'Please select at least one engagement type';
      loading = false;
      return;
    }

    try {
      const content: OrganizationContent = {
        name,
        category,
        description,
        focusAreas: selectedFocusAreas,
        locations,
        engagementTypes,
        website,
        picture,
        email,
        about,
        mission,
        vision,
        founded,
        size,
        languages,
        socialLinks
      };

      // Generate a unique identifier for the organization
      const identifier = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const event = await createOrganization(ndk, content, identifier);
      success = true;
      
      // Redirect to the organization view page
      window.location.href = `/organizations/${event.id}`;
      name = '';
      category = '';
      description = '';
      selectedFocusAreas = [];
      locations = [];
      engagementTypes = [];
      website = '';
      picture = '';
      email = '';
      about = '';
      mission = '';
      vision = '';
      founded = '';
      size = '';
      languages = [];
      socialLinks = {
        twitter: '',
        github: '',
        linkedin: '',
        facebook: '',
        instagram: ''
      };
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

<div class="max-w-4xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Add Your Organization</h1>

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {/if}

  {#if success}
    <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
      <p class="text-green-700">Organization successfully added!</p>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="space-y-8">
    <!-- Basic Information -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Basic Information</h2>
      
      <div class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Organization Name *</label>
          <input
            type="text"
            id="name"
            bind:value={name}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="category" class="block text-sm font-medium text-gray-700">Category *</label>
          <select
            id="category"
            bind:value={category}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            {#each categoryOptions as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">Description *</label>
          <textarea
            id="description"
            bind:value={description}
            required
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Focus Areas -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Focus Areas *</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each focusAreas as area}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedFocusAreas.includes(area)}
              on:change={() => toggleSelection(selectedFocusAreas, area)}
              class="form-checkbox h-5 w-5 text-purple-600"
            />
            <span>{area}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Locations -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Locations *</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each locationOptions as location}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={locations.includes(location)}
              on:change={() => toggleSelection(locations, location)}
              class="form-checkbox h-5 w-5 text-purple-600"
            />
            <span>{location}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Engagement Types -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Engagement Types *</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each engagementTypeOptions as type}
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={engagementTypes.includes(type)}
              on:change={() => toggleSelection(engagementTypes, type)}
              class="form-checkbox h-5 w-5 text-purple-600"
            />
            <span>{type}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Contact Information -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Contact Information</h2>
      
      <div class="space-y-4">
        <div>
          <label for="website" class="block text-sm font-medium text-gray-700">Website</label>
          <input
            type="url"
            id="website"
            bind:value={website}
            placeholder="https://"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            bind:value={email}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="picture" class="block text-sm font-medium text-gray-700">Profile Picture URL</label>
          <input
            type="url"
            id="picture"
            bind:value={picture}
            placeholder="https://"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>

    <!-- Additional Information -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Additional Information</h2>
      
      <div class="space-y-4">
        <div>
          <label for="about" class="block text-sm font-medium text-gray-700">About</label>
          <textarea
            id="about"
            bind:value={about}
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          ></textarea>
        </div>

        <div>
          <label for="mission" class="block text-sm font-medium text-gray-700">Mission</label>
          <textarea
            id="mission"
            bind:value={mission}
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          ></textarea>
        </div>

        <div>
          <label for="vision" class="block text-sm font-medium text-gray-700">Vision</label>
          <textarea
            id="vision"
            bind:value={vision}
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          ></textarea>
        </div>

        <div>
          <label for="founded" class="block text-sm font-medium text-gray-700">Founded Year</label>
          <input
            type="text"
            id="founded"
            bind:value={founded}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="size" class="block text-sm font-medium text-gray-700">Organization Size</label>
          <select
            id="size"
            bind:value={size}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="">Select size...</option>
            {#each sizeOptions as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Languages</label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            {#each languageOptions as language}
              <label class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={languages.includes(language)}
                  on:change={() => toggleSelection(languages, language)}
                  class="form-checkbox h-5 w-5 text-purple-600"
                />
                <span>{language}</span>
              </label>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- Social Links -->
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Social Media Links</h2>
      
      <div class="space-y-4">
        <div>
          <label for="twitter" class="block text-sm font-medium text-gray-700">Twitter</label>
          <input
            type="url"
            id="twitter"
            bind:value={socialLinks.twitter}
            placeholder="https://twitter.com/username"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="github" class="block text-sm font-medium text-gray-700">GitHub</label>
          <input
            type="url"
            id="github"
            bind:value={socialLinks.github}
            placeholder="https://github.com/username"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="linkedin" class="block text-sm font-medium text-gray-700">LinkedIn</label>
          <input
            type="url"
            id="linkedin"
            bind:value={socialLinks.linkedin}
            placeholder="https://linkedin.com/company/name"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="facebook" class="block text-sm font-medium text-gray-700">Facebook</label>
          <input
            type="url"
            id="facebook"
            bind:value={socialLinks.facebook}
            placeholder="https://facebook.com/pagename"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="instagram" class="block text-sm font-medium text-gray-700">Instagram</label>
          <input
            type="url"
            id="instagram"
            bind:value={socialLinks.instagram}
            placeholder="https://instagram.com/username"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>

    <div class="flex justify-center">
      <button
        type="submit"
        disabled={loading}
        class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Adding Organization...' : 'Add Organization'}
      </button>
    </div>
  </form>
</div>
