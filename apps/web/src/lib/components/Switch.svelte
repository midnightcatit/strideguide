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
	class="switch-track relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border {checked
		? 'border-ok bg-ok'
		: 'border-hairline-strong bg-sunken'}"
>
	<span
		class="switch-knob block h-5 w-5 rounded-full bg-paper shadow {checked ? 'translate-x-6' : 'translate-x-1'}"
		aria-hidden="true"
	></span>
</button>

<style>
	.switch-track {
		transition:
			background-color var(--dur-2) var(--ease-out),
			border-color var(--dur-2) var(--ease-out),
			transform var(--dur-1) var(--ease-out);
	}
	.switch-knob {
		transition: transform var(--dur-2) var(--ease-out);
	}
	@media (prefers-reduced-motion: reduce) {
		.switch-track,
		.switch-knob {
			transition: none;
		}
	}
</style>
