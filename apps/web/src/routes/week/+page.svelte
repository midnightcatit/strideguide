<script lang="ts">
	import { onMount } from 'svelte';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { fmtDistance, sessionLabel } from '$lib/prefs.svelte';
	import { store, ensurePlan, upsertLog } from '$lib/planStore.svelte';
	import { type ClientSession, DAY_NAMES, mondayIndex } from '$lib/plan';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import WeekStrip from '$lib/components/WeekStrip.svelte';
	import LogSheet from '$lib/components/LogSheet.svelte';
	import SessionPlayer from '$lib/components/SessionPlayer.svelte';
	import IntensityLadder from '$lib/components/IntensityLadder.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	const todayIndex = mondayIndex(new Date());
	const todayIso = new Date().toISOString().slice(0, 10);

	let weekIndex = $state(0);
	let selectedDay = $state(todayIndex);
	let logTarget = $state<ClientSession | null>(null);
	let playTarget = $state<ClientSession | null>(null);

	const profileName = $derived(
		store.plan?.goal
			? (getGoalProfile(store.plan.goal.goalProfileSlug)?.name ?? store.plan.goal.goalProfileSlug)
			: '',
	);
	const weeks = $derived(store.plan?.weeks ?? []);
	const currentWeek = $derived(weeks[weekIndex]);
	const loggedBySession = $derived(
		new Map(store.logs.filter((l) => l.sessionId).map((l) => [l.sessionId as string, l])),
	);
	const loggedDays = $derived(
		currentWeek
			? [...new Set(currentWeek.sessions.filter((s) => loggedBySession.has(s.id)).map((s) => s.day))]
			: [],
	);
	const daySessions = $derived(
		currentWeek ? currentWeek.sessions.filter((s) => s.day === selectedDay) : [],
	);
	const currentWeekIsToday = $derived(
		!!currentWeek?.startDate &&
			!!currentWeek?.endDate &&
			todayIso >= currentWeek.startDate &&
			todayIso <= currentWeek.endDate,
	);

	function selectWeek(i: number) {
		weekIndex = Math.max(0, Math.min(weeks.length - 1, i));
		const w = weeks[weekIndex];
		if (!w) return;
		const inWeek = w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate;
		selectedDay = inWeek
			? (w.sessions.find((s) => s.day === todayIndex)?.day ?? w.sessions[0]?.day ?? todayIndex)
			: (w.sessions[0]?.day ?? todayIndex);
	}

	onMount(async () => {
		await ensurePlan();
		const idx = weeks.findIndex(
			(w) => w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate,
		);
		selectWeek(idx >= 0 ? idx : 0);
	});
</script>

{#if !store.loaded}
	<p class="tabular text-sm text-steel">Loading…</p>
{:else if !currentWeek}
	<p class="mt-6 text-sm text-steel">No plan yet. <a href="/onboarding" class="text-signal-ink hover:underline">Build one →</a></p>
{:else}
	<section class="mb-4">
		<a href="/" class="text-xs text-steel hover:text-signal-ink">‹ Today</a>
		<p class="mt-2 text-xs uppercase tracking-widest text-steel">Plan</p>
		<h1 class="font-display mt-1 text-2xl font-bold">{currentWeek.focus ?? 'This week'}</h1>
	</section>

	<div class="mb-3 flex items-center justify-between">
		<button type="button" onclick={() => selectWeek(weekIndex - 1)} disabled={weekIndex === 0} aria-label="Previous week" class="rounded-md border border-hairline px-3 py-1.5 text-sm disabled:opacity-40">‹</button>
		<p class="tabular text-sm" aria-live="polite">
			Week {currentWeek.weekNumber} of {weeks.length}
		</p>
		<button type="button" onclick={() => selectWeek(weekIndex + 1)} disabled={weekIndex >= weeks.length - 1} aria-label="Next week" class="rounded-md border border-hairline px-3 py-1.5 text-sm disabled:opacity-40">›</button>
	</div>

	{#if currentWeek.summaryText}
		<p class="mb-4 text-sm text-steel">{currentWeek.summaryText}</p>
	{/if}

	<WeekStrip
		sessions={currentWeek.sessions}
		activeDay={selectedDay}
		todayIndex={currentWeekIsToday ? todayIndex : -1}
		loggedDays={loggedDays}
		onSelect={(d) => (selectedDay = d)}
	/>

	<div class="mt-7 space-y-3">
		{#each daySessions as s (s.id)}
			<SessionCard
				session={s}
				eyebrow="{profileName} · W{currentWeek.weekNumber}"
				active={selectedDay === todayIndex}
				logged={loggedBySession.get(s.id) ?? null}
				onLog={() => (logTarget = s)}
				onStart={() => (playTarget = s)}
			/>
		{/each}
	</div>

	<section aria-labelledby="this-week" class="mt-7">
		<SectionHeader id="this-week" eyebrow="This week" />
		<Card>
			<ul class="divide-y divide-hairline">
				{#each currentWeek.sessions as s (s.id)}
					{@const done = loggedBySession.has(s.id)}
					<li>
						<button type="button" onclick={() => (selectedDay = s.day)} class="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:text-signal-ink">
							<span class="w-8 shrink-0 tabular text-xs text-steel">{DAY_NAMES[s.day]?.slice(0, 3)}</span>
							<span class="flex-1 truncate text-sm">{#if done}<span class="text-signal-ink">✓</span>{/if}{sessionLabel(s)}</span>
							<IntensityLadder intensity={s.prescription?.intensity} label={false} />
							<span class="tabular w-14 shrink-0 text-right text-xs text-steel">
								{#if s.prescription?.targetDistanceKm}{fmtDistance(s.prescription.targetDistanceKm)}{:else}{s.modality}{/if}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</Card>
	</section>
{/if}

{#if playTarget}
	<SessionPlayer
		session={playTarget}
		eyebrow="{profileName} · W{currentWeek?.weekNumber ?? ''}"
		onClose={() => (playTarget = null)}
		onFinish={() => {
			logTarget = playTarget;
			playTarget = null;
		}}
	/>
{/if}

{#if logTarget}
	<LogSheet
		session={logTarget}
		eyebrow="{profileName} · W{currentWeek?.weekNumber ?? ''}"
		onClose={() => (logTarget = null)}
		onSaved={(log) => {
			upsertLog(log);
			logTarget = null;
		}}
	/>
{/if}
