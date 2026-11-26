import { z } from 'zod';
import type {
	LongRunDelta,
	PlanChangeContext,
	PlanChangeDecisions,
	QualityDayCount,
	VolumeIntent,
	WeekChangeDecision,
	WeekChangeReason,
	WeekShape,
} from '@strideguide/shared/plan';
import {
	buildWeekDecision,
	composeChangeReasons,
	decisionsToWeekShapes,
	LONG_RUN_DELTA_OPTIONS,
	QUALITY_COUNT_LABELS,
	QUALITY_COUNT_OPTIONS,
	VOLUME_INTENT_OPTIONS,
	type QualityCountOption,
	type RawDecision,
} from '@strideguide/shared/plan';
import { decideChoice, type JevChoiceQuestion, type JevDecision } from './jev';

/**
 * The plan-change pipeline, on the API side: it builds the Jev questions, runs
 * them against the context, and hands the answers to the pure mapping and reason
 * functions in @strideguide/shared/plan. It never writes a distance or a pace,
 * and every failure (no key, a timeout, a bad answer) returns null so the caller
 * falls back to the deterministic plan.
 *
 * The same shape serves every change path. Only the context differs, so a goal
 * change, an equipment change or a missed-week adapt all reach the same three
 * typed decisions: the week's volume intent, the quality-day count and the
 * long-run delta.
 */

/** How many weeks ahead the pipeline shapes, to bound the model calls. */
export const MAX_AI_WEEKS = 3;

export interface PlanChangeOutcome {
	decisions: PlanChangeDecisions;
	/** Engine week shapes keyed by week number, for the weeks the pipeline shaped. */
	shapes: Map<number, WeekShape>;
	reasons: WeekChangeReason[];
}

/** The env the pipeline needs: the optional TypeSafe key. */
type JevEnv = { TYPESAFE_API_KEY?: string };

function volumeQuestion(weekNumber: number): JevChoiceQuestion<VolumeIntent> {
	return {
		id: `volume_intent_w${weekNumber}`,
		instructions:
			'Given the runner history and the plan so far, should this week running volume ease, hold, or build relative to the plan curve? Ease or hold when sessions were missed, adherence was low, or effort has been rising. Build only when the runner kept to plan and effort is steady.',
		options: { ...VOLUME_INTENT_OPTIONS },
		schema: z.enum(['ease', 'hold', 'build']),
	};
}

function qualityQuestion(weekNumber: number): JevChoiceQuestion<QualityCountOption> {
	return {
		id: `quality_count_w${weekNumber}`,
		instructions:
			'How many hard quality days should this week carry, from the runner history and the phase? Drop to none after a run of hard sessions or a rough patch. Two only when the runner is handling the load well and the phase supports it.',
		options: { ...QUALITY_COUNT_LABELS },
		schema: z.enum(QUALITY_COUNT_OPTIONS),
	};
}

function longRunQuestion(weekNumber: number): JevChoiceQuestion<LongRunDelta> {
	return {
		id: `long_run_delta_w${weekNumber}`,
		instructions:
			'Should this week long run ease, hold, or build relative to the plan? Ease it with the week when the runner is behind or carrying fatigue, hold it in a steady block, and build it only when the runner has kept to plan.',
		options: { ...LONG_RUN_DELTA_OPTIONS },
		schema: z.enum(['ease', 'hold', 'build']),
	};
}

/** The robust state the model evaluates: goal, previous config, history, intent. */
function stateForWeek(ctx: PlanChangeContext, weekNumber: number): Record<string, unknown> {
	return {
		intent: ctx.intent,
		goal: ctx.goal,
		history: ctx.history,
		previous: ctx.previous,
		week: ctx.previous.find((w) => w.weekNumber === weekNumber) ?? null,
	};
}

function toRaw<T extends string>(decision: JevDecision<T> | null): RawDecision | null {
	return decision ? { value: decision.value, confidence: decision.confidence } : null;
}

/**
 * Run the pipeline for one change. Returns the typed decisions, the engine
 * shapes and the grounded reasons, or null when no key is set or nothing usable
 * came back, in which case the caller keeps the deterministic plan.
 */
export async function buildPlanChange(
	env: JevEnv,
	ctx: PlanChangeContext,
): Promise<PlanChangeOutcome | null> {
	const weekNumbers = ctx.affectedWeekNumbers.slice(0, MAX_AI_WEEKS);
	if (!weekNumbers.length) return null;

	try {
		const answers = await Promise.all(
			weekNumbers.map(async (weekNumber) => {
				const state = stateForWeek(ctx, weekNumber);
				const [volume, quality, longRun] = await Promise.all([
					decideChoice<VolumeIntent>(env, state, volumeQuestion(weekNumber)),
					decideChoice<QualityCountOption>(env, state, qualityQuestion(weekNumber)),
					decideChoice<LongRunDelta>(env, state, longRunQuestion(weekNumber)),
				]);
				return buildWeekDecision(weekNumber, {
					volume: toRaw(volume),
					quality: toRaw(quality),
					longRun: toRaw(longRun),
				});
			}),
		);

		const weeks = answers.filter((d): d is WeekChangeDecision => d !== null);
		if (!weeks.length) return null;
		const decisions: PlanChangeDecisions = { weeks };
		return {
			decisions,
			shapes: decisionsToWeekShapes(decisions),
			reasons: composeChangeReasons(decisions, ctx),
		};
	} catch {
		return null;
	}
}

/** A week's decisions as the client or a log reads them, without engine internals. */
export interface PlanChangeSummaryWeek {
	weekNumber: number;
	volumeIntent?: { value: VolumeIntent; confidence: number };
	qualityDayCount?: { value: QualityDayCount; confidence: number };
	longRunDelta?: { value: LongRunDelta; confidence: number };
	reason?: string;
}
