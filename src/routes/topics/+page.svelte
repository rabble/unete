<script lang="ts">
  import { topics } from '$lib/topics';
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-4xl font-bold mb-8">Movement Topics</h1>

  <section class="prose max-w-none mb-12">
    <h2 class="text-2xl font-semibold mb-4">About All of Us Directory</h2>
    <p class="mb-4">
      Welcome to the All of Us Directory, a comprehensive resource connecting
      individuals with organizations working across various social justice
      movements.
    </p>
    <p class="mb-8">
      Browse the topics below to learn more about each movement area and find
      organizations working on issues you care about. Whether you're looking
      to get involved locally or connect with national campaigns, you'll find
      opportunities to contribute your skills and energy to building a better
      world.
    </p>
  </section>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    {#each topics as topic}
      <div class="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:scale-[1.02] hover:shadow-xl">
        <a href="/topics/{topic.slug}" class="block focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 rounded-lg">
          <div class="p-6 hover:bg-gray-50 transition-colors">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-xl font-semibold mb-1">{topic.title}</h3>
                <p class="text-gray-600">{topic.count} organizations</p>
              </div>
              <img src={topic.icon} alt={topic.title} class="w-16 h-16" />
            </div>
            <div class="border-t border-gray-200 my-4"></div>
            <p class="text-gray-700">{topic.description}</p>
            <div class="mt-4">
              <span class="text-purple-600 hover:text-purple-800 inline-flex items-center">
                Learn more 
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
          </div>
        </a>
      </div>
    {/each}
  </div>
</div>
