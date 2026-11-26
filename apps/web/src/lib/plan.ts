/** Client-side plan shapes as returned by the API, plus small display helpers. */

import { findDrill, type Drill } from '@strideguide/shared/plan';
import type { Modality } from '@strideguide/shared';

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
	plan: { id: string; params: Record<string, unknown> | null } | null;
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
