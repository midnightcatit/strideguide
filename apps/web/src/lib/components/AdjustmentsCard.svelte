<script lang="ts">
	import { suggestAdjustments, type AdaptWeek } from '@strideguide/shared/plan';
	import { store } from '$lib/planStore.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	const DISMISS_KEY = 'sg:adjust-dismissed';
	let dismissed = $state<string[]>([]);

	const todayIso = new Date().toISOString().slice(0, 10);

	const adjustments = $derived.by(() => {
		if (!store.plan) return [];
		const weeks: AdaptWeek[] = store.plan.weeks.map((w) => ({
			weekNumber: w.weekNumber,
			startDate: w.startDate,
			targetVolumeKm: w.targetVolumeKm ?? null,
			sessions: w.sessions,
		}));
		return suggestAdjustments(store.logs, weeks, todayIso).filter((a) => !dismissed.includes(a.id));
	});

	const hasWarn = $derived(adjustments.some((a) => a.severity === 'warn'));

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
</script>

{#if adjustments.length}
	<section aria-labelledby="adjustments" class="mb-7">
		<SectionHeader id="adjustments" eyebrow="Suggested adjustments" meta={String(adjustments.length)} />
		<Card>
			<ul class="divide-y divide-hairline">
				{#each adjustments as a (a.id)}
					<li class="py-3 first:pt-0 last:pb-0">
						<div class="flex items-baseline justify-between gap-3">
							<p class="text-sm {a.severity === 'warn' ? 'text-ink font-medium' : 'text-ink'}">{a.title}</p>
							<button
								type="button"
								onclick={() => dismiss(a.id)}
								class="shrink-0 text-xs text-steel hover:text-signal-ink"
							>
								Dismiss
							</button>
						</div>
						<p class="mt-1 text-sm text-steel">{a.detail}</p>
					</li>
				{/each}
			</ul>
			{#if hasWarn}
				<a
					href="/onboarding"
					class="mt-3 block rounded-md border border-hairline px-4 py-3 text-center text-sm hover:border-signal hover:text-signal-ink"
				>
					Rebuild plan with these changes
				</a>
			{/if}
			<p class="mt-3 text-xs text-steel">Your plan is never changed without you.</p>
		</Card>
	</section>
{/if}
