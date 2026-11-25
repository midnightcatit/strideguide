import type { Baseline, Modality, SessionArchetype, SessionPrescription } from '../types';

/** A single prescribed session within a week. */
export interface PlannedSession {
	/** 0 = Monday … 6 = Sunday. */
	day: number;
	slot: string;
	modality: Modality;
	type: SessionArchetype;
	title: string;
	/** One-line, researched "why", shown inline on the session card. */
	purpose: string;
	prescription: SessionPrescription;
	durationMin: number;
}

export interface PlannedWeek {
	weekNumber: number;
	phase: string;
	focus: string;
	startDate: string;
	endDate: string;
	targetVolumeKm: number;
	sessions: PlannedSession[];
}

export interface PlanDraft {
	profileSlug: string;
	weeks: PlannedWeek[];
	meta: {
		totalWeeks: number;
		startDate: string;
		targetDate?: string;
		vdot?: number;
		baseWeeklyKm: number;
		/**
		 * Non-fatal notes about how the plan was shaped, e.g. a race date that
		 * forced the length up to the four-week floor or down to the thirty-week
		 * ceiling. Absent when the plan needed no adjustment.
		 */
		warnings?: string[];
	};
}

/** A quality session kind the model may choose, if the profile allows it. */
export type QualityKind = 'tempo' | 'hills' | 'interval' | 'race-pace';

/**
 * A bounded, per-week volume intent the model may choose. It only scales or
 * holds the engine's own volume curve, so the numbers stay deterministic: the
 * engine still decides every distance.
 */
export type VolumeIntent = 'ease' | 'hold' | 'build';

/** Per-week choices the model can make; the engine validates every one. */
export interface WeekShape {
	qualityKind?: QualityKind;
	/** One short line on what the week is for. */
	emphasis?: string;
	/** Hold, ease or build this week's volume relative to the plan curve. */
	volumeIntent?: VolumeIntent;
}

export interface PlanInput {
	/** The goal profile driving the plan (from @strideguide/shared/profiles). */
	profile: {
		slug: string;
		name: string;
		modalityMix: { running: number; strength: number; mobility: number; recovery: number };
		progressionRules: { phase: string; weeks: number; volumeStep: number; deload: boolean }[];
		sessionTypes: SessionArchetype[];
		defaultWeeks: number;
		/** The goal's peak long run, as data (see GoalProfileData). */
		longRun: { peakFractionOfRace?: number; peakKm?: number; maxKm: number };
		/** Easy weeks the plan adds after race day. */
		recoveryWeeks: number;
	};
	baseline: Baseline;
	/** Available training days, 0 = Monday … 6 = Sunday. */
	availableDays: number[];
	/** ISO date, yyyy-mm-dd. */
	startDate: string;
	/** ISO date, yyyy-mm-dd. Optional (profiles like whole-fitness may not race). */
	targetDate?: string;
	/** Equipment categories the runner has (defaults to everything). */
	equipment?: string[];
	/** Specific machine names the runner has, from a gym preset or an override. */
	machines?: string[];
	/**
	 * Machine names the runner likes to train on, from the move catalog. A soft
	 * preference: the strength builder reaches for these first when they fit.
	 */
	favoriteMachines?: string[];
	/**
	 * Library workout ids the runner likes, from WORKOUT_LIBRARY. A soft
	 * preference: the engine names a favorite over its own pick when one fits the
	 * session's modality.
	 */
	favoriteWorkouts?: string[];
	/** Cross-training load in the last seven days, from logged sports sessions. */
	crossLoad?: { sessions: number; minutes: number; highEffort: number };
	/**
	 * Optional per-week shaping from the model, aligned to week order. Each choice
	 * is validated against the profile; anything invalid falls back to the engine.
	 */
	weekShapes?: (WeekShape | undefined)[];
}

export interface TrainingPaces {
	/** All paces in seconds per km. */
	easy: [number, number];
	marathon: number;
	threshold: number;
	interval: number;
	repetition: number;
}
