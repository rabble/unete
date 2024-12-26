<script>
  import { i18n } from "$lib/i18n";
  import { ParaglideJS } from "@inlang/paraglide-sveltekit";
  import { page } from '$app/stores';
  import '../app.css';
  
  let isLoggedIn = false; // This should be connected to your auth state management
</script>

<div>
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <div class="flex-shrink-0 flex items-center">
            <img src="https://allofus.directory/logo.png" alt="All of Us Logo" class="h-8 w-8 mr-2" />
            <a href="/" class="text-xl font-bold text-purple-600">All of Us Directory</a>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <!-- Organizations Dropdown -->
            <div class="relative group">
              <button class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-gray-500 group-hover:border-gray-300 group-hover:text-gray-700">
                Organizations
                <svg class="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
              <div class="absolute hidden group-hover:block w-48 bg-white shadow-lg py-2 rounded-md" style="top: 100%; margin-top: -2px;">
                <a href="/organizations" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Search</a>
                <a href="/add-organization" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Add Your Organization</a>
                {#if isLoggedIn}
                  <a href="/organizations/manage" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Manage Your Organizations</a>
                {/if}
              </div>
            </div>

            <!-- Topics Dropdown -->
            <div class="relative group">
              <button class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-gray-500 group-hover:border-gray-300 group-hover:text-gray-700">
                Topics
                <svg class="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
              <div class="absolute hidden group-hover:block w-64 bg-white shadow-lg py-2 rounded-md" style="top: 100%; margin-top: -2px;">
                <a href="/topics" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">All Topics</a>
                <div class="border-t border-gray-100 my-1"></div>
                <a href="/focus-areas/climate" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Climate Justice</a>
                <a href="/focus-areas/community" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Community</a>
                <a href="/focus-areas/democracy" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Democracy</a>
                <a href="/focus-areas/economic" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Economic Democracy</a>
                <a href="/focus-areas/electoral" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Electoral Organizing</a>
                <a href="/focus-areas/feminism" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Feminism</a>
                <a href="/focus-areas/food" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Food</a>
                <a href="/focus-areas/healthcare" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Healthcare</a>
                <a href="/focus-areas/housing" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Housing</a>
                <a href="/focus-areas/immigration" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Immigration</a>
                <a href="/focus-areas/indigenous" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Indigenous</a>
                <a href="/focus-areas/lgbtqia" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">LGBTQIA+</a>
                <a href="/focus-areas/palestine" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Palestine Solidarity</a>
                <a href="/focus-areas/racial" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Racial Justice</a>
                <a href="/focus-areas/reproductive" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Reproductive Justice</a>
                <a href="/focus-areas/workplace" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Workplace Justice</a>
                <a href="/focus-areas/youth" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Youth</a>
              </div>
            </div>

            <!-- Social Media Dropdown -->
            <div class="relative group">
              <button class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-gray-500 group-hover:border-gray-300 group-hover:text-gray-700">
                Social Media
                <svg class="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
              <div class="absolute hidden group-hover:block w-48 bg-white shadow-lg py-2 rounded-md" style="top: 100%; margin-top: -2px;">
                <!-- Social Media Links will go here -->
              </div>
            </div>

            <!-- About Dropdown -->
            <div class="relative group">
              <button class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-gray-500 group-hover:border-gray-300 group-hover:text-gray-700">
                About
                <svg class="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
              <div class="absolute hidden group-hover:block w-48 bg-white shadow-lg py-2 rounded-md" style="top: 100%; margin-top: -2px;">
                <a href="/about" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">About</a>
                <a href="/contact" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Contact</a>
                <a href="/add-organization" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Add Organization</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <main>
    <slot></slot>
  </main>

  <footer class="bg-white mt-12 border-t">
    <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
      <div class="flex justify-center space-x-6 md:order-2">
        <a href="/contact" class="text-gray-400 hover:text-gray-500">Contact</a>
        <a href="/add-organization" class="text-gray-400 hover:text-gray-500">Add Organization</a>
      </div>
      <div class="mt-8 md:mt-0 md:order-1">
        <p class="text-center text-base text-gray-400">
          &copy; 2024 All of Us. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</div>
