<script lang="ts">
  let name = '';
  let email = '';
  let message = '';
  let submitted = false;

  async function handleSubmit() {
    // TODO: Implement form submission
    submitted = true;
  }
</script>

<div class="max-w-4xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold text-center mb-12">Contact Us</h1>

  <div class="bg-white rounded-lg shadow-lg p-8">
    <p class="text-gray-700 mb-8 text-center">
      You can reach us via email at <a href="mailto:contact@allofus.directory" class="text-purple-600 hover:text-purple-800">contact@allofus.directory</a>
    </p>

    {#if submitted}
      <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <p class="text-green-700">
          Thank you for your message. We'll get back to you soon.
        </p>
      </div>
    {:else}
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            id="name"
            bind:value={name}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            bind:value={email}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label for="message" class="block text-sm font-medium text-gray-700">Message</label>
          <textarea
            id="message"
            bind:value={message}
            required
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          ></textarea>
        </div>

        <div class="text-center">
          <button
            type="submit"
            class="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    {/if}
  </div>
</div>
