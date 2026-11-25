<script lang="ts">
	// A settings subpage title. The way back to the settings list is the app
	// header's breadcrumb, so this is just the heading. `back` and `backLabel`
	// stay in the type for the call sites.
	let { title }: { title: string; back?: string; backLabel?: string } = $props();
</script>

<h1 class="font-display mb-5 text-2xl font-bold">{title}</h1>
