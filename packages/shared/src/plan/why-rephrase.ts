/**
 * Rewording a session's reason with the model, safely.
 *
 * The engine composes the reason deterministically (plan/why.ts). This module
 * lets the chat model say the same things better, and holds the pure guards that
 * keep it honest: the prompt, the reply parser, and a gate that runs every
 * candidate line through sanitizeText and rejects anything empty, outside a
 * length bound, or materially different from the line it rewrites. Nothing here
 * calls a provider, so it is cheap to test and free of I/O.
 */
import type { SessionWhy } from '../types';
import { sanitizeText, WRITING_RULES } from '../writing';

/** The parts of a reason, so the gate can judge each line on its own. */
export const WHY_FIELDS = ['role', 'dayReason', 'planContext'] as const;
export type WhyField = (typeof WHY_FIELDS)[number];

/** What the model is told about one session, so it can reword its lines. */
export interface WhyRephraseInput {
	/** Day offset in the week (0 = Monday), for context only. */
	day: number;
	title: string;
	weekNumber: number;
	phase: string;
	/** The goal's name, the same for every session in one plan. */
	goalName?: string;
	/** The deterministic reason, the only thing the model may reword. */
	reason: SessionWhy;
}

/**
 * Ask the model to reword the notes, keeping the meaning exactly. A rephrase
 * that adds a fact or a number is a failure the gate catches; the prompt says so
 * plainly first so most replies never need the gate.
 */
export function buildWhyRephrasePrompt(inputs: WhyRephraseInput[]): {
	system: string;
	user: string;
} {
	const goal = inputs.find((i) => i.goalName)?.goalName;
	const system = `${WRITING_RULES}

You are a running coach rewording the notes on a training plan's sessions. Each session comes with the role it plays, why it sits on its day, and how it fits the plan. Rewrite each line so it reads better, keeping the meaning exactly.
- Say only what the line already says. Do not add facts, and do not bring in anything about the runner that is not in the line.
- Never introduce a number, a distance, a unit, or a pace that is not already in the line.
- Never give medical advice, and never mention injury, pain or illness.
- Keep each line about as long as the original, one plain sentence.

Reply with ONLY a JSON array, one object per session, in the same order. Each object carries the same keys as the lines given for that session (role, dayReason, planContext), each a plain string, and omits a key for a line that was not given.`;

	const rows = inputs.map((i) => ({
		day: i.day,
		title: i.title,
		week: i.weekNumber,
		phase: i.phase,
		role: i.reason.role ?? null,
		dayReason: i.reason.dayReason ?? null,
		planContext: i.reason.planContext ?? null,
	}));
	const user = `${goal ? `Goal: ${goal}. ` : ''}Reword the notes on these sessions, in order, one object each: ${JSON.stringify(rows)}`;
	return { system, user };
}

/**
 * Read the model's reply as one partial reason per session. Returns null when
 * there is no array to read, so the caller keeps the deterministic reasons. A
 * row that is not an object, or carries no usable line, comes back as null.
 */
export function parseWhyRephraseReply(text: string): (Partial<SessionWhy> | null)[] | null {
	const start = text.indexOf('[');
	const end = text.lastIndexOf(']');
	if (start === -1 || end === -1 || end <= start) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}
	if (!Array.isArray(parsed)) return null;
	return parsed.map((entry) => {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
		const row = entry as Record<string, unknown>;
		const out: Partial<SessionWhy> = {};
		for (const field of WHY_FIELDS) {
			const value = row[field];
			if (typeof value === 'string' && value.trim()) out[field] = value;
		}
		return Object.keys(out).length ? out : null;
	});
}

/* --------------------------------- gate ----------------------------------- */

/** One rephrased line may not exceed the stored schema's own bound. */
const MAX_LEN = 600;
/** A rephrase may be this much shorter or longer than the line it rewrites. */
const MIN_RATIO = 0.5;
const MAX_RATIO = 1.8;
/** Share of the original's content words the rephrase must still carry. */
const MIN_OVERLAP = 0.3;

const STOP = new Set([
	'this',
	'that',
	'these',
	'those',
	'your',
	'their',
	'with',
	'from',
	'into',
	'about',
	'over',
	'under',
	'after',
	'before',
	'when',
	'where',
	'which',
	'what',
	'have',
	'has',
	'had',
	'will',
	'would',
	'can',
	'could',
	'should',
	'more',
	'most',
	'than',
	'then',
	'they',
	'them',
	'also',
	'just',
	'very',
	'same',
	'like',
	'because',
	'while',
	'still',
	'only',
	'onto',
	'upon',
	'each',
	'some',
	'such',
	'both',
	'other',
	'another',
	'does',
]);

const NUM_WORDS: Record<string, string> = {
	one: '1',
	two: '2',
	three: '3',
	four: '4',
	five: '5',
	six: '6',
	seven: '7',
	eight: '8',
	nine: '9',
	ten: '10',
	eleven: '11',
	twelve: '12',
	twenty: '20',
	thirty: '30',
	forty: '40',
	fifty: '50',
	hundred: '100',
};

/** Every number a line carries, digits and number words, as canonical digits. */
function numberSet(text: string): Set<string> {
	const out = new Set<string>();
	for (const m of text.match(/\d[\d.:]*\d|\d/g) ?? []) out.add(m.replace(/^0+(?=\d)/, ''));
	for (const m of text
		.toLowerCase()
		.match(
			/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred)\b/g,
		) ?? []) {
		out.add(NUM_WORDS[m]!);
	}
	return out;
}

/** The content words of a line, for comparing whether it is still the same claim. */
function contentWords(text: string): string[] {
	return (
		text
			.toLowerCase()
			.match(/[a-z]+/g)
			?.filter((w) => w.length > 2 && !STOP.has(w)) ?? []
	);
}

/** How much of the original's content the rephrase still carries, 0 to 1. */
function overlap(original: string, candidate: string): number {
	const want = new Set(contentWords(original));
	if (!want.size) return 1;
	const got = new Set(contentWords(candidate));
	let shared = 0;
	for (const w of want) if (got.has(w)) shared++;
	return shared / want.size;
}

/**
 * Clean one rephrased line and accept it only when it is a fair rewrite of the
 * original: non-empty after sanitizing, within the length bound, carrying no
 * number the original did not have, and still close enough in content. Returns
 * the cleaned line, or undefined so the caller keeps the deterministic one.
 */
export function gateReason(original: string, candidate: string): string | undefined {
	const text = sanitizeText(candidate);
	if (!text || text.length > MAX_LEN) return undefined;
	const ratio = text.length / Math.max(1, original.length);
	if (ratio < MIN_RATIO || ratio > MAX_RATIO) return undefined;
	const allowed = numberSet(original);
	for (const n of numberSet(text)) if (!allowed.has(n)) return undefined;
	if (overlap(original, text) < MIN_OVERLAP) return undefined;
	return text;
}

/**
 * Gate a whole reworded reason against the deterministic one. Only a line the
 * deterministic reason already had is considered, so the model can never add a
 * part that was not there. Returns the accepted lines, or undefined when nothing
 * changed, so the caller stores no `whyText` and the fallback stands.
 */
export function gateWhy(
	deterministic: SessionWhy,
	candidate: Partial<SessionWhy>,
): SessionWhy | undefined {
	const out: SessionWhy = {};
	let changed = false;
	for (const field of WHY_FIELDS) {
		const original = deterministic[field];
		const proposed = candidate[field];
		if (!original || !proposed) continue;
		const gated = gateReason(original, proposed);
		if (gated && gated !== original) {
			out[field] = gated;
			changed = true;
		}
	}
	return changed ? out : undefined;
}
