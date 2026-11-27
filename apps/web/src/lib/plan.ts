/** Client-side plan shapes as returned by the API, plus small display helpers. */

import { findDrill, type Drill } from '@strideguide/shared/plan';
import type { Modality, SessionWhy } from '@strideguide/shared';

// The one shared modality set (running, walking, strength, mobility, recovery,
// cross-train), so the client never drifts from what the API stores.
export type { Modality };

/** The runner's local civil date, re-exported so the web call sites share one helper. */
export { localIso } from '@strideguide/shared/dates';

export interface ClientStep {
	kind: 'warmup' | 'work' | 'recovery' | 'rest' | 'cooldown';
	label: string;
	distanceM?: number;
	durationSec?: number;
	restSec?: number;
	targetPaceSecPerKm?: [number, number];
	targetZone?: string;
	targetRpe?: [number, number];
	note?: string;
	machine?: string;
	sets?: number;
	reps?: number;
}

export interface ClientBlock {
	repeat: number;
	label?: string;
	steps: ClientStep[];
}

export interface ClientWorkout {
	blocks: ClientBlock[];
	totalDistanceKm?: number;
	estimatedDurationMin?: number;
}

export interface ClientPrescription {
	summary?: string;
	intensity?: 'easy' | 'steady' | 'hard';
	targetDistanceKm?: number;
	targetPaceSecPerKm?: [number, number];
	targetZone?: string;
	targetRpe?: [number, number];
	/** A local start time ("HH:MM") set from the runner's blocked-out windows. */
	timeStart?: string;
	blocks?: { machine: string; sets: { reps: number; weightKg: number }[] }[];
	notes?: string;
	/** Why this session has the amount it has. */
	why?: string;
	/** Why this session changed in the last adapt, from the pipeline's reasons. */
	changeNote?: string;
	/** The composed reason, in parts: role, day and plan context. */
	whyStructured?: SessionWhy;
	/** The model's rewording of whyStructured, when it passed the writing gate. */
	whyText?: SessionWhy;
	workout?: ClientWorkout;
	/** True when the user added this session from the library (removable). */
	added?: boolean;
	/** Library id, when the session was added from the library. */
	libraryId?: string;
	/** True when the user composed the workout themselves, not from the library. */
	custom?: boolean;
}

export interface ClientSession {
	id: string;
	day: number;
	slot: string | null;
	modality: Modality;
	type: string;
	title: string | null;
	purpose: string | null;
	prescription: ClientPrescription | null;
	durationMin: number | null;
	/** The runner's own note for this session, saved against the plan. */
	notes?: string | null;
}

export interface ClientWeek {
	id: string;
	weekNumber: number;
	/** Plan phase: base, build, peak, taper or recovery. */
	phase?: string | null;
	focus: string | null;
	summaryText: string | null;
	startDate: string | null;
	endDate: string | null;
	targetVolumeKm?: number | null;
	sessions: ClientSession[];
}

export interface ClientLog {
	id: string;
	sessionId: string | null;
	runStats: {
		distanceKm?: number;
		durationSec?: number;
		avgHr?: number;
		avgPaceSecPerKm?: number;
	} | null;
	strengthSets: { machine: string; sets: { reps: number; weightKg: number }[] }[] | null;
	rpe: number | null;
	/** A quick thumbs up or down on how the session felt, after finishing it. */
	feedback: 'up' | 'down' | null;
	notes: string | null;
	/** When the work happened. A standalone log (a goal day, for instance) is
	 * dated here, since it has no session to carry its day. */
	startedAt?: string | null;
	createdAt?: string | number | null;
	/** True when the log was queued offline and has not synced yet. */
	pending?: boolean;
	/** How the log was recorded: manual, device or import. */
	source?: 'manual' | 'device' | 'import' | null;
}

/** An imported activity, a completed workout in its own right. */
export interface ClientActivity {
	id: string;
	provider: string;
	modality: string;
	type: string | null;
	startedAt: string;
	durationSec: number | null;
	distanceM: number | null;
	avgPaceSecPerKm: number | null;
	avgHr: number | null;
}

export interface CurrentPlan {
	goal: {
		id: string;
		goalProfileSlug: string;
		targetDate: string | null;
		baseline?: Record<string, unknown> | null;
	} | null;
	plan: {
		id: string;
		/**
		 * The generation params. The engine's own warnings about how the plan was
		 * shaped ride here when it left any, so a plan surface can show them.
		 */
		params: ({ warnings?: string[] } & Record<string, unknown>) | null;
	} | null;
	weeks: ClientWeek[];
	logs: ClientLog[];
	/** Per-session started or skipped state, kept on the server. */
	sessionStates?: { sessionId: string; state: 'started' | 'skipped'; progress?: string | null }[];
}

export const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** 0 = Monday … 6 = Sunday for a Date. */
export function mondayIndex(d: Date): number {
	return (d.getDay() + 6) % 7;
}

/** Add n days to an ISO date (yyyy-mm-dd), UTC-safe. */
export function addDaysIso(iso: string, n: number): string {
	const d = new Date(`${iso}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/** Friendly, plain-English names for the internal session type slugs. */
export const SESSION_TYPE_LABELS: Record<string, string> = {
	easy: 'Easy run',
	recovery: 'Recovery run',
	long: 'Long run',
	steady: 'Steady run',
	tempo: 'Tempo run',
	threshold: 'Threshold',
	interval: 'Intervals',
	hills: 'Hill reps',
	fartlek: 'Fartlek',
	strides: 'Strides',
	progression: 'Progression run',
	'race-pace': 'Goal pace',
	race: 'Race',
	'machine-circuit': 'Strength',
	'full-body-strength': 'Strength',
	mobility: 'Mobility',
	'cross-train': 'Cross-train',
	'walk-run': 'Walk-run',
	walk: 'Walk',
};

export function sessionTypeLabel(type: string): string {
	return SESSION_TYPE_LABELS[type] ?? type.replace(/-/g, ' ');
}

/** Friendly names for an imported activity's modality, so a card reads as a type. */
export const ACTIVITY_MODALITY_LABELS: Record<string, string> = {
	running: 'Run',
	walking: 'Walk',
	strength: 'Strength',
	mobility: 'Mobility',
	recovery: 'Recovery',
	'cross-train': 'Cross',
};

export function activityModalityLabel(modality: string): string {
	return ACTIVITY_MODALITY_LABELS[modality] ?? 'Workout';
}

/** The name shown for an imported activity: its own type, or its modality. */
export function activityTitle(activity: Pick<ClientActivity, 'type' | 'modality'>): string {
	return activity.type ? sessionTypeLabel(activity.type) : activityModalityLabel(activity.modality);
}

/** Friendly provider names for an imported activity. */
const ACTIVITY_PROVIDER_LABELS: Record<string, string> = {
	'google-health': 'Google Health',
};

export function activityProviderLabel(provider: string): string {
	if (ACTIVITY_PROVIDER_LABELS[provider]) return ACTIVITY_PROVIDER_LABELS[provider]!;
	return provider.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function dayIndexInWeek(weekStart: string, iso: string): number {
	const days = Math.round(
		(Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${weekStart}T00:00:00Z`)) / 86400000,
	);
	return ((days % 7) + 7) % 7;
}

/** 0 = Monday … 6 = Sunday for an ISO date (yyyy-mm-dd), UTC-safe. */
export function weekdayIndexFromIso(iso: string): number {
	return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * The column an ISO date sits in for the runner's week, 0 for the week's first
 * day. The calendar view groups and labels by this, Monday by default and
 * Sunday when the runner set that. It reads the date only: a session's own
 * date still comes from its plan week's start plus its day offset, so the plan
 * is untouched.
 */
export function weekColumn(iso: string, weekStart: 0 | 1): number {
	const firstWeekday = weekStart === 1 ? 6 : 0;
	return (weekdayIndexFromIso(iso) - firstWeekday + 7) % 7;
}

/**
 * The first day of the runner's week on or before an ISO date: the column-zero
 * day the calendar groups by. Monday by default and Sunday when the runner set
 * that. The month grid and the Today strip both start their rows here, so the
 * two views can never disagree on where a week begins.
 */
export function startOfWeekIso(iso: string, weekStart: 0 | 1): string {
	return addDaysIso(iso, -weekColumn(iso, weekStart));
}

/** The calendar column headers for the runner's week, first day first. */
export function weekDayInitials(weekStart: 0 | 1): string[] {
	return weekStart === 1 ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : [...DAY_INITIALS];
}

/**
 * The first cell of a month grid: the runner's week start on or before the
 * first of the month. `month` is 0-based, to match `Date.UTC`.
 */
export function monthGridStartIso(year: number, month: number, weekStart: 0 | 1): string {
	const firstIso = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
	return startOfWeekIso(firstIso, weekStart);
}

export function formatDuration(min?: number | null): string | null {
	if (min == null) return null;
	const m = Math.floor(min);
	return `${m} min`;
}

/** A duration in seconds as "45 min" or "1h 20m", for an imported activity. */
export function formatDurationSeconds(sec: number): string {
	const m = Math.round(sec / 60);
	if (m >= 60) {
		const h = Math.floor(m / 60);
		const rest = m % 60;
		return rest ? `${h}h ${rest}m` : `${h}h`;
	}
	return `${m} min`;
}

/**
 * Format a civil day (yyyy-mm-dd) for display. The day is parsed as UTC midnight
 * and formatted with a fixed UTC time zone, so a label never shifts by the
 * runner's offset. Every day label goes through here: one copy that lost
 * `timeZone: 'UTC'` is exactly how a date drifted by one before.
 */
export function formatIsoDay(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
	return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });
}

/** The warm-up drills and the stretches named by a workout, each in order. */
export interface SessionDrills {
	warmups: Drill[];
	stretches: Drill[];
}

/**
 * The steps a detail list shows: rest cards are left out, since they live in
 * the player's flow, and consecutive sets of the same move merge into one, so
 * a set-by-set sequence reads one row per move again. A run is gathered across
 * any rest cards between the sets, so three sets merge into one row even with a
 * rest between each pair. A step that already carries its own set count
 * (sessions stored before rest became explicit) passes through untouched.
 */
export function collapseRests(steps: ClientStep[]): ClientStep[] {
	const out: ClientStep[] = [];
	let i = 0;
	while (i < steps.length) {
		const s = steps[i]!;
		if (s.kind === 'rest') {
			i++;
			continue;
		}
		if (s.kind === 'work' && (s.sets ?? 0) <= 1) {
			const key = s.machine ?? s.label;
			let count = 0;
			let j = i;
			while (j < steps.length) {
				const t = steps[j]!;
				if (t.kind === 'rest') {
					j++;
					continue;
				}
				if (t.kind !== 'work' || (t.machine ?? t.label) !== key || (t.sets ?? 0) > 1 || t.reps !== s.reps) break;
				count++;
				j++;
			}
			out.push(count > 1 ? { ...s, sets: count } : s);
			i = j;
		} else {
			out.push(s);
			i++;
		}
	}
	return out;
}

/** One playable slot: a step, and when it is one set of several, its number. */
export interface StepSlot {
	step: ClientStep;
	setNo?: number;
	totalSets?: number;
}

/**
 * Expand a block's steps into playable slots. Consecutive work steps for the
 * same move form one run, with the rest cards between them left inside it, so
 * each set knows its number and the total; a single work step that carries its
 * own set count (sessions stored before rest became explicit) multiplies the
 * same way. A rest card is its own slot and never takes a set number, so the
 * work sets read 1/3, 2/3, 3/3 and a rest announces the right next set.
 */
export function expandSteps(steps: ClientStep[]): StepSlot[] {
	const slots: StepSlot[] = [];
	let i = 0;
	while (i < steps.length) {
		const s = steps[i]!;
		if (s.kind !== 'work') {
			slots.push({ step: s });
			i++;
			continue;
		}
		const key = s.machine ?? s.label;
		let j = i;
		let total = 0;
		while (j < steps.length) {
			const t = steps[j]!;
			// A rest card sits inside a run: the sets either side are the same move.
			if (t.kind === 'rest') {
				j++;
				continue;
			}
			if (t.kind !== 'work' || (t.machine ?? t.label) !== key) break;
			total += (t.sets ?? 0) > 1 ? (t.sets as number) : 1;
			j++;
		}
		let n = 0;
		for (let k = i; k < j; k++) {
			const t = steps[k]!;
			if (t.kind !== 'work') {
				slots.push({ step: t });
				continue;
			}
			const own = (t.sets ?? 0) > 1 ? (t.sets as number) : 1;
			for (let q = 0; q < own; q++) {
				n++;
				slots.push(total > 1 ? { step: t, setNo: n, totalSets: total } : { step: t });
			}
		}
		i = j;
	}
	return slots;
}

/**
 * Pull the named drills back out of a workout so the detail view and the
 * preview can show a demo for each. Warm-up steps land in `warmups`, every
 * other drill-named step (the cool-down and mobility holds) in `stretches`.
 * Steps without a matching library drill are skipped.
 */
export function sessionDrills(workout?: ClientWorkout | null): SessionDrills {
	const warmups: Drill[] = [];
	const stretches: Drill[] = [];
	const seen = new Set<string>();
	for (const block of workout?.blocks ?? []) {
		for (const s of block.steps) {
			if (!s.label || seen.has(s.label)) continue;
			const d = findDrill(s.label);
			if (!d) continue;
			seen.add(s.label);
			(s.kind === 'warmup' ? warmups : stretches).push(d);
		}
	}
	return { warmups, stretches };
}
