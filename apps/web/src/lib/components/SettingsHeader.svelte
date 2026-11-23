<script lang="ts">
	// A settings subpage shows its title and nothing else. It deliberately carries no
	// back control, so a tap can never land on a previous settings subpage. The way
	// out of a subpage is the Settings tab in the app header, which goes back to the
	// settings list at /settings.
	let { title }: { title: string } = $props();
</script>

<header class="mb-6">
	<h1 class="font-display text-2xl font-bold">{title}</h1>
</header>
