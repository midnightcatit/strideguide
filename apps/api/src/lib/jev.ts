import { z } from 'zod';
import type { D1Database } from '@cloudflare/workers-types';
import { checkRateLimit } from './rate-limit';

/**
 * TypeSafe AI's Jev is a System One model: it does not write prose, it answers a
 * typed question about supplied state with schema-constrained values and a
 * calibrated confidence, in a fraction of the time and cost of a frontier model.
 * It fits a decision among options, so this client only exposes a choice
 * question: pick one option from a closed set, then map that option through a
 * schema into the typed value the caller wants.
 *
 * Every failure mode (no key, rate limit, timeout, non-OK response, malformed
 * body, an option outside the schema) resolves to `null` rather than throwing, so
 * a caller can always fall back to deterministic behaviour.
 */

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const DEFAULT_MODEL = 'jev-latest';
/** Jev answers in roughly 150ms; keep the ceiling well under the coach's own budget. */
const DEFAULT_TIMEOUT_MS = 2000;

export interface JevDecision<T> {
	/** The selected option, mapped through the caller's schema. */
	value: T;
	/** Calibrated confidence in the selection, 0 to 1. */
	confidence: number;
}

export interface JevChoiceQuestion<T> {
	/** Question id sent to the API; the answer comes back under the same key. */
	id: string;
	/** What the model should decide when choosing an option. */
	instructions: string;
	/** The closed option set: option name to a plain description (or null). */
	options: Record<string, string | null>;
	/** Validates the selected option name into the typed value. */
	schema: z.ZodType<T>;
}

/** A fixed-window gate, reused from the app's own limiter (lib/rate-limit.ts). */
export interface JevRateLimit {
	db: D1Database;
	key: string;
	limit: number;
	windowSec: number;
}

export interface JevOptions {
	model?: string;
	timeoutMs?: number;
	/** When set, the call is skipped once the window is exhausted. */
	rateLimit?: JevRateLimit;
}

/** The state the model evaluates: a string, or any JSON object or array. */
export type JevState = string | Record<string, unknown> | unknown[];

interface JevChoiceAnswer {
	type?: unknown;
	choice?: unknown;
	confidence?: unknown;
}

interface JevResponse {
	answers?: Record<string, JevChoiceAnswer>;
}

function validConfidence(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

/**
 * Ask Jev one choice question about `state` and return the typed decision with
 * its confidence. Returns null on any failure or when no key is configured, so
 * the caller can fall back to deterministic behaviour instead of failing.
 */
export async function decideChoice<T>(
	env: { TYPESAFE_API_KEY?: string },
	state: JevState,
	question: JevChoiceQuestion<T>,
	opts: JevOptions = {},
): Promise<JevDecision<T> | null> {
	if (!env.TYPESAFE_API_KEY) return null;

	if (opts.rateLimit) {
		try {
			const { db, key, limit, windowSec } = opts.rateLimit;
			const rl = await checkRateLimit(db, key, limit, windowSec);
			if (!rl.ok) return null;
		} catch {
			return null;
		}
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	try {
		const res = await fetch(JEV_URL, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				model: opts.model ?? DEFAULT_MODEL,
				state,
				questions: {
					[question.id]: {
						type: 'choice',
						instructions: question.instructions,
						criteria: question.options,
					},
				},
			}),
			signal: controller.signal,
		});
		if (!res.ok) return null;

		const data = (await res.json()) as JevResponse;
		const answer = data.answers?.[question.id];
		if (!answer || answer.type !== 'choice') return null;
		if (!validConfidence(answer.confidence)) return null;

		const parsed = question.schema.safeParse(answer.choice);
		if (!parsed.success) return null;
		return { value: parsed.data, confidence: answer.confidence };
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
