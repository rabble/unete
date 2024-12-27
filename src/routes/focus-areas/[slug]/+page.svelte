<script lang="ts">
  import { topics } from '$lib/topics';

  export let data;
  export let data;
  const { topic, organizations } = data;

  // Get all engagement types from organizations
  const engagementTypes = [...new Set(
    organizations.flatMap(org => 
      org.tags?.filter(t => t[0] === 'engagement')
        .map(t => t[1]) || []
    )
  )];

  // Count organizations per engagement type
  const engagementCounts = engagementTypes.reduce((acc, type) => {
    acc[type] = organizations.filter(org => 
      org.tags?.some(t => t[0] === 'engagement' && t[1] === type)
    ).length;
    return acc;
  }, {});
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <!-- Focus Areas Sidebar -->
  <div class="mb-8">
    <h3 class="text-xl font-bold mb-4">Focus Areas</h3>
    <ul class="space-y-2">
      {#each topics as t}
        <li>
          <a 
            href="/focus-areas/{t.slug}" 
            class="text-gray-700 hover:text-purple-600 {t.slug === topic.slug ? 'font-bold text-purple-600' : ''}"
          >
            {t.title} {t.count}
          </a>
        </li>
      {/each}
    </ul>
  </div>

  <!-- Engagement Types -->
  <div class="mb-12">
    <h3 class="text-xl font-bold mb-4">Engagement Types</h3>
    <ul class="space-y-2">
      {#each Object.entries(engagementCounts) as [type, count]}
        <li>
          <a 
            href="/engagement-types/{type.toLowerCase()}" 
            class="text-gray-700 hover:text-purple-600"
          >
            {type} {count}
          </a>
        </li>
      {/each}
    </ul>
  </div>

  <!-- Main Content -->
  <div>
    <h1 class="text-4xl font-bold mb-8">{topic.title}</h1>

    <section class="prose max-w-none mb-12">
      <h2 class="text-2xl font-semibold mb-4">About this Movement</h2>
      <p class="mb-8">{topic.description}</p>
    </section>

    <section class="mb-12">
      <h2 class="text-2xl font-semibold mb-6">Organizations Working on {topic.title}</h2>
      
      <div class="space-y-8">
        {#each organizations as org}
          <div class="bg-white rounded-lg shadow-lg p-6">
            <a href="/organizations/{org.id}" class="block">
              <h3 class="text-2xl font-semibold mb-2">{org.name}</h3>
              {#if org.category}
                <p class="text-purple-600 mb-4">{org.category}</p>
              {/if}
              <p class="text-gray-700 mb-6">{org.description}</p>
              
              {#if org.focusAreas?.length > 0}
                <div class="mb-4">
                  <h4 class="font-semibold mb-2">Focus Areas:</h4>
                  <p class="text-gray-600">{org.focusAreas.join(' ')}</p>
                </div>
              {/if}
              
              {#if org.locations?.length > 0}
                <div>
                  <h4 class="font-semibold mb-2">Locations:</h4>
                  <p class="text-gray-600">{org.locations.join(' ')}</p>
                </div>
              {/if}
            </a>
          </div>
        {/each}
      </div>
    </section>
  </div>
</div>
