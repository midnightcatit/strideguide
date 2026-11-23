<script lang="ts">
	import { onMount } from 'svelte';
	import { suggestAdjustments, type AdaptWeek, type RecoverySignal } from '@strideguide/shared/plan';
	import { store, reloadPlan } from '$lib/planStore.svelte';
	import { api } from '$lib/api';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	const DISMISS_KEY = 'sg:adjust-dismissed';
	let dismissed = $state<string[]>([]);
	let adapting = $state(false);
	let adaptNote = $state<string | null>(null);
	let recoverySignal = $state<RecoverySignal | null>(null);

	const todayIso = new Date().toISOString().slice(0, 10);

	onMount(() => {
		void api
			.recovery()
			.then((r) => {
				if (r.available) recoverySignal = r.signal;
			})
			.catch(() => {
				// no health data; the plan adapts on training alone
			});
	});

	const adjustments = $derived.by(() => {
		if (!store.plan) return [];
		const weeks: AdaptWeek[] = store.plan.weeks.map((w) => ({
			weekNumber: w.weekNumber,
			startDate: w.startDate,
			endDate: w.endDate,
			targetVolumeKm: w.targetVolumeKm ?? null,
			sessions: w.sessions,
		}));
		return suggestAdjustments(store.logs, weeks, todayIso, recoverySignal ?? undefined).filter(
			(a) => !dismissed.includes(a.id),
		);
	});

	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		try {
			dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[];
		} catch {
			dismissed = [];
		}
	});

	function dismiss(id: string) {
		dismissed = [...dismissed, id];
		try {
			localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
		} catch {
			// ignore
		}
	}

	async function adapt() {
		adapting = true;
		adaptNote = null;
		try {
			const res = await api.adaptPlan();
			if (!res.changed) {
				adaptNote = 'Nothing to change just yet. Keep logging and check back.';
			} else {
				const swaps = res.swapped.length;
				adaptNote = `Your plan now builds from week ${res.changedFromWeek}${
					swaps
						? `, with ${swaps} session${swaps === 1 ? '' : 's'} swapped for ones you rated well`
						: ', from your recent training'
				}.`;
				// The rebuilt weeks are new, so let the suggestions re-evaluate.
				dismissed = [];
				try {
					localStorage.removeItem(DISMISS_KEY);
				} catch {
					// ignore
				}
				reloadPlan();
			}
		} catch {
			adaptNote = 'Could not adapt the plan just now. Try again.';
		} finally {
			adapting = false;
		}
	}
</script>

{#if adjustments.length}
	<section aria-labelledby="adjustments" class="mt-7">
		<SectionHeader id="adjustments" eyebrow="Suggested adjustments" meta={String(adjustments.length)} />
		<Card>
			<ul class="divide-y divide-hairline">
				{#each adjustments as a (a.id)}
					<li class="py-3 first:pt-0 last:pb-0">
						<div class="flex items-baseline justify-between gap-3">
							<p class="text-sm {a.severity === 'warn' ? 'font-medium text-warn' : 'text-ink'}">{a.title}</p>
							<button
								type="button"
								onclick={() => dismiss(a.id)}
								class="flex h-11 shrink-0 items-center px-2 text-xs text-steel hover:text-signal-ink"
							>
								Dismiss
							</button>
						</div>
						<p class="mt-1 text-sm text-steel">{a.detail}</p>
					</li>
				{/each}
			</ul>
			<button
				type="button"
				onclick={adapt}
				disabled={adapting}
				class="mt-3 block w-full rounded-md bg-ink px-4 py-3 text-center text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
			>
				{adapting ? 'Adapting…' : 'Adapt my plan'}
			</button>
			{#if adaptNote}
				<p class="mt-2 text-sm text-steel">{adaptNote}</p>
			{/if}
			<p class="mt-3 text-xs text-steel">Only the weeks ahead change, and only when you tap. Past weeks and your logs stay put.</p>
		</Card>
	</section>
{/if}
