<script>
  import { i18n } from "$lib/i18n";
  import { ParaglideJS } from "@inlang/paraglide-sveltekit";
  import { page } from '$app/stores';
  import '../app.css';
</script>

<div>
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <a href="/" class="text-xl font-bold text-purple-600">All of Us</a>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <a 
              href="/" 
              class="inline-flex items-center px-1 pt-1 border-b-2 {$page.url.pathname === '/' ? 'border-purple-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
            >
              Home
            </a>
            <a 
              href="/about" 
              class="inline-flex items-center px-1 pt-1 border-b-2 {$page.url.pathname === '/about' ? 'border-purple-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
            >
              About
            </a>
            <a 
              href="/organizations" 
              class="inline-flex items-center px-1 pt-1 border-b-2 {$page.url.pathname === '/organizations' ? 'border-purple-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
            >
              Organizations
            </a>
            <a 
              href="/profile" 
              class="inline-flex items-center px-1 pt-1 border-b-2 {$page.url.pathname === '/profile' ? 'border-purple-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
            >
              Profile
            </a>
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
        <a href="/join-directory" class="text-gray-400 hover:text-gray-500">Join Directory</a>
      </div>
      <div class="mt-8 md:mt-0 md:order-1">
        <p class="text-center text-base text-gray-400">
          &copy; 2024 All of Us. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</div>
