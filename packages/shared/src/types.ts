/** Shared domain types for Stride Guide. */

export type Modality = 'running' | 'strength' | 'mobility' | 'recovery';

export type SessionArchetype =
	| 'easy'
	| 'recovery'
	| 'long'
	| 'tempo'
	| 'threshold'
	| 'interval'
	| 'race-pace'
	| 'strides'
	| 'hills'
	| 'fartlek'
	| 'race'
	| 'machine-circuit'
	| 'full-body-strength'
	| 'mobility'
	| 'cross-train';

export type Intensity = 'easy' | 'steady' | 'hard';

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

/** What the user trains strength with. */
export type EquipmentPreference = 'machines' | 'bodyweight' | 'both';

/** When the user wants stretching built into the plan. */
export type StretchingPreference = 'after-runs' | 'rest-days' | 'both' | 'none';

/** Terrain the user mostly runs on, which biases the quality work. */
export type TerrainPreference = 'flat' | 'hilly' | 'mixed';

export interface Baseline {
	/** Recent race/time results, keyed loosely (e.g. "5k": "24:30"). */
	recentTimes?: Record<string, string>;
	/** Current typical weekly running volume, in km. */
	weeklyKm?: number;
	/** Self-described experience level. */
	experience?: 'beginner' | 'intermediate' | 'advanced';
	/** Equipment the user trains strength with (defaults to machines). */
	equipment?: EquipmentPreference;
	/** Strength sessions per week, when the user has a view (1 to 3). */
	strengthDays?: number;
	/** Typical session length in minutes, used to size circuits. */
	sessionMinutes?: number;
	/** Flexibility now and the goal, each 1 (tight) to 5 (very flexible). */
	flexibility?: { current: number; goal: number };
	/** When the user wants stretching. */
	stretching?: StretchingPreference;
	/** Cross-training the user can do, e.g. bike, swim, soccer. */
	crossTraining?: string[];
	/** Any other activity, in the user's words. */
	customActivity?: string;
	/** Each activity and the days it happens on, 0 = Monday. */
	crossTrainingSchedule?: { activity: string; days: number[] }[];
	/** Terrain the user mostly runs on. */
	terrain?: TerrainPreference;
	/** Free-text niggles the coach should know about. */
	niggles?: string;
	/** Free-text notes from onboarding. */
	notes?: string;
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
	/** Easy / steady / hard band (drives the intensity ladder in the UI). */
	intensity?: Intensity;
	/** For running sessions. */
	targetPaceSecPerKm?: [number, number];
	targetZone?: string;
	targetRpe?: [number, number];
	targetDistanceKm?: number;
	/** For strength sessions. */
	blocks?: StrengthSet[];
	notes?: string;
	/** Why this session has the amount it has (shown on the card). */
	why?: string;
	/** Structured, guided step sequence (warm-up → set → rest → cool-down). */
	workout?: StructuredWorkout;
}

export type StepKind = 'warmup' | 'work' | 'recovery' | 'rest' | 'cooldown';

export interface WorkoutStep {
	kind: StepKind;
	/** Short label, e.g. "Warm-up", "Interval", "Recovery", "Cool-down". */
	label: string;
	/** Distance target, when the step is distance-based. */
	distanceM?: number;
	/** Duration target, when the step is time-based (e.g. rest). */
	durationSec?: number;
	/** Rest to run automatically after completing this step. */
	restSec?: number;
	targetPaceSecPerKm?: [number, number];
	targetZone?: string;
	targetRpe?: [number, number];
	note?: string;
	/** For strength steps: the machine and its prescription. */
	machine?: string;
	sets?: number;
	reps?: number;
}

export interface StepBlock {
	/** 1 for warm-up/cool-down; N for a repeated set. */
	repeat: number;
	label?: string;
	steps: WorkoutStep[];
}

export interface StructuredWorkout {
	blocks: StepBlock[];
	totalDistanceKm?: number;
	estimatedDurationMin?: number;
}

export interface ApiUser {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
}
