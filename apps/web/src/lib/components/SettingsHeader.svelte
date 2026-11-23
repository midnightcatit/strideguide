<script lang="ts">
	let { title, back = '/settings', backLabel = 'Settings' }: { title: string; back?: string; backLabel?: string } =
		$props();
</script>

<header class="mb-6">
	<a href={back} class="-ml-1 inline-flex items-center gap-1 px-1 py-1 text-sm text-steel hover:text-ink">
		‹ {backLabel}
	</a>
	<h1 class="font-display mt-2 text-2xl font-bold">{title}</h1>
</header>
