import { eq } from 'drizzle-orm';
import { schema } from '../db';
import type { Db } from '../db';
import type { Env } from '../env';
import { runAi, type AiMessage } from './ai';
import { sanitizeText, WRITING_RULES } from '@strideguide/shared/writing';

const PHASE_FOCUS: Record<string, string> = {
	base: 'building aerobic volume and keeping it easy',
	build: 'adding quality work on top of the base',
	peak: 'sharpening and practicing goal pace',
	taper: 'freshening up while keeping the intensity',
};

/** Deterministic fallback summary, used whenever AI is unavailable or fails. */
export function templateWeekSummary(weekNumber: number, phase: string, volumeKm: number): string {
	const focus = PHASE_FOCUS[phase] ?? phase;
	return `Week ${weekNumber}: ${focus}.`;
}

export interface WeekLite {
	weekNumber: number;
	phase: string;
	targetVolumeKm: number;
}

export interface NarrationResult {
	summaries: string[];
	usedAi: boolean;
	model?: string;
}

/**
 * Best-effort AI narration of weekly summaries (PLAN.md §6.2, generate-on-event).
 * Always returns a usable array: falls back to deterministic text on any failure.
 */
export async function narrateWeeks(env: Env, weeks: WeekLite[]): Promise<NarrationResult> {
	const fallback = weeks.map((w) => templateWeekSummary(w.weekNumber, w.phase, w.targetVolumeKm));
	try {
		const messages: AiMessage[] = [
			{
				role: 'system',
				content: `${WRITING_RULES}

You are a sports-scientist running coach writing weekly plan summaries. Reply with ONLY a JSON array of strings, one short summary per week (18 words or fewer), in order, one per week. Do not mention distances or units, since units vary by user.`,
			},
			{
				role: 'user',
				content: `Write one short summary per week for this training plan: ${JSON.stringify(
					weeks.map((w) => ({ week: w.weekNumber, phase: w.phase, km: w.targetVolumeKm })),
				)}`,
			},
		];
		const res = await runAi(env, messages, { maxTokens: 800 });
		const parsed = extractJsonArray(res.text);
		if (parsed && parsed.length === weeks.length) {
			return {
				summaries: parsed.map((s, i) => {
					const text = typeof s === 'string' ? sanitizeText(s) : '';
					return text || fallback[i]!;
				}),
				usedAi: true,
				model: res.model,
			};
		}
	} catch {
		// fall through to deterministic summaries
	}
	return { summaries: fallback, usedAi: false };
}

function extractJsonArray(text: string): unknown[] | null {
	const start = text.indexOf('[');
	const end = text.lastIndexOf(']');
	if (start === -1 || end <= start) return null;
	try {
		const value = JSON.parse(text.slice(start, end + 1));
		return Array.isArray(value) ? value : null;
	} catch {
		return null;
	}
}

/** What the plan review is written from. No distances or paces: the text is stored. */
export interface PlanReviewContext {
	goalName: string;
	totalWeeks: number;
	/** Age in whole years, when the runner gave one. Drives the age-band wording. */
	age?: number;
	/** Phase of each week, in order (base, build, peak, taper). */
	phases: string[];
	/** Strength sessions a week, so the review can name the balance. */
	strengthPerWeek: number;
	/** The first week's session names, plainly. */
	firstWeek: string[];
}

// A baked distance, pace or unit token, e.g. "5 km", "3.1 mi", "5:30 /km". The
// stored review must stay unit-free, so a reply that carries one is rejected and
// the deterministic template is used instead.
const BAKED_UNIT = /\d\s*(km|mi|kilometres?|kilometers?|miles?|metres?|meters?|yards?)\b|\b\d{1,2}:\d{2}\s*\/\s*(km|mi)\b/i;

/** Deterministic fallback review, used whenever AI is unavailable or fails. */
export function templatePlanReview(ctx: PlanReviewContext): string {
	const startFocus = PHASE_FOCUS[ctx.phases[0] ?? 'base'] ?? 'building the aerobic base';
	const strength =
		ctx.strengthPerWeek > 0
			? ` Strength work runs alongside it, ${ctx.strengthPerWeek} session${ctx.strengthPerWeek === 1 ? '' : 's'} a week, to protect the joints that carry the running.`
			: '';
	const ageNote = ctx.age && ctx.age >= 50 ? ' Your age band shapes how gently the plan climbs, with recovery built in. ' : ' ';
	return (
		`This plan is built for ${ctx.goalName}, starting by ${startFocus}.` +
		` This week keeps the effort controlled so you can absorb the work, and the weeks build from there toward the goal, with lighter weeks to recover.` +
		ageNote +
		strength +
		' Trust the easy days and let the harder ones come to you.'
	);
}

export interface PlanReviewResult {
	text: string;
	usedAi: boolean;
	model?: string;
}

/**
 * Best-effort AI plan review: a short, human paragraph on why the plan is shaped
 * as it is, what to expect this week, and what to expect as it moves forward.
 * Always returns usable text: falls back to the deterministic template on any
 * failure, and rejects a reply that bakes in units, since the text is stored.
 */
export async function reviewPlan(env: Env, ctx: PlanReviewContext): Promise<PlanReviewResult> {
	const fallback = templatePlanReview(ctx);
	try {
		const messages: AiMessage[] = [
			{
				role: 'system',
				content: `${WRITING_RULES}

You are a sports-scientist running coach writing a short review of a plan you just built. Write one short paragraph, about 90 to 130 words, that covers three things in order: why this plan is shaped the way it is, what the runner should expect this week, and what to expect as the plan moves forward. Write warmly and plainly, as if talking to the runner. No headings, no lists. Never state a distance, a pace or any unit, and never invent research or citations. Where a training principle matters, describe it in plain words instead.`,
			},
			{
				role: 'user',
				content: `Goal: ${ctx.goalName}. Plan length: ${ctx.totalWeeks} weeks. Phases, in order: ${ctx.phases.join(', ')}. Strength sessions a week: ${ctx.strengthPerWeek}.${ctx.age ? ` Runner age: ${ctx.age}.` : ''} First week sessions: ${ctx.firstWeek.join(', ')}.`,
			},
		];
		const res = await runAi(env, messages, { maxTokens: 500, timeoutMs: 4000 });
		const text = sanitizeText(res.text).slice(0, 1200);
		if (text && !BAKED_UNIT.test(text)) return { text, usedAi: true, model: res.model };
	} catch {
		// fall through to the deterministic review
	}
	return { text: fallback, usedAi: false };
}

export interface StoredWeek {
	id: string;
	weekNumber: number;
	phase: string;
	targetVolumeKm: number;
}

/**
 * Best-effort AI narration run AFTER the plan is already saved (via waitUntil),
 * so onboarding never waits on the model. Updates week summaries in place when it
 * succeeds, and always records the job.
 */
export async function narrateAndStore(env: Env, db: Db, weeks: StoredWeek[]): Promise<void> {
	try {
		const narration = await narrateWeeks(
			env,
			weeks.map((w) => ({
				weekNumber: w.weekNumber,
				phase: w.phase,
				targetVolumeKm: w.targetVolumeKm,
			})),
		);
		if (narration.usedAi) {
			for (let i = 0; i < weeks.length; i++) {
				const summary = narration.summaries[i];
				if (summary) {
					await db
						.update(schema.planWeeks)
						.set({ summaryText: summary })
						.where(eq(schema.planWeeks.id, weeks[i]!.id));
				}
			}
		}
		await db.insert(schema.aiJobs).values({
			id: crypto.randomUUID(),
			type: 'plan_narration',
			status: narration.usedAi ? 'ok' : 'error',
			modelUsed: narration.model ?? 'template',
			latencyMs: 0,
		});
	} catch {
		await db
			.insert(schema.aiJobs)
			.values({ id: crypto.randomUUID(), type: 'plan_narration', status: 'error', modelUsed: 'template' })
			.catch(() => {});
	}
}
