import type {
	Baseline,
	Modality,
	SessionArchetype,
	SessionPrescription,
} from '../types';

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
	};
}

/** A quality session kind the model may choose, if the profile allows it. */
export type QualityKind = 'tempo' | 'hills' | 'interval' | 'race-pace';

/** Per-week choices the model can make; the engine validates every one. */
export interface WeekShape {
	qualityKind?: QualityKind;
	/** One short line on what the week is for. */
	emphasis?: string;
}

export interface PlanInput {
	/** The goal profile driving the plan (from @strideguide/shared/profiles). */
	profile: { slug: string; name: string; modalityMix: { running: number; strength: number; mobility: number; recovery: number }; progressionRules: { phase: string; weeks: number; volumeStep: number; deload: boolean }[]; sessionTypes: SessionArchetype[]; defaultWeeks: number };
	baseline: Baseline;
	/** Available training days, 0 = Monday … 6 = Sunday. */
	availableDays: number[];
	/** ISO date, yyyy-mm-dd. */
	startDate: string;
	/** ISO date, yyyy-mm-dd. Optional (profiles like whole-fitness may not race). */
	targetDate?: string;
	/** Machine names available at the gym (defaults to the PF set). */
	equipment?: string[];
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
