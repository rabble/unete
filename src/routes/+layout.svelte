<script>
  import { i18n } from "$lib/i18n";
  import { ParaglideJS } from "@inlang/paraglide-sveltekit";
  import '../app.css';
</script>

<ParaglideJS {i18n}>
	<slot></slot>
</ParaglideJS>
