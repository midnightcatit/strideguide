/**
 * Match an imported activity to a planned session (pure, no I/O, no clock).
 *
 * The caller passes each planned session with its real calendar date already
 * worked out (week start plus the session's day index). This module scores date
 * proximity, modality agreement, and size agreement (distance for runs,
 * duration otherwise), then decides whether the match is strong enough to apply
 * on its own or close enough to ask the runner about.
 *
 * Every knob is data in MATCH_CONFIG and MODALITY_COMPAT, so the policy can be
 * tuned without touching the scoring code, and the scoring is easy to test.
 */

export type ActivityModality =
	| 'running'
	| 'walking'
	| 'strength'
	| 'mobility'
	| 'recovery'
	| 'cross-train';

/** An imported activity, normalised to metric by the connector that pulled it. */
export interface ActivityLike {
	modality: ActivityModality;
	/** ISO date-time or epoch milliseconds. */
	startedAt: string | number;
	durationSec?: number | null;
	distanceM?: number | null;
}

/** A planned session, with the date it falls on already resolved. */
export interface MatchSessionLike {
	id: string;
	/** The session's calendar date, ISO yyyy-mm-dd. */
	date: string;
	/** Session modality, e.g. running, strength, mobility. */
	modality: string;
	/** Session archetype, e.g. easy, long, interval. */
	type?: string | null;
	/** Prescribed distance in km, when the session is distance-based. */
	targetDistanceKm?: number | null;
	/** Prescribed duration in minutes, when the session is time-based. */
	durationMin?: number | null;
}

export interface MatchConfig {
	/** How many whole days either side of the session still count. */
	dateWindowDays: number;
	/** A run matched at or inside this fraction of the target is full credit. */
	distanceTolerance: number;
	/** A timed session matched at or inside this fraction is full credit. */
	durationTolerance: number;
	/** Relative importance of each signal. Weights are renormalised over the
	 *  signals that actually have data for a given pair. */
	weights: { date: number; modality: number; size: number };
	/** At or above this confidence, apply the match with no prompt. */
	strongThreshold: number;
	/** At or above this (and below strong), offer it as a question. */
	askThreshold: number;
	/** Activities shorter than this are treated as noise and never matched. */
	minDurationSec: number;
}

export const MATCH_CONFIG: MatchConfig = {
	dateWindowDays: 2,
	distanceTolerance: 0.3,
	durationTolerance: 0.4,
	weights: { date: 0.4, modality: 0.35, size: 0.25 },
	strongThreshold: 0.85,
	askThreshold: 0.5,
	minDurationSec: 60,
};

/**
 * How well two modalities agree, 0 to 1. The diagonal is an exact match. A run
 * and a walk are close but distinct, mobility and recovery overlap, and a
 * cross-train activity is a weak fit for anything planned. Anything unlisted is
 * 0, which keeps a strength session from matching a run.
 */
export const MODALITY_COMPAT: Record<string, Record<string, number>> = {
	running: { running: 1, walking: 0.6, 'cross-train': 0.35 },
	walking: { walking: 1, running: 0.6, 'cross-train': 0.4 },
	strength: { strength: 1, 'cross-train': 0.4 },
	mobility: { mobility: 1, recovery: 0.7, 'cross-train': 0.3 },
	recovery: { recovery: 1, mobility: 0.7, 'cross-train': 0.3 },
	'cross-train': { 'cross-train': 1, running: 0.35, walking: 0.4, strength: 0.4, mobility: 0.3 },
};

export function modalityScore(a: string, b: string): number {
	if (a === b) return 1;
	return MODALITY_COMPAT[a]?.[b] ?? MODALITY_COMPAT[b]?.[a] ?? 0;
}

export type MatchDecision = 'auto' | 'ask' | 'none';

export interface MatchCandidate {
	sessionId: string;
	/** 0 to 1. */
	confidence: number;
	/** Whole days between the activity and the session. */
	dateDeltaDays: number;
	/** Each signal that had data, 0 to 1. */
	breakdown: { date: number; modality: number; size?: number };
	decision: MatchDecision;
}

export interface MatchResult {
	best: MatchCandidate | null;
	/** Ranked candidates, strongest first, capped for display. */
	candidates: MatchCandidate[];
}

const DAY_MS = 86400000;

/** An activity's calendar day, ISO yyyy-mm-dd, or undefined when unreadable. */
export function activityDay(startedAt: string | number): string | undefined {
	const d = typeof startedAt === 'number' ? new Date(startedAt) : new Date(startedAt);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toISOString().slice(0, 10);
}

function wholeDays(aIso: string, bIso: string): number {
	return Math.round((Date.parse(`${aIso}T00:00:00Z`) - Date.parse(`${bIso}T00:00:00Z`)) / DAY_MS);
}

/** 1 at the target, 0 at or past the tolerance, linear in between. */
function ratioScore(actual: number, target: number, tolerance: number): number {
	if (!(target > 0) || !(actual > 0)) return 0;
	const ratio = Math.abs(actual - target) / target;
	if (tolerance <= 0) return ratio === 0 ? 1 : 0;
	return Math.max(0, 1 - ratio / tolerance);
}

export function decisionFor(confidence: number, cfg: MatchConfig = MATCH_CONFIG): MatchDecision {
	if (confidence >= cfg.strongThreshold) return 'auto';
	if (confidence >= cfg.askThreshold) return 'ask';
	return 'none';
}

function scoreCandidate(
	activity: ActivityLike,
	session: MatchSessionLike,
	day: string,
	cfg: MatchConfig,
): MatchCandidate | null {
	if (!session.date) return null;
	const delta = Math.abs(wholeDays(day, session.date));
	if (delta > cfg.dateWindowDays) return null;
	const dateScore = Math.max(0, 1 - delta / Math.max(1, cfg.dateWindowDays));

	const modScore = modalityScore(activity.modality, session.modality);
	// Modalities with no agreement at all (a run against a strength session, say)
	// are dropped outright, so a busy day never produces a cross-modal guess.
	if (modScore === 0) return null;

	// Size: prefer distance when the session prescribes it and the activity has
	// one; otherwise fall back to duration. Absent data means the signal is left
	// out and the weights renormalise, never scored as a failure.
	let sizeScore: number | undefined;
	if (session.targetDistanceKm != null && activity.distanceM != null) {
		sizeScore = ratioScore(activity.distanceM, session.targetDistanceKm * 1000, cfg.distanceTolerance);
	} else if (session.durationMin != null && activity.durationSec != null) {
		sizeScore = ratioScore(activity.durationSec, session.durationMin * 60, cfg.durationTolerance);
	}

	const parts: { key: 'date' | 'modality' | 'size'; value: number }[] = [
		{ key: 'date', value: dateScore },
		{ key: 'modality', value: modScore },
	];
	if (sizeScore !== undefined) parts.push({ key: 'size', value: sizeScore });

	let weightSum = 0;
	let score = 0;
	for (const p of parts) {
		const w = cfg.weights[p.key];
		weightSum += w;
		score += w * p.value;
	}
	const confidence = weightSum > 0 ? score / weightSum : 0;

	const breakdown: MatchCandidate['breakdown'] = { date: dateScore, modality: modScore };
	if (sizeScore !== undefined) breakdown.size = sizeScore;

	return {
		sessionId: session.id,
		confidence: Math.round(confidence * 1000) / 1000,
		dateDeltaDays: wholeDays(day, session.date),
		breakdown,
		decision: decisionFor(confidence, cfg),
	};
}

/**
 * Score an activity against every planned session and return the best match
 * plus the ranked shortlist. Sessions further than dateWindowDays away are
 * dropped, and an activity with no size and a modality mismatch never reads as
 * strong. Returns an empty result when nothing clears the ask threshold.
 */
export function matchActivity(
	activity: ActivityLike,
	sessions: MatchSessionLike[],
	cfg: MatchConfig = MATCH_CONFIG,
): MatchResult {
	const day = activityDay(activity.startedAt);
	if (!day) return { best: null, candidates: [] };
	if (cfg.minDurationSec > 0 && (activity.durationSec ?? 0) > 0 && activity.durationSec! < cfg.minDurationSec) {
		return { best: null, candidates: [] };
	}
	// A session without a modality we understand can never match.
	const candidates: MatchCandidate[] = [];
	for (const s of sessions) {
		if (!s.modality) continue;
		const c = scoreCandidate(activity, s, day, cfg);
		if (c && c.confidence >= cfg.askThreshold) candidates.push(c);
	}
	candidates.sort((a, b) => b.confidence - a.confidence || Math.abs(a.dateDeltaDays) - Math.abs(b.dateDeltaDays));
	return { best: candidates[0] ?? null, candidates: candidates.slice(0, 3) };
}
