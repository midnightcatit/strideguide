import { api } from './api';
import type { ClientLog, CurrentPlan } from './plan';
import { hydrateSkipped } from './skipped.svelte';
import { hydrateStarted } from './started.svelte';

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
	} catch (e) {
		store.error = e instanceof Error ? e.message : 'Could not load your plan.';
	} finally {
		store.loaded = true;
	}
}

export function reloadPlan(): void {
	store.loaded = false;
	void ensurePlan();
}

export function upsertLog(log: ClientLog): void {
	store.logs = [...store.logs.filter((l) => l.sessionId !== log.sessionId), log];
	if (store.plan) store.plan = { ...store.plan, logs: store.logs };
}
