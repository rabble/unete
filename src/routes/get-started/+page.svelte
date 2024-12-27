<script>
  import { login } from '$lib/auth';
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-6">Join All Of Us</h1>
  
  <div class="prose max-w-none">
    <h2 class="text-2xl font-semibold mb-4">Why We Use Nostr</h2>
    <p class="mb-4">
      Instead of maintaining a traditional centralized database of user accounts, All of Us Directory uses Nostr - 
      a decentralized protocol that gives you complete control over your identity. Your account credentials are never 
      stored on our servers, making the system more secure and resistant to censorship.
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
