<script lang="ts">
	// A pass-through layout: the group exists for the `bleed` data flag, not for
	// any markup. The pages under it render inside the shell's full-bleed main.
	let { children } = $props();
</script>

{@render children()}
