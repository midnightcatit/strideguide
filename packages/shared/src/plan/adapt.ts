/**
 * Adaptive-planning suggestions (pure). Grounded in research/wave-4/adaptive-rules.json.
 * These are SUGGESTIONS shown to the user; the plan is never changed silently.
 */

export interface AdaptSession {
	id: string;
	day: number;
	modality: string;
	type: string;
	prescription?: { targetDistanceKm?: number } | null;
}

export interface AdaptWeek {
	weekNumber: number;
	startDate?: string | null;
	endDate?: string | null;
	targetVolumeKm?: number | null;
	sessions: AdaptSession[];
}

export interface AdaptLog {
	sessionId?: string | null;
	runStats?: { distanceKm?: number; durationSec?: number } | null;
	rpe?: number | null;
	createdAt?: string | number | null;
}

export type AdjustmentKind =
	| 'missed'
	| 'volume-under'
	| 'volume-over'
	| 'fatigue'
	| 'run-spike'
	| 'cross-load'
	| 'recovery';

export interface Adjustment {
	id: string;
	kind: AdjustmentKind;
	severity: 'info' | 'warn';
	title: string;
	detail: string;
}

function isoDay(value: string | number | null | undefined): string | undefined {
	if (value == null) return undefined;
	const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
	const d = new Date(`${iso}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/**
 * Rules applied (see adaptive-rules.json):
 *  - missed sessions: 1-2 = absorb, 3+ = rebuild the next week lighter
 *  - volume under planned: <80% hold progression, <60% rebuild
 *  - volume over planned: >110% hold, >130% back off
 *  - fatigue: 3+ consecutive logged sessions at RPE >= 8 = lighter week
 *  - single-run spike: a run >10% longer than the previous 30-day longest
 */

import type { RecoverySignal } from './recovery';
export function suggestAdjustments(
	logs: AdaptLog[],
	weeks: AdaptWeek[],
	todayIso: string,
	recovery?: RecoverySignal,
): Adjustment[] {
	const out: Adjustment[] = [];
	const loggedIds = new Set(logs.filter((l) => l.sessionId).map((l) => l.sessionId as string));

	// Session dates for the whole plan.
	const dated: { date: string; session: AdaptSession }[] = [];
	for (const w of weeks) {
		if (!w.startDate) continue;
		for (const s of w.sessions) dated.push({ date: addDays(w.startDate, s.day), session: s });
	}

	// --- missed sessions (past, unlogged) ---
	const missed = dated.filter(
		(d) =>
			d.date < todayIso &&
			d.session.modality !== 'mobility' &&
			d.session.type !== 'cross-train' &&
			!loggedIds.has(d.session.id),
	);
	if (missed.length >= 3) {
		out.push({
			id: 'missed-3',
			kind: 'missed',
			severity: 'warn',
			title: `${missed.length} sessions missed`,
			detail: "Don't catch up by stacking. Rebuild the next week at about 60 to 70% of plan.",
		});
	} else if (missed.length >= 1) {
		out.push({
			id: 'missed-1',
			kind: 'missed',
			severity: 'info',
			title: `${missed.length} session${missed.length === 1 ? '' : 's'} missed`,
			detail: 'Absorb it and carry on. Skip what is gone rather than doubling up.',
		});
	}

	// --- cross-training load: the sport is training in its own right ---
	const typeById = new Map<string, string>();
	for (const w of weeks) for (const s of w.sessions) typeById.set(s.id, s.type);
	const weekAgo = addDays(todayIso, -6);
	const crossLogs = logs.filter((l) => {
		if (!l.sessionId || typeById.get(l.sessionId) !== 'cross-train') return false;
		const d = isoDay(l.createdAt);
		return !!d && d >= weekAgo && d <= todayIso;
	});
	const crossMinutes = Math.round(
		crossLogs.reduce((m, l) => m + (l.runStats?.durationSec ?? 0), 0) / 60,
	);
	const crossHard = crossLogs.filter((l) => (l.rpe ?? 0) >= 7).length;
	if (crossLogs.length >= 3 || crossMinutes >= 180 || crossHard >= 2) {
		const bits = [`${crossLogs.length} sports session${crossLogs.length === 1 ? '' : 's'}`];
		if (crossMinutes) bits.push(`${crossMinutes} minutes`);
		if (crossHard) bits.push(`${crossHard} of them hard`);
		out.push({
			id: 'cross-load',
			kind: 'cross-load',
			severity: 'info',
			title: 'Your sport is carrying real load',
			detail: `${bits.join(', ')} this week. The sport counts as training, so the plan trims the strength and quality work. Rebuild to apply it.`,
		});
	}

	// --- most recent COMPLETED week: volume vs plan ---
	// Only weeks that have fully finished are judged. The current, in-progress
	// week is never compared against its full plan, so a plan that started today
	// (or this week) never looks like a shortfall.
	const byWeek = weeks.map((w) => {
		const planned = w.sessions
			.filter((s) => s.modality === 'running')
			.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0);
		const actual = w.sessions
			.filter((s) => loggedIds.has(s.id))
			.reduce((sum, s) => sum + (logs.find((l) => l.sessionId === s.id)?.runStats?.distanceKm ?? 0), 0);
		return { week: w, planned, actual };
	});
	const completed = byWeek.filter((b) => {
		const start = b.week.startDate;
		if (!start || b.planned <= 0) return false;
		const end = b.week.endDate ?? addDays(start, 6);
		return end < todayIso;
	});
	const recent = [...completed].reverse().find((b) => b.actual > 0);
	if (recent) {
		const ratio = recent.actual / recent.planned;
		if (ratio < 0.6) {
			out.push({
				id: 'vol-under-60',
				kind: 'volume-under',
				severity: 'warn',
				title: 'Big volume drop last week',
				detail: `You logged ${Math.round(ratio * 100)}% of plan. Rebuild gradually rather than jumping back.`,
			});
		} else if (ratio < 0.8) {
			out.push({
				id: 'vol-under-80',
				kind: 'volume-under',
				severity: 'info',
				title: 'Volume below plan',
				detail: `You logged ${Math.round(ratio * 100)}% of plan. Hold progression next week instead of increasing.`,
			});
		} else if (ratio > 1.3) {
			out.push({
				id: 'vol-over-130',
				kind: 'volume-over',
				severity: 'warn',
				title: 'Volume well above plan',
				detail: `You logged ${Math.round(ratio * 100)}% of plan. Back off about 20 to 30% to stay injury-free.`,
			});
		} else if (ratio > 1.1) {
			out.push({
				id: 'vol-over-110',
				kind: 'volume-over',
				severity: 'info',
				title: 'Volume above plan',
				detail: `You logged ${Math.round(ratio * 100)}% of plan. Hold rather than adding more.`,
			});
		}
	}

	// --- fatigue: consecutive high RPE ---
	const withRpe = logs
		.filter((l) => typeof l.rpe === 'number')
		.slice()
		.sort((a, b) => (isoDay(a.createdAt) ?? '').localeCompare(isoDay(b.createdAt) ?? ''));
	const last3 = withRpe.slice(-3);
	if (last3.length === 3 && last3.every((l) => (l.rpe ?? 0) >= 8)) {
		out.push({
			id: 'fatigue',
			kind: 'fatigue',
			severity: 'warn',
			title: 'Three hard sessions in a row',
			detail: 'Take a lighter week: cut volume about 40% and drop the intensity session.',
		});
	}

	// --- single-run spike (>10% over the recent 30-day longest) ---
	const runs = logs
		.filter((l) => l.runStats?.distanceKm)
		.map((l) => ({ day: isoDay(l.createdAt) ?? '', km: l.runStats!.distanceKm! }))
		.filter((r) => r.day)
		.sort((a, b) => a.day.localeCompare(b.day));
	for (let i = 1; i < runs.length; i++) {
		const r = runs[i]!;
		const windowStart = addDays(r.day, -30);
		const priorMax = Math.max(
			0,
			...runs.filter((x) => x.day >= windowStart && x.day < r.day).map((x) => x.km),
		);
		if (priorMax > 0 && r.km > priorMax * 1.1) {
			out.push({
				id: `spike-${r.day}`,
				kind: 'run-spike',
				severity: 'info',
				title: 'A run jumped over 10%',
				detail: `One run was >10% longer than your recent longest. Keep increases under 10%.`,
			});
			break;
		}
	}

	// --- recovery: resting HR up, HRV down or short sleep, when health data exists ---
	if (recovery?.strained) {
		const bits: string[] = [];
		if (recovery.restingHrElevated) bits.push('resting heart rate is up');
		if (recovery.hrvSuppressed) bits.push('HRV is down');
		if (recovery.shortSleep) bits.push('sleep has been short');
		out.push({
			id: 'recovery',
			kind: 'recovery',
			severity: 'info',
			title: 'Recovery looks strained',
			detail: `Your recent health data suggests ${bits.join(', ')}. Ease the volume and keep the effort easy until it settles.`,
		});
	}

	return out;
}
