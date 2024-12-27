<script lang="ts">
  export let type: 'topic' | 'engagement' | 'location';
  export let value: string;

  const getHref = (type: string, value: string) => {
    const slug = value.toLowerCase().replace(/\s+/g, '-');
    switch(type) {
      case 'topic':
        return `/topics/${slug}`;
      case 'engagement':
        return `/engagement/${slug}`;
      case 'location':
        return `/locations/${slug}`;
      default:
        return '#';
    }
  };
</script>

<a 
  href={getHref(type, value)}
  class="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors mr-2 mb-2"
>
  {value}
</a>
