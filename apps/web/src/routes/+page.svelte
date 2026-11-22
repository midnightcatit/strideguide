<script lang="ts">
	import { onMount } from 'svelte';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api, type ApiUser } from '$lib/api';
	import { fmtDistance } from '$lib/prefs.svelte';
	import { store, ensurePlan, upsertLog } from '$lib/planStore.svelte';
	import { type ClientSession, DAY_NAMES, mondayIndex } from '$lib/plan';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import LogSheet from '$lib/components/LogSheet.svelte';
	import SessionPlayer from '$lib/components/SessionPlayer.svelte';

	let user = $state<ApiUser | null>(null);
	let checked = $state(false);
	let logTarget = $state<ClientSession | null>(null);
	let playTarget = $state<ClientSession | null>(null);

	const todayIndex = mondayIndex(new Date());
	const todayIso = new Date().toISOString().slice(0, 10);

	const profileName = $derived(
		store.plan?.goal
			? (getGoalProfile(store.plan.goal.goalProfileSlug)?.name ?? store.plan.goal.goalProfileSlug)
			: '',
	);
	const todayWeek = $derived(
		(store.plan?.weeks ?? []).find(
			(w) => w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate,
		) ?? store.plan?.weeks?.[0],
	);
	const daySessions = $derived(todayWeek?.sessions.filter((s) => s.day === todayIndex) ?? []);
	const loggedBySession = $derived(
		new Map(store.logs.filter((l) => l.sessionId).map((l) => [l.sessionId as string, l])),
	);
	const stalePlan = $derived(
		(store.plan?.weeks.length ?? 0) > 0 &&
			(store.plan?.weeks ?? []).some((w) => w.sessions.some((s) => !s.prescription?.workout)),
	);
	const runKm = $derived(
		daySessions
			.filter((s) => s.modality === 'running')
			.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0),
	);

	onMount(async () => {
		user = await api.me().catch(() => null);
		if (user) await ensurePlan();
		checked = true;
	});
</script>

{#if !checked}
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
{:else if store.error}
	<p class="mt-6 text-sm text-steel">{store.error}</p>
{:else if !todayWeek}
	<section class="mt-10 text-center">
		<p class="text-xs uppercase tracking-widest text-steel">No plan yet</p>
		<h1 class="font-display mt-2 text-2xl font-bold">Let's build your plan.</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm text-steel">
			Pick a goal, a race date, and the days you can train. We'll generate a week-by-week plan.
		</p>
		<a href="/onboarding" class="mt-6 inline-block rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">Build my plan</a>
	</section>
{:else}
	{#if stalePlan}
		<div class="mb-4 rounded-lg border border-signal bg-signal-wash p-3 text-sm">
			This plan predates guided workouts. Rebuild it for step-by-step sessions, warm-up drills and machine detail.
			<a href="/onboarding" class="ml-1 font-medium text-signal-ink hover:underline">Rebuild plan →</a>
		</div>
	{/if}

	<section class="mb-5">
		<p class="text-xs uppercase tracking-widest text-steel">Today · {DAY_NAMES[todayIndex]}</p>
		<h1 class="font-display mt-1 text-2xl font-bold">
			{daySessions.length
				? daySessions.length > 1
					? `${daySessions.length} sessions`
					: (daySessions[0]?.title || daySessions[0]?.type || 'Today')
				: 'Rest day'}
		</h1>
		<p class="mt-1 text-sm text-steel">
			{profileName} · Week {todayWeek.weekNumber}{runKm ? ` · ${fmtDistance(runKm)}` : ''}
		</p>
	</section>

	<div class="space-y-4">
		{#if daySessions.length}
			{#each daySessions as s (s.id)}
				<SessionCard
					session={s}
					eyebrow="{profileName} · W{todayWeek.weekNumber}"
					active
					logged={loggedBySession.get(s.id) ?? null}
					onLog={() => (logTarget = s)}
					onStart={() => (playTarget = s)}
				/>
			{/each}
		{:else}
			<div class="rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-steel">
				Nothing scheduled today. Recovery is training too.
			</div>
		{/if}
	</div>

	<a href="/week" class="mt-6 block rounded-lg border border-hairline px-4 py-3 text-center text-sm hover:border-signal hover:text-signal-ink">
		See the full week →
	</a>
{/if}

{#if playTarget}
	<SessionPlayer
		session={playTarget}
		eyebrow="{profileName} · W{todayWeek?.weekNumber ?? ''}"
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
		eyebrow="{profileName} · W{todayWeek?.weekNumber ?? ''}"
		onClose={() => (logTarget = null)}
		onSaved={(log) => {
			upsertLog(log);
			logTarget = null;
		}}
	/>
{/if}
