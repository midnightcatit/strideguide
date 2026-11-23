/** Client-side plan shapes as returned by the API, plus small display helpers. */

import { findDrill, type Drill } from '@strideguide/shared/plan';

export type Modality = 'running' | 'walking' | 'strength' | 'mobility' | 'recovery';

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
	blocks?: { machine: string; sets: { reps: number; weightKg: number }[] }[];
	notes?: string;
	/** Why this session has the amount it has. */
	why?: string;
	workout?: ClientWorkout;
	/** True when the user added this session from the library (removable). */
	added?: boolean;
	/** Library id, when the session was added from the library. */
	libraryId?: string;
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
	/** Plan phase: base, build, peak or taper. */
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
	createdAt?: string | number | null;
	/** True when the log was queued offline and has not synced yet. */
	pending?: boolean;
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

export function dayIndexInWeek(weekStart: string, iso: string): number {
	const days = Math.round(
		(Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${weekStart}T00:00:00Z`)) / 86400000,
	);
	return ((days % 7) + 7) % 7;
}

export function formatDuration(min?: number | null): string | null {
	if (min == null) return null;
	const m = Math.floor(min);
	return `${m} min`;
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
