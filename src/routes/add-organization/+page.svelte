<script lang="ts">
  import { onMount } from 'svelte';
  import type { OrganizationContent, OrganizationCategory } from '$lib/nostr/kinds';
  import { createOrganization } from '$lib/nostr/organizations';
  import { getTopics } from '$lib/topics';
  import NDK, { NDKNip07Signer } from '@nostr-dev-kit/ndk';
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

  // Form data object
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

  // Category, location, etc. options
  const categoryOptions: OrganizationCategory[] = [ /* ... */ ];
  const locationOptions = [ /* ... */ ];
  const engagementTypeOptions = [ /* ... */ ];
  const languageOptions = [ /* ... */ ];
  const sizeOptions = [ /* ... */ ];

  // --- onMount: Initialize NDK and load data
  onMount(async () => {
    ndk = new NDK({
      explicitRelayUrls: [
        'wss://relay.nos.social',
        'wss://relay.damus.io',
        'wss://relay.nostr.band',
      ],
      signer: new NDKNip07Signer(),
    });

    await ndk.connect();
    focusAreas = await getTopics(ndk); // e.g. load dynamic "Focus Areas"
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

    // 1) Validate
    // 2) Submit
    // 3) Catch errors

    try {
      // Example:
      const identifier = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const event = await createOrganization(ndk, formData, identifier);
      success = true;
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