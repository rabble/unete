<script>
  import { getContext } from 'svelte';
  const login = getContext('login');
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-6">Join All Of Us</h1>
  
  <div class="prose max-w-none">
    <h2 class="text-2xl font-semibold mb-4">Stand Up, Take Action, Join A Movement</h2>
    <p class="mb-4">
      All of Us Directory is built on Nostr - a revolutionary protocol that empowers activists with powerful tools and connections. 
      Unlike traditional platforms, Nostr creates an unstoppable digital commons where movements can organize freely, 
      without fear of censorship or control.
    </p>

    <h2 class="text-2xl font-semibold mb-4">A Central Source for Movement Building</h2>
    <p class="mb-4">
      With Nostr powering our directory:
    </p>
    <ul class="list-disc ml-6 mb-6">
      <li class="mb-2">Your movement's voice can't be silenced by corporate or government interference</li>
      <li class="mb-2">Organizations maintain complete control of their information and connections</li>
      <li class="mb-2">The network remains accessible even if specific websites are blocked</li>
      <li class="mb-2">Activists can coordinate securely using strong encryption</li>
      <li class="mb-2">Information flows freely across digital borders and firewalls</li>
      <li class="mb-2">Communities can build lasting connections for sustained organizing</li>
    </ul>

    <h2 class="text-2xl font-semibold mb-4">Built for the Global Movement</h2>
    <p class="mb-6">
      What activists have always needed is a central source of information that can't be shut down or controlled. 
      All of Us Directory uses Nostr to create exactly that - an unstoppable network where your organizations, 
      connections, and communications stay intact no matter what. The directory lives on a distributed network, 
      making it resilient against any attempts to disrupt activist organizing.
    </p>

    <p class="mb-6">
      When you join All of Us Directory through Nostr, you're not just joining another website - you're becoming 
      part of an open-source digital commons built to amplify movements and create lasting social change. This is 
      your portal to unite with activists under one decentralized network.
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
