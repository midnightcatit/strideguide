/** Shared domain types for Stride Guide. */

/**
 * Every modality the plan and imported activities can carry, as one shared set.
 * A planned session and a connector activity both draw from this list, so the
 * two stores never drift apart. Cross-training is stored as `recovery` modality
 * with the `cross-train` archetype on the plan side; the activity side carries
 * `cross-train` directly.
 */
export const MODALITIES = [
	'running',
	'walking',
	'strength',
	'mobility',
	'recovery',
	'cross-train',
] as const;

export type Modality = (typeof MODALITIES)[number];

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
	/**
	 * The long run's peak for this goal, as data. A race goal states it as a
	 * fraction of the race distance; a goal with no race states an absolute
	 * distance. The engine ramps the long run toward this and grows the week only
	 * as far as it must to hold the long run inside a sane share of it.
	 */
	longRun: {
		/** Peak long run as a fraction of the race distance. Race goals only. */
		peakFractionOfRace?: number;
		/** Peak long run in km, for a goal with no race. */
		peakKm?: number;
		/** Hard ceiling on the peak, so a fraction cannot run away. */
		maxKm: number;
	};
	/**
	 * Easy weeks after race day. The plan adds them on top of the race build so it
	 * does not stop dead at the finish line. Zero for a goal with no race.
	 */
	recoveryWeeks: number;
}

/** What the user trains strength with. */
export type EquipmentPreference =
	| 'machines'
	| 'bodyweight'
	| 'bodyweight-dumbbells'
	| 'dumbbells'
	| 'barbell'
	| 'kettlebell'
	| 'bands'
	| 'both'
	| 'full-gym';

/** Equipment categories a runner may have, used to narrow a circuit to their kit. */
export type EquipmentItem = 'machines' | 'dumbbells' | 'barbell' | 'kettlebell' | 'bands';

/** When the user wants stretching built into the plan. */
export type StretchingPreference = 'after-runs' | 'rest-days' | 'both' | 'none';

/** Terrain the user mostly runs on, which biases the quality work. */
export type TerrainPreference = 'flat' | 'hilly' | 'mixed';

/** How boldly the plan should build, from the self-assessment in onboarding. */
export type BuildPreference = 'ease-in' | 'steady' | 'ambitious';

export interface Baseline {
	/** Recent race/time results, keyed loosely (e.g. "5k": "24:30"). */
	recentTimes?: Record<string, string>;
	/** Current typical weekly running volume, in km. */
	weeklyKm?: number;
	/** Self-described experience level. */
	experience?: 'beginner' | 'intermediate' | 'advanced';
	/**
	 * Age in whole years, from onboarding (stored as a birth year in settings so it
	 * stays right over time). Used only to tune training heuristics by age band,
	 * never for identity. Optional; the plan is age-neutral when it is missing.
	 */
	age?: number;
	/**
	 * An effective VDOT derived from the runner's own recent logged efforts, when
	 * they have not given a race time. Used for paces so they reflect what the
	 * runner has actually been running.
	 */
	effectiveVdot?: number;
	/** Session types the runner rated well, from thumbs feedback. */
	likedTypes?: string[];
	/** Session types the runner rated poorly, from thumbs feedback. */
	dislikedTypes?: string[];
	/**
	 * How the runner wants the plan to build: a gentle ease-in, a standard steady
	 * climb, or a bolder push. Sets how fast weekly volume grows and how the plan
	 * eases in. Defaults to steady.
	 */
	buildPreference?: BuildPreference;
	/** Equipment the user trains strength with (defaults to machines). */
	equipment?: EquipmentPreference;
	/** The equipment categories the runner actually has, to narrow the circuit to their kit. */
	equipmentItems?: EquipmentItem[];
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

/**
 * Run stats as stored on a log. Any subset of the fields, because a device
 * import may know only some of them (a walk with a duration but no distance).
 */
export type StoredRunStats = Partial<RunStats>;

/** The stored plan params: how the plan was generated and when it was rebuilt. */
export interface PlanParams {
	vdot?: number | null;
	baseWeeklyKm?: number;
	totalWeeks?: number;
	/** The plan review shown in the review step, unit-free. */
	review?: string;
	/** ISO time of the last adapt rebuild. */
	adaptedAt?: string;
	/** ISO time of the last week-one preview rebuild. */
	previewedAt?: string;
	/** ISO time of the last admin-triggered rebuild from week one. */
	rebuiltAt?: string;
}

export interface StrengthSet {
	exerciseId?: string;
	machine?: string;
	sets: { reps: number; weightKg: number; rpe?: number }[];
}

/**
 * A session's composed reason, in distinct parts so the interface can show them
 * separately. Every part is optional: a part with nothing true to say is left
 * out rather than filled with a generic line. Built by plan/why.ts from data the
 * engine already decided.
 */
export interface SessionWhy {
	/** What the session is for in the week. */
	role?: string;
	/** Why it sits on this day, from the sessions around it. */
	dayReason?: string;
	/** How it fits the plan: phase, goal, the long-run arc and the week's shape. */
	planContext?: string;
}

/** The week-level facts a session's reason is composed from. */
export interface SessionWeekContext {
	weekNumber: number;
	totalWeeks: number;
	phase: string;
	focus?: string;
	/** This week's running volume target, in km. Engine-internal; never printed. */
	volumeKm: number;
	/** Last week's running volume target, in km, when there is one. */
	prevVolumeKm?: number;
	/** This week's long-run target in km; 0 when the week has none. */
	longKm: number;
	/** The plan's biggest long run, in km. */
	peakLongKm: number;
	/** True when this week's long run steps back from last week's. */
	longRunDips?: boolean;
	/** The model's volume intent for this week, when it set one. */
	volumeIntent?: 'ease' | 'hold' | 'build';
}

/** The goal facts a session's reason is composed from. */
export interface SessionGoalContext {
	name: string;
	/** Whole weeks from this week's start to race day. 0 is race week. */
	weeksToRace?: number;
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
	/** A local start time ("HH:MM") for this session, set from the runner's schedule. */
	timeStart?: string;
	/** For strength sessions. */
	blocks?: StrengthSet[];
	notes?: string;
	/** Why this session has the amount it has (shown on the card). */
	why?: string;
	/**
	 * A short note on why this session changed in the last plan adapt, from the
	 * AI pipeline's reasons. Grounded in the runner's history; absent when there
	 * is nothing true to say.
	 */
	changeNote?: string;
	/** The composed reason, in parts: role, day and plan context. */
	whyStructured?: SessionWhy;
	/** Structured, guided step sequence (warm-up → set → rest → cool-down). */
	workout?: StructuredWorkout;
	/**
	 * The library workout this session is based on. Set on the engine's own
	 * sessions and on workouts the runner adds from the library, so the session
	 * names a workout that exists in the library.
	 */
	libraryId?: string;
	/** True when the runner added this session from the library (removable). */
	added?: boolean;
	/** True when the runner typed the workout in themselves, not from the library. */
	custom?: boolean;
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
