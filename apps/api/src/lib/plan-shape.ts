import { sanitizeText, WRITING_RULES } from '@strideguide/shared/writing';
import type {
	QualityKind,
	VolumeIntent,
	WeekShape,
	WeekOnePattern,
} from '@strideguide/shared/plan';
import { runAi, type AiMessage } from './ai';

const ALL: QualityKind[] = ['tempo', 'hills', 'interval', 'race-pace'];
const INTENTS: VolumeIntent[] = ['ease', 'hold', 'build'];

export interface ShapeContext {
	goalName: string;
	weeks: { weekNumber: number; phase: string; volumeKm: number }[];
	/** Quality kinds this profile allows. */
	allowed: QualityKind[];
	/** Baseline and preferences to reason from. */
	prefs: Record<string, unknown>;
	/** What the runner has actually been doing, from their own logs. */
	fitness?: {
		recentWeeklyKm?: number;
		rpeTrend?: 'rising' | 'steady' | 'falling';
		likedTypes?: string[];
		dislikedTypes?: string[];
		samples?: number;
	};
	/**
	 * The runner's approved week one, when the plan is being rebuilt from it. The
	 * model shapes the later weeks around these days, types and added workouts.
	 */
	weekOne?: WeekOnePattern;
}

/** A one-line read of the approved week one, or empty when there is none. */
function weekOneLine(weekOne?: WeekOnePattern): string {
	if (!weekOne || !weekOne.days.length) return '';
	const days = weekOne.days.map((d) => `day ${d.day} ${d.slot} ${d.type}`);
	const added = weekOne.recurring.map((r) => `day ${r.day} ${r.slot} the ${r.type} they added`);
	const bits = [`the days the runner trains: ${days.join('; ')}`];
	if (added.length) bits.push(`workouts to keep on their days: ${added.join('; ')}`);
	if (weekOne.qualityKinds.length)
		bits.push(`quality in week one: ${weekOne.qualityKinds.join(', ')}`);
	return ` The runner approved their first week: ${bits.join('. ')}. Shape the later weeks around that pattern, keeping the same training days and mirroring the session types and any added workouts.`;
}

/** A one-line read of the runner's recent training, or empty when there is none. */
function fitnessLine(fitness: ShapeContext['fitness']): string {
	if (!fitness || (fitness.samples ?? 0) <= 0) return '';
	const bits: string[] = [];
	if (fitness.recentWeeklyKm) bits.push(`about ${fitness.recentWeeklyKm} km a week`);
	if (fitness.rpeTrend) bits.push(`effort lately ${fitness.rpeTrend}`);
	if (fitness.likedTypes?.length) bits.push(`rated ${fitness.likedTypes.join(', ')} well`);
	if (fitness.dislikedTypes?.length) bits.push(`rated ${fitness.dislikedTypes.join(', ')} poorly`);
	if (!bits.length) return '';
	return ` What the runner has actually been doing: ${bits.join('; ')}. Lean toward the sessions they rated well and away from the ones they did not, when the phase allows it.`;
}

function extractJsonArray(text: string): unknown[] | null {
	const start = text.indexOf('[');
	const end = text.lastIndexOf(']');
	if (start === -1 || end === -1 || end <= start) return null;
	try {
		const parsed = JSON.parse(text.slice(start, end + 1));
		return Array.isArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * Ask the model to shape the plan, one choice per week, within the profile's
 * rules. Bounded and best-effort: on any failure it returns null, and the
 * deterministic plan stands unchanged. Every choice is validated here and again
 * in the engine, so a bad answer can never produce a broken plan.
 */
export async function shapePlan(
	env: Parameters<typeof runAi>[0],
	ctx: ShapeContext,
): Promise<(WeekShape | undefined)[] | null> {
	if (!ctx.allowed.length || !ctx.weeks.length) return null;

	const messages: AiMessage[] = [
		{
			role: 'system',
			content: `${WRITING_RULES}

You are a running coach shaping a plan the engine has already laid out. For each week, choose the kind of quality session, whether to hold, ease or build that week's volume, and write a short line on what the week is for, using the goal, the phase and the runner's preferences. Reply with ONLY a JSON array, one object per week, in order: {"qualityKind": "...", "volumeIntent": "...", "emphasis": "..."}. qualityKind must be one of: ${ctx.allowed.join(', ')}. volumeIntent must be one of: ease, hold, build; most weeks should be build, and hold or ease suits a recovery week or the week before a hard block. The emphasis is 16 words or fewer, and must never state a distance or a unit, since it is stored and shown whatever units the runner later picks.`,
		},
		{
			role: 'user',
			content: `Goal: ${ctx.goalName}. Runner preferences: ${JSON.stringify(ctx.prefs)}.${fitnessLine(ctx.fitness)}${weekOneLine(ctx.weekOne)} Weeks: ${JSON.stringify(ctx.weeks)}`,
		},
	];

	try {
		const res = await runAi(env, messages, { maxTokens: 800, timeoutMs: 4000 });
		const arr = extractJsonArray(res.text);
		if (!arr || arr.length !== ctx.weeks.length) return null;
		return arr.map((entry) => {
			if (!entry || typeof entry !== 'object') return undefined;
			const row = entry as Record<string, unknown>;
			const raw = typeof row.qualityKind === 'string' ? row.qualityKind.trim().toLowerCase() : '';
			const qualityKind =
				ALL.includes(raw as QualityKind) && ctx.allowed.includes(raw as QualityKind)
					? (raw as QualityKind)
					: undefined;
			const emphasis =
				typeof row.emphasis === 'string' ? sanitizeText(row.emphasis).slice(0, 140) : undefined;
			const rawIntent =
				typeof row.volumeIntent === 'string' ? row.volumeIntent.trim().toLowerCase() : '';
			const volumeIntent = INTENTS.includes(rawIntent as VolumeIntent)
				? (rawIntent as VolumeIntent)
				: undefined;
			if (!qualityKind && !emphasis && !volumeIntent) return undefined;
			return { qualityKind, emphasis: emphasis || undefined, volumeIntent };
		});
	} catch {
		return null;
	}
}
