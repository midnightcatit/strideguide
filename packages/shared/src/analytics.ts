/**
 * Progress analytics: pure functions over logs + the prescribed plan.
 * Grounded in research/wave-4/progress-metrics.json: descriptive metrics only
 * (adherence, volume, intensity distribution, pace trend, PBs). Load-management
 * ratios (ACWR/monotony/strain) are deliberately NOT computed (contested / dismissed).
 */

export type Intensity = 'easy' | 'steady' | 'hard';

export interface LogLike {
	sessionId?: string | null;
	runStats?: {
		distanceKm?: number;
		durationSec?: number;
		avgPaceSecPerKm?: number;
		avgHr?: number;
	} | null;
	rpe?: number | null;
	createdAt?: string | number | null;
	/** How the log was recorded: manual, device or import. */
	source?: string | null;
}

export interface SessionLike {
	id: string;
	day: number;
	modality: string;
	type: string;
	prescription?: { targetDistanceKm?: number; intensity?: Intensity } | null;
}

export interface WeekLike {
	weekNumber: number;
	targetVolumeKm?: number;
	startDate?: string | null;
	endDate?: string | null;
	/** Plan phase: base, build, peak, taper or recovery. */
	phase?: string | null;
	sessions: SessionLike[];
}

export interface PlanMeta {
	weeksTotal: number;
	weeksElapsed: number;
	weeksToGo: number;
	currentWeek?: number;
	currentPhase?: string;
	/** Completed sessions as a percentage of planned, 0 to 100. */
	percent: number;
	/** Whole days until the target date, when there is one. */
	daysToRace?: number;
}

export interface WeekVolume {
	week: number;
	plannedKm: number;
	actualKm: number;
	/** Of the actual kilometres, the part that came from an imported activity. */
	importedKm: number;
}

export interface PacePoint {
	day: string;
	paceSecPerKm: number;
	intensity?: Intensity;
}

export interface ProgressMetrics {
	adherence: {
		planned: number;
		completed: number;
		skipped: number;
		recentPlanned: number;
		recentCompleted: number;
		recentSkipped: number;
	};
	volume: { byWeek: WeekVolume[]; totalPlannedKm: number; totalActualKm: number; changePct?: number };
	intensity: { easy: number; steady: number; hard: number; completed: number };
	pace: { points: PacePoint[]; fastest?: number; changeSecPerKm?: number };
	prs: { longestRunKm?: number; fastestPaceSecPerKm?: number; biggestWeekKm?: number };
	rpe: { avg?: number; count: number };
	planMeta: PlanMeta;
	/** ISO dates on which something was logged, for the consistency calendar. */
	calendar: { trainedDays: string[] };
	/** What of the completed work arrived through an import rather than by hand. */
	imported: { sessions: number; km: number };
}

function dayOf(value: string | number | null | undefined): string | undefined {
	if (value == null) return undefined;
	const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toISOString().slice(0, 10);
}

export function computeProgress(
	logs: LogLike[],
	weeks: WeekLike[],
	opts: { targetDate?: string | null; todayIso?: string; skippedIds?: Iterable<string> } = {},
): ProgressMetrics {
	const today = opts.todayIso ?? new Date().toISOString().slice(0, 10);
	const logBySession = new Map<string, LogLike>();
	for (const l of logs) {
		if (l.sessionId) logBySession.set(l.sessionId, l);
	}
	// A session the runner deliberately skipped. It is its own state: never
	// completed, and never counted as simply not done.
	const skippedSet = new Set(opts.skippedIds ?? []);

	const byWeek: WeekVolume[] = [];
	let totalPlannedKm = 0;
	let totalActualKm = 0;
	const intensity = { easy: 0, steady: 0, hard: 0 };
	let completed = 0;
	let planned = 0;
	let skipped = 0;
	let rpeSum = 0;
	let rpeCount = 0;
	let importedSessions = 0;
	let importedKm = 0;

	for (const w of weeks) {
		let plannedKm = 0;
		let actualKm = 0;
		let weekImportedKm = 0;
		for (const s of w.sessions) {
			planned += 1;
			if (s.modality === 'running') plannedKm += s.prescription?.targetDistanceKm ?? 0;
			const log = logBySession.get(s.id);
			if (log) {
				completed += 1;
				if (s.modality === 'running') actualKm += log.runStats?.distanceKm ?? 0;
				if (log.source === 'import') {
					importedSessions += 1;
					weekImportedKm += log.runStats?.distanceKm ?? 0;
				}
				const band = s.prescription?.intensity;
				if (band) intensity[band] += 1;
				if (typeof log.rpe === 'number') {
					rpeSum += log.rpe;
					rpeCount += 1;
				}
			} else if (skippedSet.has(s.id)) {
				skipped += 1;
			}
		}
		plannedKm = Math.round(plannedKm * 10) / 10;
		actualKm = Math.round(actualKm * 10) / 10;
		weekImportedKm = Math.round(weekImportedKm * 10) / 10;
		importedKm += weekImportedKm;
		byWeek.push({ week: w.weekNumber, plannedKm, actualKm, importedKm: weekImportedKm });
		totalPlannedKm += plannedKm;
		totalActualKm += actualKm;
	}

	// Relative volume change: last vs previous week that had any actual volume.
	let changePct: number | undefined;
	for (let i = byWeek.length - 1; i > 0; i--) {
		const cur = byWeek[i]!;
		const prev = byWeek[i - 1]!;
		if (cur.actualKm > 0 && prev.actualKm > 0) {
			changePct = Math.round(((cur.actualKm - prev.actualKm) / prev.actualKm) * 100);
			break;
		}
	}

	// Pace trend from running logs (newest last).
	const points: PacePoint[] = [];
	for (const l of logs) {
		const p = l.runStats?.avgPaceSecPerKm;
		const day = dayOf(l.createdAt);
		if (typeof p === 'number' && p > 0 && day) {
			const session = l.sessionId
				? weeks.flatMap((w) => w.sessions).find((s) => s.id === l.sessionId)
				: undefined;
			points.push({ day, paceSecPerKm: p, intensity: session?.prescription?.intensity });
		}
	}
	points.sort((a, b) => a.day.localeCompare(b.day));

	const fastest = points.length ? Math.min(...points.map((p) => p.paceSecPerKm)) : undefined;
	let paceChangeSecPerKm: number | undefined;
	if (points.length >= 4) {
		const mid = Math.floor(points.length / 2);
		const avg = (xs: PacePoint[]) => xs.reduce((s, p) => s + p.paceSecPerKm, 0) / xs.length;
		paceChangeSecPerKm = Math.round(avg(points.slice(0, mid)) - avg(points.slice(mid)));
	}

	const distances = logs.map((l) => l.runStats?.distanceKm).filter((d): d is number => !!d);
	const longestRunKm = distances.length ? Math.round(Math.max(...distances) * 10) / 10 : undefined;
	const biggestWeekKm = byWeek.length
		? Math.max(...byWeek.map((w) => w.actualKm)) || undefined
		: undefined;

	const recent = byWeek[byWeek.length - 1];
	const recentWeek = weeks[weeks.length - 1];
	const recentPlanned = recentWeek?.sessions.length ?? 0;
	const recentCompleted =
		recentWeek?.sessions.filter((s) => logBySession.has(s.id)).length ?? 0;
	const recentSkipped =
		recentWeek?.sessions.filter((s) => skippedSet.has(s.id) && !logBySession.has(s.id)).length ?? 0;

	// Plan position: how far in, and what phase the current week is.
	let weeksElapsed = 0;
	let weeksToGo = 0;
	let currentWeek: number | undefined;
	let currentPhase: string | undefined;
	for (const w of weeks) {
		if (w.endDate && w.endDate < today) weeksElapsed++;
		else if (w.startDate && w.startDate > today) weeksToGo++;
		else if (w.startDate && w.endDate && today >= w.startDate && today <= w.endDate) {
			currentWeek = w.weekNumber;
			currentPhase = w.phase ?? undefined;
		}
	}
	let daysToRace: number | undefined;
	if (opts.targetDate) {
		const t = Date.parse(`${opts.targetDate}T00:00:00Z`);
		const n = Date.parse(`${today}T00:00:00Z`);
		if (!Number.isNaN(t) && !Number.isNaN(n)) {
			daysToRace = Math.max(0, Math.round((t - n) / 86400000));
		}
	}
	const trainedDays = [
		...new Set(logs.map((l) => dayOf(l.createdAt)).filter((d): d is string => !!d)),
	].sort();

	return {
		adherence: {
			planned,
			completed,
			skipped,
			recentPlanned,
			recentCompleted,
			recentSkipped,
		},
		volume: { byWeek, totalPlannedKm: Math.round(totalPlannedKm * 10) / 10, totalActualKm: Math.round(totalActualKm * 10) / 10, changePct },
		intensity: { ...intensity, completed },
		pace: { points, fastest, changeSecPerKm: paceChangeSecPerKm },
		prs: {
			longestRunKm,
			fastestPaceSecPerKm: fastest,
			biggestWeekKm: recent ? biggestWeekKm : biggestWeekKm,
		},
		rpe: { avg: rpeCount ? Math.round((rpeSum / rpeCount) * 10) / 10 : undefined, count: rpeCount },
		planMeta: {
			weeksTotal: weeks.length,
			weeksElapsed,
			weeksToGo,
			currentWeek,
			currentPhase,
			percent: planned ? Math.round((completed / planned) * 100) : 0,
			daysToRace,
		},
		calendar: { trainedDays },
		imported: { sessions: importedSessions, km: Math.round(importedKm * 10) / 10 },
	};
}
