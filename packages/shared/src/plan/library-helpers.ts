/**
 * Small builders shared by the core workout library and the wave-5 additions, so
 * a workout is written the same way in both files.
 */

import type { StepBlock, StepKind, StructuredWorkout, WorkoutStep } from '../types';

export function step(
	kind: StepKind,
	label: string,
	durationSec: number,
	note?: string,
	extra: Partial<WorkoutStep> = {},
): WorkoutStep {
	return { kind, label, durationSec, note, ...extra };
}

export function block(steps: WorkoutStep[], repeat = 1, label?: string): StepBlock {
	return { repeat, label, steps };
}

export function wk(blocks: StepBlock[]): StructuredWorkout {
	return { blocks };
}

export const MIN = 60;
