/**
 * One shared cache for the latest coach note, so Progress and Today do not each
 * fetch it on every visit. The note changes at most once a day, so it is read
 * once per session and reused; a failed read leaves it unloaded so a later visit
 * tries again.
 */
import { api } from './api';

interface SummaryState {
	loaded: boolean;
	body: string | null;
}

export const summary = $state<SummaryState>({ loaded: false, body: null });

let task: Promise<void> | null = null;

/** Read the latest coach note once, sharing the in-flight request between callers. */
export function ensureSummary(): Promise<void> {
	if (summary.loaded) return Promise.resolve();
	if (task) return task;
	task = api
		.latestSummary()
		.then((res) => {
			summary.body = res.summary?.body ?? null;
			summary.loaded = true;
		})
		.catch(() => {
			// No note yet, or the call failed; a later visit retries.
		})
		.finally(() => {
			task = null;
		});
	return task;
}
