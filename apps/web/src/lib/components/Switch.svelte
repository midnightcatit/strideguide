<script lang="ts">
	let {
		checked,
		label,
		onChange,
	}: {
		checked: boolean;
		label: string;
		onChange: (v: boolean) => void;
	} = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	onclick={() => onChange(!checked)}
	class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors {checked
		? 'border-ok bg-ok'
		: 'border-hairline-strong bg-sunken'}"
>
	<span
		class="block h-5 w-5 rounded-full bg-paper shadow transition-transform {checked ? 'translate-x-6' : 'translate-x-1'}"
		aria-hidden="true"
	></span>
</button>
