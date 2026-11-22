import { api } from './api';
import type { ClientLog, CurrentPlan } from './plan';

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
