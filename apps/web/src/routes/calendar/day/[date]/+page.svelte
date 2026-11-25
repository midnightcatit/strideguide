<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		store,
		ensurePlan,
		weekForDate,
		planProfileName,
	} from '$lib/planStore.svelte';
	import { isSkipped, skipSession, unskipSession } from '$lib/skipped.svelte';
	import { clearStarted, markStarted } from '$lib/started.svelte';
	import { clearProgress } from '$lib/sessionProgress.svelte';
	import { type ClientSession, addDaysIso, dayIndexInWeek, localIso } from '$lib/plan';
	import { sessionHref, logHref, playHref } from '$lib/sessionNav';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import SessionCarousel from '$lib/components/SessionCarousel.svelte';
	import Card from '$lib/components/Card.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';

	const date = $derived(page.params.date ?? '');
	const from = $derived(`/calendar/day/${date}`);
	const todayIso = localIso();

	const week = $derived(weekForDate(date));
	const dayIdx = $derived(week?.startDate ? dayIndexInWeek(week.startDate, date) : -1);
	const sessions = $derived(week ? week.sessions.filter((s) => s.day === dayIdx) : []);
	const loggedBySession = $derived(
		new Map(store.logs.filter((l) => l.sessionId).map((l) => [l.sessionId as string, l])),
	);
	const dayInPlan = $derived(!!week);
	// A day inside the last 30 days can be edited; older days are read-only history.
	const editable = $derived(date >= addDaysIso(todayIso, -30));
	const label = $derived(
		new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC',
		}),
	);
	const planStart = $derived(store.plan?.weeks[0]?.startDate ?? null);
	const planEnd = $derived(
		store.plan?.weeks.length ? (store.plan.weeks[store.plan.weeks.length - 1]?.endDate ?? null) : null,
	);
	const outsidePlanNote = $derived(
		planStart && planEnd
			? `Your plan runs ${dateHeading(planStart)} to ${dateHeading(planEnd)}. Pick a day inside it to add a workout.`
			: 'Your plan has no days yet. Pick a day inside it to add a workout.',
	);

	let revealId = $state<string | null>(null);
	let confirm = $state<{
		title: string;
		body: string;
		confirmLabel: string;
		action: () => void;
	} | null>(null);

	onMount(() => {
		const reveal = page.url.searchParams.get('reveal');
		if (reveal) revealId = reveal;
		void ensurePlan();
	});

	function dateHeading(iso: string): string {
		return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC',
		});
	}

	function confirmIfFuture(label: string, action: () => void): boolean {
		if (date > todayIso) {
			confirm = {
				title: `${label} a future workout?`,
				body: `This one is on ${date}. ${label} it anyway?`,
				confirmLabel: `${label} anyway`,
				action,
			};
			return true;
		}
		return false;
	}
	function startSession(s: ClientSession) {
		if (confirmIfFuture('Start', () => { markStarted(s.id); void goto(playHref(s.id, from)); })) return;
		markStarted(s.id);
		void goto(playHref(s.id, from));
	}
	function logSession(s: ClientSession) {
		if (confirmIfFuture('Log', () => goto(logHref(s.id, from)))) return;
		void goto(logHref(s.id, from));
	}
</script>

{#if store.error}
	<p class="mt-6 text-sm text-steel">{store.error}</p>
{:else if !store.loaded && !store.plan}
	<p class="tabular mt-6 text-sm text-steel">Loading…</p>
{:else}
	<header class="mb-4">
		<p class="tabular text-xs uppercase tracking-widest text-steel">Day</p>
		<h1 class="font-display mt-1 text-2xl font-bold">{label}</h1>
	</header>

	{#if sessions.length}
		<SessionCarousel items={sessions} {card} bind:revealId />
	{:else}
		<Card tone="sunken" frame>
			<p class="text-sm text-steel">Rest day. Nothing scheduled here, and that is part of the plan.</p>
		</Card>
	{/if}

	<button
		type="button"
		disabled={!dayInPlan || !editable}
		onclick={() => dayInPlan && editable && goto(`/calendar/add/${date}`)}
		class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm {dayInPlan &&
		editable
			? 'border-hairline-strong text-signal-ink hover:border-signal'
			: 'border-hairline text-steel'}"
	>
		＋ Add a workout
	</button>
	{#if !editable}
		<p class="mt-2 text-xs text-steel">
			This day is more than 30 days old, so it is read-only history. You can look back, but not change it.
		</p>
	{:else if !dayInPlan}
		<p class="mt-2 text-xs text-steel">{outsidePlanNote}</p>
	{/if}
{/if}

{#snippet card(s: ClientSession)}
	<SessionCard
		session={s}
		eyebrow={`${planProfileName()} · W${week?.weekNumber ?? ''}`}
		active={false}
		editable={editable}
		logged={loggedBySession.get(s.id) ?? null}
		onLog={() => logSession(s)}
		onStart={() => startSession(s)}
		onOpen={() => goto(sessionHref(s.id, from))}
		onUnskip={() =>
			(confirm = {
				title: 'Un-skip this workout?',
				body: 'It goes back to your normal plan for the day.',
				confirmLabel: 'Un-skip',
				action: () => unskipSession(s.id),
			})}
		onCancelProgress={() => {
			clearStarted(s.id);
			clearProgress(s.id);
		}}
	/>
{/snippet}

<ConfirmSheet
	open={confirm !== null}
	title={confirm?.title ?? ''}
	body={confirm?.body ?? ''}
	confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
	onConfirm={() => confirm?.action()}
	onClose={() => (confirm = null)}
/>
