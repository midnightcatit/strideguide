/** Shared domain types for Stride Guide. */

export type Modality = 'running' | 'strength' | 'mobility' | 'recovery';

export type SessionArchetype =
	| 'easy'
	| 'recovery'
	| 'long'
	| 'tempo'
	| 'threshold'
	| 'interval'
	| 'strides'
	| 'hills'
	| 'fartlek'
	| 'race'
	| 'machine-circuit'
	| 'full-body-strength'
	| 'mobility'
	| 'cross-train';

export type GoalSlug = 'marathon' | 'half-marathon' | '10k' | '5k' | 'whole-fitness';

/** How a goal profile weights each modality. Values sum to 1. */
export interface ModalityMix {
	running: number;
	strength: number;
	mobility: number;
	recovery: number;
}

export interface ProgressionRule {
	/** Phase label, e.g. "base", "build", "peak", "taper". */
	phase: string;
	/** Weeks this phase typically spans. */
	weeks: number;
	/** Volume change per week as a fraction, e.g. 0.10 for +10%. */
	volumeStep: number;
	/** Whether this phase ends in a deload. */
	deload: boolean;
}

export interface SuccessMetric {
	key: string;
	label: string;
	weight: number;
}

export interface GoalProfileData {
	slug: GoalSlug;
	name: string;
	description: string;
	modalityMix: ModalityMix;
	progressionRules: ProgressionRule[];
	successMetrics: SuccessMetric[];
	requiredInputs: string[];
	sessionTypes: SessionArchetype[];
	/** Typical plan length in weeks when a target date is not driving it. */
	defaultWeeks: number;
}

export interface Baseline {
	/** Recent race/time results, keyed loosely (e.g. "5k": "24:30"). */
	recentTimes?: Record<string, string>;
	/** Current typical weekly running volume, in km. */
	weeklyKm?: number;
	/** Self-described experience level. */
	experience?: 'beginner' | 'intermediate' | 'advanced';
}

export interface RunStats {
	distanceKm: number;
	durationSec: number;
	avgPaceSecPerKm?: number;
	avgHr?: number;
	effort?: number;
	splits?: { label: string; paceSecPerKm?: number; note?: string }[];
}

export interface StrengthSet {
	exerciseId?: string;
	machine?: string;
	sets: { reps: number; weightKg: number; rpe?: number }[];
}

export interface SessionPrescription {
	summary: string;
	/** For running sessions. */
	targetPaceSecPerKm?: [number, number];
	targetZone?: string;
	targetRpe?: [number, number];
	targetDistanceKm?: number;
	/** For strength sessions. */
	blocks?: StrengthSet[];
	notes?: string;
}

export interface ApiUser {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
}
