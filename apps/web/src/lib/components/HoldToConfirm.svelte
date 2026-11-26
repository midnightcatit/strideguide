<script lang="ts">
	import { onDestroy } from 'svelte';
	import { HOLD_MS, holdProgress, holdSecondsLeft } from '$lib/holdToConfirm';

	let {
		label,
		holdingLabel = 'Keep holding,',
		onconfirm,
		disabled = false,
	}: {
		label: string;
		holdingLabel?: string;
		onconfirm: () => void;
		disabled?: boolean;
	} = $props();

	let elapsed = $state(0);
	let holding = $state(false);
	let timer: ReturnType<typeof setInterval> | undefined;

	const progress = $derived(holdProgress(elapsed));
	const secondsLeft = $derived(holdSecondsLeft(elapsed));

	function start() {
		if (disabled || holding) return;
		holding = true;
		elapsed = 0;
		const startedAt = Date.now();
		timer = setInterval(() => {
			elapsed = Date.now() - startedAt;
			if (elapsed >= HOLD_MS) {
				stop();
				onconfirm();
			}
		}, 50);
	}

	function stop() {
		holding = false;
		if (timer !== undefined) clearInterval(timer);
		timer = undefined;
		elapsed = 0;
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			start();
		}
	}

	onDestroy(stop);
</script>

<button
	type="button"
	{disabled}
	onpointerdown={start}
	onpointerup={stop}
	onpointerleave={stop}
	onpointercancel={stop}
	onkeydown={onKey}
	onkeyup={stop}
	onblur={stop}
	aria-label={holding ? `${label}. ${secondsLeft} seconds left.` : label}
	class="relative w-full overflow-hidden rounded-lg border border-hairline-strong px-4 py-2.5 text-sm text-steel hover:border-signal hover:text-signal-ink disabled:opacity-50"
>
	<span
		class="absolute inset-y-0 left-0 bg-signal/20"
		style="width: {Math.round(progress * 100)}%"
	></span>
	<span class="relative">{holding ? `${holdingLabel} ${secondsLeft}` : label}</span>
</button>
