/**
 * Turn an imported activity into the app's log shape, and guard against the
 * same session being counted twice (once from an import, once logged by hand).
 *
 * Pure and I/O-free: the API reads the rows and applies these decisions.
 */

import type { ActivityLike } from './match';

export type LogSource = 'manual' | 'device' | 'import';

/** The run-stats shape a log carries, mirrored from packages/shared analytics. */
export interface RunStatsShape {
	distanceKm?: number;
	durationSec?: number;
	avgPaceSecPerKm?: number;
	avgHr?: number;
}

/**
 * Map an imported activity onto the run stats a log stores. Distance is metres
 * in, kilometres out (units are presentation, the app stores metric). Pace is
 * taken from the provider when it sent one, otherwise derived from the distance
 * and the duration. A strength or mobility import simply has no run stats; it
 * still records that the session happened.
 */
export function activityToRunStats(activity: ActivityLike & { avgPaceSecPerKm?: number | null; avgHr?: number | null }): RunStatsShape {
	const out: RunStatsShape = {};
	const distanceM = activity.distanceM ?? 0;
	const durationSec = activity.durationSec ?? 0;
	if (distanceM > 0) out.distanceKm = Math.round((distanceM / 1000) * 100) / 100;
	if (durationSec > 0) out.durationSec = Math.round(durationSec);
	if (durationSec > 0 && distanceM > 0) {
		out.avgPaceSecPerKm = Math.round(durationSec / (distanceM / 1000));
	}
	if (activity.avgPaceSecPerKm != null && activity.avgPaceSecPerKm > 0) {
		out.avgPaceSecPerKm = Math.round(activity.avgPaceSecPerKm);
	}
	if (activity.avgHr != null && activity.avgHr > 0) out.avgHr = Math.round(activity.avgHr);
	return out;
}

export interface LogIdentity {
	sessionId?: string | null;
	source?: string | null;
}

/**
 * Whether an imported activity may add its own log for a session. A manual (or
 * device) log already covering the session wins, so the import never lands a
 * second entry and the volume is not counted twice. Existing import logs do not
 * block a fresh one (the API checks the activity is not already matched first).
 */
export function shouldAttachImportLog(existing: LogIdentity[]): boolean {
	return !existing.some((l) => l.source !== 'import');
}

/**
 * Ids of import logs a fresh manual log replaces. When the runner logs a
 * session by hand after an import already closed it, dropping the import keeps
 * one log per session, so pace, distance and personal bests stay honest.
 */
export function importLogsSupersededByManual(existing: (LogIdentity & { id: string })[]): string[] {
	return existing.filter((l) => l.source === 'import').map((l) => l.id);
}
