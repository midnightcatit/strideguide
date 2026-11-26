import { generatePlan } from './engine';
import type { FitnessState } from './fitness';
import type { PlannedWeek, PlanInput, QualityKind, WeekShape } from './types';

/**
 * Closed-loop adaptation. Rebuilds only the weeks that have not started yet, so
 * the runner's own logs move the plan forward without rewriting their history.
 * Deterministic and instant: it leans on the same engine, seeded with what the
 * runner has actually been doing and with the session kinds they rated well.
 */

export interface AdaptInput extends PlanInput {
	/** The stored plan's weeks, so past weeks are kept untouched. */
	existingWeeks: PlannedWeek[];
	/** Today, ISO yyyy-mm-dd. Weeks that start after this are rebuilt. */
	today: string;
	fitness: FitnessState;
	/** Quality kinds the profile allows, for the feedback-driven swap. */
	allowedQuality: QualityKind[];
}

export interface AdaptResult {
	weeks: PlannedWeek[];
	/** The first week number that changed, undefined when nothing changed. */
	changedFromWeek?: number;
	/** Quality kinds swapped because the runner rated them down. */
	swapped: { week: number; from: string; to: string }[];
}

export function adaptPlan(input: AdaptInput): AdaptResult {
	const { existingWeeks, today, fitness, allowedQuality } = input;
	const isFuture = existingWeeks.map((w) => w.startDate > today);
	if (!isFuture.some(Boolean)) return { weeks: existingWeeks, swapped: [] };

	// Meet the runner where they are: real recent volume sets the base, and a
	// recent hard effort sets the paces, when there is enough to go on.
	const seeded: PlanInput = {
		profile: input.profile,
		availableDays: input.availableDays,
		startDate: input.startDate,
		targetDate: input.targetDate,
		equipment: input.equipment,
		machines: input.machines,
		favoriteMachines: input.favoriteMachines,
		favoriteWorkouts: input.favoriteWorkouts,
		crossLoad: input.crossLoad,
		schedule: input.schedule,
		baseline: {
			...input.baseline,
			...(fitness.recentWeeklyKm > 0 && fitness.samples >= 3
				? { weeklyKm: fitness.recentWeeklyKm }
				: {}),
			...(input.baseline.recentTimes == null && fitness.effectiveVdot != null
				? { effectiveVdot: fitness.effectiveVdot }
				: {}),
			...(fitness.likedTypes.length ? { likedTypes: fitness.likedTypes } : {}),
			...(fitness.dislikedTypes.length ? { dislikedTypes: fitness.dislikedTypes } : {}),
		},
	};

	// Swap a quality kind the runner rated down for one they rated up, where the
	// profile allows it. Everything else stays the engine's own choice.
	const liked = allowedQuality.filter((k) => fitness.likedTypes.includes(k));
	const weekShapes: (WeekShape | undefined)[] = existingWeeks.map((w, i) => {
		if (!isFuture[i] || !liked.length) return undefined;
		const dislikedHere = w.sessions.some(
			(s) => s.modality === 'running' && fitness.dislikedTypes.includes(s.type),
		);
		return dislikedHere ? { qualityKind: liked[0] } : undefined;
	});

	const fresh = generatePlan({ ...seeded, weekShapes });

	const weeks: PlannedWeek[] = [];
	const swapped: AdaptResult['swapped'] = [];
	let changedFromWeek: number | undefined;
	existingWeeks.forEach((w, i) => {
		if (!isFuture[i]) {
			weeks.push(w);
			return;
		}
		const next = fresh.weeks[i] ?? w;
		weeks.push(next);
		if (changedFromWeek === undefined) changedFromWeek = w.weekNumber;
		const before = w.sessions.find(
			(s) => s.modality === 'running' && fitness.dislikedTypes.includes(s.type),
		);
		if (before) {
			const after = next.sessions.find(
				(s) => s.modality === 'running' && (allowedQuality as string[]).includes(s.type),
			);
			if (after && after.type !== before.type) {
				swapped.push({ week: w.weekNumber, from: before.type, to: after.type });
			}
		}
	});

	// The fresh plan can be longer than the stored one: the engine appends the
	// goal's easy weeks after race day. Carry those extra weeks over, with their
	// own numbers, phases, dates and sessions, so an adapt ends with the same
	// week count a fresh generate would give for the same inputs.
	for (let i = existingWeeks.length; i < fresh.weeks.length; i++) {
		weeks.push(fresh.weeks[i]!);
	}

	return { weeks, changedFromWeek, swapped };
}
