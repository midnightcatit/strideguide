import { z } from 'zod';
import type { D1Database } from '@cloudflare/workers-types';
import { checkRateLimit } from './rate-limit';

/**
 * Jev is TypeSafe's decisions model, served by OpenRouter. It is a System One
 * model: given some state and typed questions, it returns a typed answer with a
 * calibrated confidence instead of prose. The app already holds an OpenRouter
 * key for chat, so Jev needs no separate key.
 *
 * The model id is `typesafe/jev-1.14`; the `~typesafe/jev-latest` alias tracks
 * the newest release. The Decisions API is alpha, so its request and response
 * shape can change.
 *
 * Every failure mode (no key, rate limit, timeout, non-OK response, malformed
 * body, an answer outside the schema) resolves to `null` rather than throwing,
 * so a caller can always fall back to deterministic behaviour.
 */

const JEV_URL = 'https://openrouter.ai/api/alpha/decisions';
const DEFAULT_MODEL = 'typesafe/jev-1.14';
/** Jev answers in roughly 150ms; keep the ceiling under the coach's own budget. */
const DEFAULT_TIMEOUT_MS = 2000;

export interface JevDecision<T> {
	/** The selected answer, mapped through the caller's schema. */
	value: T;
	/** Calibrated confidence, 0 to 1. */
	confidence: number;
}

export interface JevChoiceQuestion<T> {
	type: 'choice';
	/** Question id sent to the API; the answer comes back under the same id. */
	id: string;
	instructions: string;
	/** The closed set of options, each mapped to plain instructions or null. */
	options: Record<string, string | null>;
	/** The schema that maps the selected option to the caller's type. */
	schema: z.ZodType<T>;
}

export interface JevNoulQuestion<T> {
	type: 'noul';
	id: string;
	instructions: string;
	/** Optional plain instructions for the true and false branches. */
	options?: { true?: string | null; false?: string | null };
	schema: z.ZodType<T>;
}

export interface JevScoreQuestion<T> {
	type: 'score';
	id: string;
	instructions: string;
	/** The ordered set of score labels. */
	criteria: string[];
	schema: z.ZodType<T>;
}

export type JevQuestion<T> = JevChoiceQuestion<T> | JevNoulQuestion<T> | JevScoreQuestion<T>;

/** A fixed-window gate, using the app's own limiter (lib/rate-limit.ts). */
export interface JevRateLimit {
	db: D1Database;
	key: string;
	limit: number;
	windowSec: number;
}

export interface JevOptions {
	model?: string;
	timeoutMs?: number;
	/** When set, the call is skipped if the window is exhausted. */
	rateLimit?: JevRateLimit;
}

/** The state the model evaluates: a string, an object or an array. */
export type JevState = string | Record<string, unknown> | unknown[];

interface JevAnswer {
	type?: string;
	confidence?: number;
	choice?: string;
	noul?: number;
	score?: number;
	probabilities?: Record<string, number>;
}

interface JevResponse {
	answers?: Record<string, JevAnswer>;
}

function validConfidence(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function buildQuestion<T>(question: JevQuestion<T>): Record<string, unknown> {
	switch (question.type) {
		case 'choice':
			return {
				type: 'choice',
				instructions: question.instructions,
				criteria: question.options,
			};
		case 'noul': {
			const body: Record<string, unknown> = {
				type: 'noul',
				instructions: question.instructions,
			};
			if (question.options) body.criteria = question.options;
			return body;
		}
		case 'score':
			return {
				type: 'score',
				instructions: question.instructions,
				criteria: question.criteria,
			};
	}
}

function readAnswer<T>(question: JevQuestion<T>, answer: JevAnswer): JevDecision<T> | null {
	switch (question.type) {
		case 'choice': {
			if (answer.type !== 'choice' || !validConfidence(answer.confidence)) return null;
			const parsed = question.schema.safeParse(answer.choice);
			if (!parsed.success) return null;
			return { value: parsed.data, confidence: answer.confidence };
		}
		case 'noul': {
			if (answer.type !== 'noul') return null;
			const confidence = answer.confidence ?? answer.noul;
			if (!validConfidence(confidence)) return null;
			const parsed = question.schema.safeParse(answer.noul);
			if (!parsed.success) return null;
			return { value: parsed.data, confidence };
		}
		case 'score': {
			if (answer.type !== 'score' || !validConfidence(answer.confidence)) return null;
			const parsed = question.schema.safeParse(answer.score);
			if (!parsed.success) return null;
			return { value: parsed.data, confidence: answer.confidence };
		}
	}
}

/**
 * Ask Jev one typed question about `state` and return the typed decision with its
 * confidence. Returns null on any failure or when no key is configured, so the
 * caller can fall back to deterministic behaviour.
 */
export async function askJev<T>(
	env: { OPENROUTER_API_KEY?: string },
	state: JevState,
	question: JevQuestion<T>,
	opts: JevOptions = {},
): Promise<JevDecision<T> | null> {
	if (!env.OPENROUTER_API_KEY) return null;

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
				authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				model: opts.model ?? DEFAULT_MODEL,
				state,
				questions: {
					[question.id]: buildQuestion(question),
				},
			}),
			signal: controller.signal,
		});
		if (!res.ok) return null;

		const body = (await res.json()) as JevResponse;
		const answer = body.answers?.[question.id];
		if (!answer) return null;
		return readAnswer(question, answer);
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Ask Jev one choice question. Kept as a small helper for the coach safety
 * classifier, which needs a choice among risks and a typed mapping.
 */
export async function decideChoice<T>(
	env: { OPENROUTER_API_KEY?: string },
	state: JevState,
	question: Omit<JevChoiceQuestion<T>, 'type'>,
	opts: JevOptions = {},
): Promise<JevDecision<T> | null> {
	return askJev(env, state, { ...question, type: 'choice' }, opts);
}
