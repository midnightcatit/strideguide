import type { ClientLog } from './plan';

/** Millisecond timestamp from a log's createdAt, which may be seconds or a string. */
export function logMs(v: unknown): number {
	if (typeof v === 'number') return v * 1000;
	const t = typeof v === 'string' ? Date.parse(v) : Number.NaN;
	return Number.isNaN(t) ? 0 : t;
}

/** The set of ISO days on which something was logged. */
export function trainedDays(logs: ClientLog[]): Set<string> {
	const days = new Set<string>();
	for (const l of logs) {
		const ms = logMs(l.createdAt);
		if (ms) days.add(new Date(ms).toISOString().slice(0, 10));
	}
	return days;
}

/**
 * Training streak in days: counts back from today, or from yesterday when today
 * has no log yet, so a rest day today does not break a run in progress.
 */
export function currentStreak(days: Set<string>, todayIso: string): number {
	let cursor = days.has(todayIso) ? todayIso : shiftIso(todayIso, -1);
	let count = 0;
	while (days.has(cursor)) {
		count++;
		cursor = shiftIso(cursor, -1);
	}
	return count;
}

function shiftIso(iso: string, n: number): string {
	const d = new Date(`${iso}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/** The origin a metric page was opened from, kept to the two entry points. */
export function metricOrigin(from: string | null): '/' | '/progress' {
	return from === '/' ? '/' : '/progress';
}

export interface WeekKm {
	startIso: string;
	km: number;
}

/** Kilometres per week for the last `weeks` weeks, oldest first, Monday starts. */
export function weeklyKmSeries(logs: ClientLog[], todayIso: string, weeks: number): WeekKm[] {
	const today = new Date(`${todayIso}T00:00:00Z`);
	const monday = new Date(today);
	monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));

	const byDay = new Map<string, number>();
	for (const l of logs) {
		const km = l.runStats?.distanceKm;
		const ms = logMs(l.createdAt);
		if (!km || km <= 0 || !ms) continue;
		const iso = new Date(ms).toISOString().slice(0, 10);
		byDay.set(iso, (byDay.get(iso) ?? 0) + km);
	}

	const out: WeekKm[] = [];
	for (let i = weeks - 1; i >= 0; i--) {
		const start = new Date(monday);
		start.setUTCDate(monday.getUTCDate() - i * 7);
		let km = 0;
		for (let d = 0; d < 7; d++) {
			const day = new Date(start);
			day.setUTCDate(start.getUTCDate() + d);
			km += byDay.get(day.toISOString().slice(0, 10)) ?? 0;
		}
		out.push({ startIso: start.toISOString().slice(0, 10), km: Math.round(km * 10) / 10 });
	}
	return out;
}

export interface WeekPreview {
	done: number;
	planned: number;
	skipped: number;
	percent: number;
	segments: { filled: boolean; skipped: boolean }[];
}

/**
 * The current week as one read: how many sessions are done, how many are
 * skipped, and a segment per session. The progress preview card renders these
 * numbers.
 */
export function weekPreview(
	sessionIds: string[],
	loggedIds: Set<string>,
	skippedIds: Set<string>,
): WeekPreview {
	let done = 0;
	let skipped = 0;
	const segments = sessionIds.map((id) => {
		const filled = loggedIds.has(id);
		const skip = !filled && skippedIds.has(id);
		if (filled) done++;
		else if (skip) skipped++;
		return { filled, skipped: skip };
	});
	const planned = sessionIds.length;
	return {
		done,
		planned,
		skipped,
		percent: planned ? (done / planned) * 100 : 0,
		segments,
	};
}

export interface VolumeBuckets {
	todayKm: number;
	weekKm: number;
	monthKm: number;
	yearKm: number;
	allTimeKm: number;
	sessions: number;
}

/**
 * Distance logged, in kilometres, bucketed by day, week, month, year and all
 * time. Weeks start on Monday, matching the plan. Pure over the logs.
 */
export function volumeBuckets(logs: ClientLog[], todayIso: string): VolumeBuckets {
	const out: VolumeBuckets = { todayKm: 0, weekKm: 0, monthKm: 0, yearKm: 0, allTimeKm: 0, sessions: 0 };
	const today = new Date(`${todayIso}T00:00:00Z`);
	const monday = new Date(today);
	monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
	const month = todayIso.slice(0, 7);
	const year = todayIso.slice(0, 4);

	for (const l of logs) {
		const km = l.runStats?.distanceKm;
		const ms = logMs(l.createdAt);
		if (ms) out.sessions++;
		if (!km || km <= 0 || !ms) continue;
		const iso = new Date(ms).toISOString().slice(0, 10);
		const day = new Date(`${iso}T00:00:00Z`);
		out.allTimeKm += km;
		if (iso === todayIso) out.todayKm += km;
		if (day >= monday && day <= today) out.weekKm += km;
		if (iso.slice(0, 7) === month) out.monthKm += km;
		if (iso.slice(0, 4) === year) out.yearKm += km;
	}
	const r = (n: number) => Math.round(n * 10) / 10;
	return {
		todayKm: r(out.todayKm),
		weekKm: r(out.weekKm),
		monthKm: r(out.monthKm),
		yearKm: r(out.yearKm),
		allTimeKm: r(out.allTimeKm),
		sessions: out.sessions,
	};
}
