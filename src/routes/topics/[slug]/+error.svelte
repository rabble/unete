<script lang="ts">
    import { page } from '$app/stores';
</script>

<div class="container mx-auto px-4 py-8">
    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
        <h1 class="text-2xl font-bold text-yellow-700 mb-2">Topic Not Found</h1>
        <p class="text-yellow-700">{$page.error?.message || 'The requested topic could not be found.'}</p>
        <a href="/topics" class="inline-block mt-4 text-purple-600 hover:text-purple-800 font-medium">
            ← Back to Topics
        </a>
    </div>
</div>
