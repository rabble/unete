<script lang="ts">
  import { ORGANIZATION, type OrganizationContent, ORGANIZATION_TAGS } from '$lib/nostr/kinds';
  import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
  import { onMount } from 'svelte';

  let ndk: NDK;
  let formData: OrganizationContent = {
    name: '',
    category: '',
    description: '',
    focusAreas: [],
    locations: [],
    engagementTypes: [],
    email: '',
    website: '',
    about: '',
    mission: '',
    vision: '',
    founded: '',
    size: '',
    languages: [],
    socialLinks: {}
  };

  // Available options for select fields
  const focusAreaOptions = [
    'Housing',
    'Racial Justice',
    'Economic Democracy',
    'Community',
    'Immigration',
    'Youth',
    'Climate Justice',
    'Workplace Justice',
    'Feminism',
    'LGBTQIA+',
    'Indigenous',
    'Food',
    'Healthcare',
    'Education',
    'Democracy',
    'Palestine Solidarity',
    'Legal',
    'International'
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

  onMount(() => {
    ndk = new NDK({
      explicitRelayUrls: [
        'wss://relay.nos.social',
        'wss://relay.damus.io',
        'wss://relay.nostr.band'
      ]
    });
    ndk.connect();
  });

  async function handleSubmit() {
    try {
      if (!ndk) {
        throw new Error('NDK not initialized');
      }

      // Create new NDKEvent
      const event = new NDKEvent(ndk);
      event.kind = ORGANIZATION;
      event.content = JSON.stringify(formData);
      
      // Add required tags
      event.tags = [
        [ORGANIZATION_TAGS.IDENTIFIER, formData.name.toLowerCase().replace(/\s+/g, '-')],
        ...formData.focusAreas.map(area => [ORGANIZATION_TAGS.FOCUS_AREA, area]),
        ...formData.locations.map(location => [ORGANIZATION_TAGS.LOCATION, location]),
        ...formData.engagementTypes.map(type => [ORGANIZATION_TAGS.ENGAGEMENT, type])
      ];

      // Add optional tags if they exist
      if (formData.website) {
        event.tags.push([ORGANIZATION_TAGS.WEBSITE, formData.website]);
      }
      if (formData.email) {
        event.tags.push([ORGANIZATION_TAGS.CONTACT, formData.email]);
      }
      if (formData.languages?.length) {
        formData.languages.forEach(lang => 
          event.tags.push([ORGANIZATION_TAGS.LANGUAGE, lang])
        );
      }

      // Sign and publish event
      await event.publish();
      
      alert('Organization submitted successfully!');
      // Reset form
      formData = {
        name: '',
        category: '',
        description: '',
        focusAreas: [],
        locations: [],
        engagementTypes: [],
        email: '',
        website: '',
        about: '',
        mission: '',
        vision: '',
        founded: '',
        size: '',
        languages: [],
        socialLinks: {}
      };
    } catch (error) {
      console.error('Error submitting organization:', error);
      alert('Error submitting organization. Please try again.');
    }
  }
</script>

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
