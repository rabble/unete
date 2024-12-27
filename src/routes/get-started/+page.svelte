<script>
  import { login } from '$lib/auth';
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-6">Join All Of Us</h1>
  
  <div class="prose max-w-none">
    <h2 class="text-2xl font-semibold mb-4">A Different Kind of Directory</h2>
    <p class="mb-4">
      All of Us Directory is built differently from traditional websites. Instead of storing everything on our own servers,
      we use Nostr - an open protocol that makes our directory accessible to everyone in a way that can't be shut down
      or censored.
    </p>

    <h2 class="text-2xl font-semibold mb-4">Why This Matters</h2>
    <p class="mb-4">
      With Nostr:
    </p>
    <ul class="list-disc ml-6 mb-6">
      <li class="mb-2">Your identity and data belong to you, not us - you control them with your own encryption keys</li>
      <li class="mb-2">The directory's content is stored across many servers (called relays) instead of just one place</li>
      <li class="mb-2">No single organization can control or shut down access to the directory</li>
      <li class="mb-2">Your information remains accessible even if our website goes offline</li>
    </ul>

    <p class="mb-6">
      This makes All of Us Directory more resilient and ensures that social movements and organizations can maintain their 
      connections regardless of what happens to any single website or server.
    </p>

    <h2 class="text-2xl font-semibold mb-4">Ways to Get Started</h2>
    
    <div class="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 class="text-xl font-semibold mb-3">1. Browser Extensions</h3>
      <p class="mb-4">The easiest way to get started is using a browser extension:</p>
      <ul class="list-disc ml-6 mb-4">
        <li><a href="https://getalby.com" class="text-purple-600 hover:text-purple-800">Alby</a> - Popular Chrome/Firefox extension</li>
        <li><a href="https://www.nostr.connect" class="text-purple-600 hover:text-purple-800">Nostr Connect</a> - Chrome extension</li>
      </ul>
    </div>

    <div class="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 class="text-xl font-semibold mb-3">2. Web-Based Options</h3>
      <p class="mb-4">Create and manage your Nostr identity through these web services:</p>
      <ul class="list-disc ml-6 mb-4">
        <li><a href="https://nsec.app" class="text-purple-600 hover:text-purple-800">nsec.app</a> - Simple web-based key management</li>
        <li><a href="https://highlighter.com" class="text-purple-600 hover:text-purple-800">Highlighter</a> - Feature-rich web client</li>
      </ul>
    </div>

    <div class="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 class="text-xl font-semibold mb-3">3. Mobile Options</h3>
      <p class="mb-4">For mobile users:</p>
      <ul class="list-disc ml-6 mb-4">
        <li><a href="https://github.com/nostr-protocol/nostr-protocol.github.io/blob/main/remote-signer.md" class="text-purple-600 hover:text-purple-800">Nostr Remote Signer</a> - Android app for key management</li>
      </ul>
    </div>

    <div class="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 class="text-xl font-semibold mb-3">4. Advanced Users</h3>
      <p class="mb-4">For technical users who want complete control:</p>
      <ul class="list-disc ml-6 mb-4">
        <li>Set up your own identity server</li>
        <li>Use command-line tools to manage your keys</li>
      </ul>
    </div>

    <div class="mt-8">
      <button
        on:click={login}
        class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
      >
        Login with Nostr
      </button>
    </div>
  </div>
</div>
