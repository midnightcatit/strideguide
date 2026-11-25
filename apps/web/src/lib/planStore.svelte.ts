import { api } from './api';
import { getGoalProfile } from '@strideguide/shared/profiles';
import type { ClientLog, ClientSession, ClientWeek, CurrentPlan } from './plan';
import { hydrateSkipped } from './skipped.svelte';
import { hydrateStarted } from './started.svelte';
import { hydrateProgress } from './sessionProgress.svelte';

/** Shared plan state so Today and Week stay in sync (and we fetch once). */
export const store = $state<{
	plan: CurrentPlan | null;
	logs: ClientLog[];
	loaded: boolean;
	error: string | null;
}>({ plan: null, logs: [], loaded: false, error: null });

export async function ensurePlan(): Promise<void> {
	if (store.loaded) return;
	try {
		const plan = await api.currentPlan();
		store.plan = plan;
		store.logs = plan.logs ?? [];
		const states = plan.sessionStates ?? [];
		hydrateSkipped(states.filter((x) => x.state === 'skipped').map((x) => x.sessionId));
		hydrateStarted(states.filter((x) => x.state === 'started').map((x) => x.sessionId));
		hydrateProgress(states.map((x) => ({ sessionId: x.sessionId, progress: x.progress ?? null })));
	} catch (e) {
		store.error = e instanceof Error ? e.message : 'Could not load your plan.';
	} finally {
		store.loaded = true;
	}
}

export function reloadPlan(): Promise<void> {
	store.loaded = false;
	return ensurePlan();
}

export function upsertLog(log: ClientLog): void {
	store.logs = [...store.logs.filter((l) => l.sessionId !== log.sessionId), log];
	if (store.plan) store.plan = { ...store.plan, logs: store.logs };
}

/** A session by id, across every week of the plan. */
export function findSession(id: string): ClientSession | undefined {
	for (const w of store.plan?.weeks ?? []) {
		const s = w.sessions.find((x) => x.id === id);
		if (s) return s;
	}
	return undefined;
}

/** The plan week a date falls in, if any. */
export function weekForDate(iso: string): ClientWeek | undefined {
	return (store.plan?.weeks ?? []).find(
		(w) => !!w.startDate && !!w.endDate && iso >= w.startDate && iso <= w.endDate,
	);
}

/** The plan week a session belongs to. */
export function weekForSession(session: ClientSession): ClientWeek | undefined {
	return (store.plan?.weeks ?? []).find((w) => w.sessions.some((s) => s.id === session.id));
}

/** The goal profile's display name, for the session eyebrow. */
export function planProfileName(): string {
	const slug = store.plan?.goal?.goalProfileSlug;
	if (!slug) return '';
	return getGoalProfile(slug)?.name ?? slug;
}

/** Store a saved note on the session, so a view that reads it sees the update. */
export function applySessionNotes(id: string, notes: string): void {
	for (const w of store.plan?.weeks ?? []) {
		const s = w.sessions.find((x) => x.id === id);
		if (s) {
			s.notes = notes;
			return;
		}
	}
}
