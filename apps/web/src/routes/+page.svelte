<script lang="ts">
	import { onMount } from 'svelte';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api, type ApiUser } from '$lib/api';
	import {
		type ClientWeek,
		type CurrentPlan,
		DAY_NAMES,
		formatKm,
		heroSession,
		mondayIndex,
	} from '$lib/plan';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import WeekStrip from '$lib/components/WeekStrip.svelte';

	let user = $state<ApiUser | null>(null);
	let plan = $state<CurrentPlan | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedDay = $state(mondayIndex(new Date()));

	const todayIndex = mondayIndex(new Date());
	const todayIso = new Date().toISOString().slice(0, 10);

	const profileName = $derived(
		plan?.goal ? (getGoalProfile(plan.goal.goalProfileSlug)?.name ?? plan.goal.goalProfileSlug) : '',
	);

	const weeks = $derived(plan?.weeks ?? []);
	const currentWeek: ClientWeek | undefined = $derived(
		weeks.find((w) => w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate) ??
			weeks[0],
	);
	const hero = $derived(currentWeek ? heroSession(currentWeek.sessions, selectedDay) : undefined);

	const weekStats = $derived.by(() => {
		if (!currentWeek) return { count: 0, km: 0 };
		const runs = currentWeek.sessions.filter((s) => s.modality === 'running');
		const km = runs.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0);
		return { count: currentWeek.sessions.length, km: Math.round(km * 10) / 10 };
	});

	onMount(async () => {
		try {
			user = await api.me();
			if (user) {
				plan = await api.currentPlan();
				selectedDay = currentWeek
					? (currentWeek.sessions.find((s) => s.day === todayIndex)?.day ??
						(currentWeek.sessions[0]?.day ?? todayIndex))
					: todayIndex;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<p class="tabular text-sm text-steel">Loading…</p>
{:else if !user}
	<section class="mt-10 text-center">
		<p class="text-xs uppercase tracking-widest text-steel">Stride Guide</p>
		<h1 class="font-display mt-2 text-2xl font-bold">Your training, tailored.</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm text-steel">
			Goal-driven running and strength plans with a researched "why" behind every session.
		</p>
		<button
			type="button"
			onclick={() => api.login()}
			class="mt-6 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
		>
			Sign in with Google
		</button>
	</section>
{:else if error}
	<p class="mt-6 text-sm text-steel">{error}</p>
{:else if !currentWeek}
	<section class="mt-10 text-center">
		<p class="text-xs uppercase tracking-widest text-steel">No plan yet</p>
		<h1 class="font-display mt-2 text-2xl font-bold">Let's build your plan.</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm text-steel">
			Pick a goal, a race date, and the days you can train. We'll generate a week-by-week plan.
		</p>
		<a
			href="/onboarding"
			class="mt-6 inline-block rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
		>
			Build my plan
		</a>
	</section>
{:else}
	<section class="mb-4 flex items-center justify-between">
		<div>
			<p class="text-xs uppercase tracking-widest text-steel">Today · {DAY_NAMES[todayIndex]}</p>
			<h1 class="font-display text-2xl font-bold">{currentWeek.focus ?? 'This week'}</h1>
		</div>
		<a href="/onboarding" class="text-xs text-steel hover:text-signal-ink">Rebuild</a>
	</section>

	{#if currentWeek.summaryText}
		<p class="mb-4 text-sm text-steel">{currentWeek.summaryText}</p>
	{/if}

	<WeekStrip
		sessions={currentWeek.sessions}
		activeDay={selectedDay}
		todayIndex={todayIndex}
		onSelect={(d) => (selectedDay = d)}
	/>

	<div class="mt-5">
		{#if hero}
			<SessionCard
				session={hero}
				eyebrow="{profileName} · W{currentWeek.weekNumber}"
				active={selectedDay === todayIndex}
			/>
		{:else}
			<div class="rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-steel">
				Rest day — nothing scheduled. Recovery is training too.
			</div>
		{/if}
	</div>

	<section class="mt-6">
		<div class="flex items-baseline justify-between">
			<h2 class="text-xs uppercase tracking-widest text-steel">Week so far</h2>
			<span class="tabular text-xs text-steel">{weekStats.count} sessions · {formatKm(weekStats.km)}</span>
		</div>
		<ul class="mt-3 divide-y divide-hairline border-y border-hairline">
			{#each currentWeek.sessions as s (s.id)}
				<li>
					<button
						type="button"
						onclick={() => (selectedDay = s.day)}
						class="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:text-signal-ink"
					>
						<span class="w-8 shrink-0 tabular text-xs text-steel">{DAY_NAMES[s.day]?.slice(0, 3)}</span>
						<span class="flex-1 truncate text-sm">{s.title ?? s.type}</span>
						<span class="tabular shrink-0 text-xs text-steel">
							{#if s.prescription?.targetDistanceKm}
								{formatKm(s.prescription.targetDistanceKm)}
							{:else}
								{s.modality}
							{/if}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}
