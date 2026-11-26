<script lang="ts">
	import { api } from '$lib/api';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	/**
	 * A short, grounded read on the day's training, written on request and kept
	 * for the day. The button is enabled only once every workout on the day is
	 * logged or skipped, so the insight always covers the whole set. A stored
	 * read is shown straight away; when the day's logs have since moved, the card
	 * offers to refresh it rather than writing a new one behind the runner's back.
	 */
	let {
		date,
		ready,
		pending,
	}: {
		date: string;
		ready: boolean;
		pending: number;
	} = $props();

	let loading = $state(true);
	let body = $state<string | null>(null);
	let stale = $state(false);
	let writing = $state(false);
	let note = $state<string | null>(null);
	// The date whose fetch is current, so a fast day switch cannot land an old reply.
	let shownDate = $state<string | null>(null);

	const hint = $derived(
		pending === 1
			? 'Log or skip the remaining workout to get an insight for this day.'
			: `Log or skip the ${pending} remaining workouts to get an insight for this day.`,
	);

	$effect(() => {
		const d = date;
		if (d === shownDate) return;
		shownDate = d;
		body = null;
		stale = false;
		note = null;
		loading = true;
		void api
			.dayInsight(d)
			.then((res) => {
				if (shownDate !== d) return;
				body = res.insight?.body ?? null;
				stale = res.insight?.stale ?? false;
			})
			.catch(() => {
				// No read yet, or the call failed; the card just offers the button.
			})
			.finally(() => {
				if (shownDate === d) loading = false;
			});
	});

	async function write() {
		writing = true;
		note = null;
		try {
			const res = await api.generateDayInsight(date);
			body = res.insight?.body ?? null;
			stale = res.insight?.stale ?? false;
		} catch (e) {
			note = e instanceof Error ? e.message : 'Could not write an insight just now. Try again.';
		} finally {
			writing = false;
		}
	}
</script>

{#if !loading}
	<section aria-labelledby="insights">
		<SectionHeader id="insights" eyebrow="Insights" />
		<Card>
			{#if body}
				<p class="text-sm">{body}</p>
				{#if stale}
					{#if ready}
						<button
							type="button"
							onclick={write}
							disabled={writing}
							class="mt-3 rounded-md border border-hairline px-3 py-2 text-sm text-signal-ink hover:border-signal disabled:opacity-60"
						>
							{writing ? 'Updating…' : 'Update insight'}
						</button>
						<p class="mt-2 text-xs text-steel">You added to this day after the read was written.</p>
					{:else}
						<p class="mt-3 text-sm text-steel">{hint}</p>
					{/if}
				{/if}
			{:else}
				<p class="text-sm text-steel">
					{ready
						? 'A short read on how the day went, written from your logged workouts.'
						: hint}
				</p>
				<button
					type="button"
					onclick={write}
					disabled={!ready || writing}
					class="mt-3 block w-full rounded-md bg-ink px-4 py-3 text-center text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
				>
					{writing ? 'Writing…' : 'Get insight'}
				</button>
			{/if}
			{#if note}
				<p class="mt-2 text-sm text-steel">{note}</p>
			{/if}
		</Card>
	</section>
{/if}
