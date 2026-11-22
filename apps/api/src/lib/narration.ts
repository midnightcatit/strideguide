import type { Env } from '../env';
import { runAi, type AiMessage } from './ai';

const PHASE_FOCUS: Record<string, string> = {
	base: 'build aerobic volume, keep it easy',
	build: 'add quality work on top of the base',
	peak: 'sharpen and rehearse goal pace',
	taper: 'freshen up while keeping intensity',
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
				content:
					'You are a sports-scientist running coach. Reply with ONLY a JSON array of strings, one short (<= 18 words) summary per week, in order. Plain prose, no markdown. No em dashes. No hype or hedging; be specific. Do not mention distances or units, since units vary by user.',
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
				summaries: parsed.map((s, i) => (typeof s === 'string' && s.trim() ? s.trim() : fallback[i]!)),
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
