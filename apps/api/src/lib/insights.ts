import { WRITING_RULES, sanitizeText } from '@strideguide/shared/writing';
import {
	formatClock,
	formatDistance,
	formatPace,
	formatPaceBand,
	type Prefs,
} from '@strideguide/shared/units';
import type { Env } from '../env';
import { runAi, type AiMessage } from './ai';

/**
 * The day-insight pass, on the API side. It turns one day's logged training into
 * the facts a model is allowed to talk about, builds a grounded prompt, runs it
 * through the shared chat router, and keeps the reply only when it survives a
 * number gate. Every number in the reply must already appear in the facts, so a
 * model can word the day but can never write a figure the engine or the runner's
 * own logs did not supply.
 *
 * The prompt builder and the gate live here rather than in the plan engine: the
 * facts carry the runner's units, so the formatting is an edge concern. The
 * writing guard (packages/shared/src/writing-guard.test.ts) reads this file,
 * finds the runAi call, and requires WRITING_RULES in the prompt and sanitizeText
 * on the reply, both of which are here.
 */

/** One workout on the day, with the engine's plan and the runner's own log. */
export interface InsightWorkoutInput {
	title: string;
	modality: string;
	type: string;
	/** logged when a log exists, skipped when the runner skipped it, pending otherwise. */
	state: 'logged' | 'skipped' | 'pending';
	/** The engine's prescription, metric. */
	plannedDistanceKm?: number | null;
	plannedPaceSecPerKm?: [number, number] | null;
	plannedDurationMin?: number | null;
	/** What the runner recorded, metric. */
	actualDistanceKm?: number | null;
	actualDurationSec?: number | null;
	actualPaceSecPerKm?: number | null;
	rpe?: number | null;
	feedback?: 'up' | 'down' | null;
	notes?: string | null;
	/** When the log was written, so a log redone without other changes still moves the fingerprint. */
	loggedAt?: string | null;
}

/** A session later in the selected day's own plan week, for context only. */
export interface InsightAheadInput {
	date: string;
	title: string;
	plannedDistanceKm?: number | null;
}

/** Everything the pass is given about one day. */
export interface DayInsightInput {
	date: string;
	goalName?: string | null;
	weekNumber?: number | null;
	phase?: string | null;
	workouts: InsightWorkoutInput[];
	weekAhead: InsightAheadInput[];
}

/** A workout as the model sees it, already in the runner's units. */
interface InsightFactWorkout {
	title: string;
	state: 'logged' | 'skipped' | 'pending';
	planned?: string;
	actual?: string;
	note?: string;
}

/** The grounded facts a reply may draw on. Every figure it may state is here. */
export interface InsightFacts {
	date: string;
	weekday: string;
	goal?: string;
	week?: number;
	phase?: string;
	sessionCount: number;
	workouts: InsightFactWorkout[];
	weekAheadCount: number;
	weekAhead: { weekday: string; title: string; planned?: string }[];
}

const WEEKDAYS = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
];

/** The weekday name for an ISO date, read in UTC so the plain date is honored. */
function weekdayName(iso: string): string {
	const ms = Date.parse(`${iso}T00:00:00Z`);
	if (Number.isNaN(ms)) return '';
	return WEEKDAYS[new Date(ms).getUTCDay()] ?? '';
}

/** The engine's plan for a session, as display text: distance, pace band, or minutes. */
function plannedLabel(w: InsightWorkoutInput, prefs: Prefs): string | undefined {
	const parts: string[] = [];
	if (w.plannedDistanceKm != null) parts.push(formatDistance(w.plannedDistanceKm, prefs.units));
	if (w.plannedPaceSecPerKm) parts.push(`at ${formatPaceBand(w.plannedPaceSecPerKm, prefs.units)}`);
	if (!parts.length && w.plannedDurationMin != null) parts.push(`${w.plannedDurationMin} min`);
	return parts.length ? parts.join(' ') : undefined;
}

/** What the runner actually did, as display text. */
function actualLabel(w: InsightWorkoutInput, prefs: Prefs): string | undefined {
	const bits: string[] = [];
	const distance = w.actualDistanceKm != null ? formatDistance(w.actualDistanceKm, prefs.units) : null;
	const time = w.actualDurationSec != null ? formatClock(w.actualDurationSec) : null;
	if (distance && time) bits.push(`${distance} in ${time}`);
	else if (distance) bits.push(distance);
	else if (time) bits.push(time);
	if (w.actualPaceSecPerKm != null) bits.push(`at ${formatPace(w.actualPaceSecPerKm, prefs.units)}`);
	if (w.rpe != null) bits.push(`RPE ${w.rpe}`);
	if (w.feedback === 'up') bits.push('felt good');
	else if (w.feedback === 'down') bits.push('felt hard');
	return bits.length ? bits.join(', ') : undefined;
}

/**
 * Turn one day's inputs into the grounded facts and the fingerprint of its logs.
 * The facts are unit-formatted at the edge, from the runner's own prefs; the
 * fingerprint is unit-free, so switching units never invalidates a stored insight.
 */
export function buildDayInsight(
	input: DayInsightInput,
	prefs: Prefs,
): { facts: InsightFacts; fingerprint: string } {
	const workouts: InsightFactWorkout[] = input.workouts.map((w) => ({
		title: w.title,
		state: w.state,
		...(plannedLabel(w, prefs) ? { planned: plannedLabel(w, prefs) } : {}),
		...(w.state === 'logged' && actualLabel(w, prefs) ? { actual: actualLabel(w, prefs) } : {}),
		...(w.notes && w.notes.trim() ? { note: w.notes.trim().slice(0, 300) } : {}),
	}));

	const facts: InsightFacts = {
		date: input.date,
		weekday: weekdayName(input.date),
		...(input.goalName ? { goal: input.goalName } : {}),
		...(input.weekNumber != null ? { week: input.weekNumber } : {}),
		...(input.phase ? { phase: input.phase } : {}),
		sessionCount: workouts.length,
		workouts,
		weekAheadCount: input.weekAhead.length,
		weekAhead: input.weekAhead.map((a) => ({
			weekday: weekdayName(a.date),
			title: a.title,
			...(a.plannedDistanceKm != null
				? { planned: formatDistance(a.plannedDistanceKm, prefs.units) }
				: {}),
		})),
	};

	return { facts, fingerprint: dayFingerprint(input) };
}

/** The unit-free shape the fingerprint is taken over: the day's logs alone. */
function fingerprintSource(input: DayInsightInput): string {
	return JSON.stringify(
		input.workouts.map((w) => ({
			t: w.title,
			m: w.modality,
			s: w.state,
			d: w.actualDistanceKm ?? null,
			u: w.actualDurationSec ?? null,
			p: w.actualPaceSecPerKm ?? null,
			r: w.rpe ?? null,
			f: w.feedback ?? null,
			n: w.notes ?? null,
			at: w.loggedAt ?? null,
		})),
	);
}

/**
 * A small stable hash of the day's logs (djb2, hex). It moves when a log is
 * added, edited or removed, and not when the runner changes units or the plan
 * ahead changes, so only a genuinely changed day is offered a fresh read.
 */
export function dayFingerprint(input: DayInsightInput): string {
	const text = fingerprintSource(input);
	let hash = 5381;
	for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
	return (hash >>> 0).toString(16);
}

/**
 * Ask the model for a short read on the day. The prompt is explicit that every
 * figure must already be in the facts, so most replies pass the gate untouched.
 * The model may look ahead in the same week only when something there matters
 * for this day, for example a long run or a hard session coming up.
 */
export function buildInsightPrompt(facts: InsightFacts): { system: string; user: string } {
	const system = `${WRITING_RULES}

You are a running coach writing a short read on one day of a runner's training. You are given the plan for the day and what the runner logged, nothing else.
- Write two to four plain sentences, as one block of prose. No lists, no headings, no greeting.
- Say only what the facts support. Every distance, pace, time, week number and count you write must already appear in the facts. Never do your own arithmetic, and never estimate or round a figure. If a number is not in the facts, do not state one.
- When a workout was skipped, say so plainly and without judgement.
- You may mention what comes later this week only when it genuinely bears on this day, for example a long run or a hard session ahead. Otherwise leave the rest of the week out.
- Never mention pain, injury or illness, and never give medical advice.

Reply with only the insight text, nothing before or after it.`;

	const user = `Facts: ${JSON.stringify(facts)}`;
	return { system, user };
}

/* --------------------------------- gate ----------------------------------- */

/** The insight may run a little longer than a session note, but not much. */
const MAX_LEN = 700;

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

/**
 * Every figure a text carries: clock tokens ("5:30"), decimals ("8.2"), whole
 * numbers, and the number words the prompt allows. Clock tokens and their digit
 * runs are both kept, so a reply that says "45 min" for a logged "45:00" is a
 * restatement, not a new figure.
 */
function numberSet(text: string): Set<string> {
	const out = new Set<string>();
	for (const m of text.match(/\d{1,2}:\d{2}(?::\d{2})?/g) ?? []) out.add(m);
	for (const m of text.match(/\d+\.\d+/g) ?? []) out.add(m);
	for (const m of text.match(/\d+/g) ?? []) out.add(m.replace(/^0+(?=\d)/, ''));
	for (const m of text
		.toLowerCase()
		.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred)\b/g) ?? []) {
		out.add(NUM_WORDS[m]!);
	}
	return out;
}

/**
 * Clean the reply and keep it only when it is safe to show: non-empty after
 * sanitizing, within the length bound, and carrying no figure the facts did not
 * already contain. Returns the cleaned text, or undefined so the caller shows an
 * error and stores nothing.
 *
 * Limit, written down: the figure check allows a clock token and its own digit
 * runs, so a bare integer that a fact happens to contain elsewhere can slip a
 * sentence through. The prompt asks for exact restatement, and this gate is the
 * backstop for the invented number, not a proof of every claim.
 */
export function gateInsight(facts: InsightFacts, candidate: string): string | undefined {
	const text = sanitizeText(candidate);
	if (!text) return undefined;
	if (text.length > MAX_LEN) return undefined;
	const allowed = numberSet(JSON.stringify(facts));
	for (const n of numberSet(text)) if (!allowed.has(n)) return undefined;
	return text;
}

/**
 * Write one day's insight and return it, or null when the model failed or the
 * reply did not pass the gate. The caller decides whether to store it; nothing
 * is written here.
 */
export async function generateDayInsight(env: Env, facts: InsightFacts): Promise<string | null> {
	const { system, user } = buildInsightPrompt(facts);
	const messages: AiMessage[] = [
		{ role: 'system', content: system },
		{ role: 'user', content: user },
	];
	try {
		const res = await runAi(env, messages, { maxTokens: 400, timeoutMs: 15000 });
		return gateInsight(facts, res.text) ?? null;
	} catch {
		return null;
	}
}
