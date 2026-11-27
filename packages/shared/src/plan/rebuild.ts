import type { Modality, SessionArchetype, SessionPrescription } from '../types';
import { generatePlan } from './engine';
import type { PlannedSession, PlannedWeek, PlanInput, WeekShape } from './types';

/**
 * Rebuilding the plan around an approved week one. The runner edits the first
 * week to match the week they will actually run, then asks for the rest of the
 * plan to be rebuilt to match it. This module is pure: it reads the edited week,
 * derives a compact pattern, and lays the later weeks out from that pattern.
 * Week one itself is never touched here; the route keeps it exactly as sent.
 */

/** One session of the approved week one, as the client sent it. */
export interface WeekOneSession {
	/** 0 = the week's first day … 6 = its last (offset from the week's startDate). */
	day: number;
	slot: string;
	modality: string;
	type: string;
	title?: string;
	purpose?: string;
	prescription?: unknown;
	durationMin?: number;
	libraryId?: string;
}

/** A compact read of an added workout, kept so the rebuild can repeat it. */
export interface WeekOneRecurring {
	day: number;
	slot: string;
	modality: string;
	type: string;
	title?: string;
	libraryId?: string;
}

/**
 * A compact summary of what week one looks like. It drives two things: the days
 * the engine may use for the rebuilt weeks, and the added workouts that should
 * recur. The route also hands it to the model so the shaping pass can work
 * around the runner's own choices.
 */
export interface WeekOnePattern {
	/** Days that carry any session in week one, ascending. */
	availableDays: number[];
	/** Days that carry a running session, ascending. */
	runningDays: number[];
	/** Days that carry a strength session, ascending. */
	strengthDays: number[];
	/** One entry per session, in day then slot order: what sits on each day. */
	days: { day: number; slot: string; modality: string; type: string }[];
	/** Library or cross-training workouts the runner added, which should recur. */
	recurring: WeekOneRecurring[];
	/** Quality kinds week one leans on, if any, in first-seen order. */
	qualityKinds: string[];
}

const QUALITY = ['tempo', 'hills', 'interval', 'race-pace', 'threshold', 'fartlek', 'strides'];

function byDaySlot(a: { day: number; slot: string }, b: { day: number; slot: string }): number {
	return a.day - b.day || a.slot.localeCompare(b.slot);
}

/** 0 = Monday … 6 = Sunday for an ISO date. */
function weekdayOf(iso: string): number {
	return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** True when the session is something the runner added, not the engine's own. */
function isAdded(session: WeekOneSession): boolean {
	// An explicit flag wins: the engine sets added: false on its own sessions that
	// point at a library workout, so they are not repeated as added ones.
	const p = session.prescription;
	if (p && typeof p === 'object' && 'added' in p) {
		return (p as { added?: boolean }).added === true;
	}
	if (session.libraryId) return true;
	return session.type === 'cross-train';
}

/** Read the approved week one into a compact pattern the rebuild can lean on. */
export function weekOnePattern(sessions: WeekOneSession[]): WeekOnePattern {
	const sorted = [...sessions].sort(byDaySlot);
	const daySet = (test: (s: WeekOneSession) => boolean) =>
		[...new Set(sorted.filter(test).map((s) => s.day))].sort((a, b) => a - b);

	const days = sorted.map((s) => ({
		day: s.day,
		slot: s.slot,
		modality: s.modality,
		type: s.type,
	}));
	const recurring = sorted.filter(isAdded).map<WeekOneRecurring>((s) => ({
		day: s.day,
		slot: s.slot,
		modality: s.modality,
		type: s.type,
		title: s.title,
		libraryId: s.libraryId,
	}));
	const qualityKinds = [...new Set(sorted.map((s) => s.type).filter((t) => QUALITY.includes(t)))];

	return {
		availableDays: daySet(() => true),
		runningDays: daySet((s) => s.modality === 'running'),
		strengthDays: daySet((s) => s.modality === 'strength'),
		days,
		recurring,
		qualityKinds,
	};
}

/** A full session row from a week one entry, so an added workout can recur. */
function toPlanned(session: WeekOneSession, slot: string): PlannedSession {
	return {
		day: session.day,
		slot,
		modality: session.modality as Modality,
		type: session.type as SessionArchetype,
		title: session.title ?? '',
		purpose: session.purpose ?? '',
		prescription: (session.prescription ?? {}) as SessionPrescription,
		durationMin: session.durationMin ?? 0,
	};
}

/** The week's training distance, so the card matches the sessions it holds. The
 * race is the goal, not training load, so it is left out, as the engine does. */
function runningVolumeKm(sessions: PlannedSession[]): number {
	const km = sessions.reduce((sum, s) => {
		if (s.modality !== 'running' || s.type === 'race') return sum;
		const d = (s.prescription as { targetDistanceKm?: number } | null)?.targetDistanceKm;
		return sum + (typeof d === 'number' ? d : 0);
	}, 0);
	return Math.round(km * 10) / 10;
}

/**
 * Put the runner's added workouts back on the days they came from, without
 * stacking two sessions in one slot. A day that already holds that workout
 * keeps the engine's version; otherwise the added one takes its own slot, or
 * the other slot on the same day when its own is taken.
 */
function withRecurring(sessions: PlannedSession[], recurring: WeekOneSession[]): PlannedSession[] {
	if (!recurring.length) return sessions;
	const out = [...sessions];
	const slots = new Map<number, Set<string>>();
	const types = new Set<string>();
	for (const s of out) {
		slots.set(s.day, (slots.get(s.day) ?? new Set()).add(s.slot));
		types.add(`${s.day}:${s.type}`);
	}
	for (const r of recurring) {
		if (types.has(`${r.day}:${r.type}`)) continue;
		const used = slots.get(r.day) ?? new Set<string>();
		const slot = used.has(r.slot) ? (r.slot === 'AM' ? 'PM' : 'AM') : r.slot;
		if (used.has(slot)) continue;
		out.push(toPlanned(r, slot));
		used.add(slot);
		slots.set(r.day, used);
		types.add(`${r.day}:${r.type}`);
	}
	return out.sort(byDaySlot);
}

export interface RebuildInput {
	/** The stored plan's weeks, in order; index 0 is week one. */
	existingWeeks: PlannedWeek[];
	/** The approved week one, exactly as it should be kept. */
	weekOne: WeekOneSession[];
	/** The engine input: goal, baseline, start date, and so on. */
	plan: PlanInput;
	/** Optional per-week shaping from the model, aligned to week order. */
	weekShapes?: (WeekShape | undefined)[];
}

export interface RebuildResult {
	weeks: PlannedWeek[];
	pattern: WeekOnePattern;
	/**
	 * Plain notes about the rebuild, e.g. that the approved week one was too heavy
	 * to build from and the engine's own progression was used instead. Empty for a
	 * normal rebuild. The preview route carries these back to the client, which
	 * shows them to the runner.
	 */
	warnings: string[];
}

/**
 * Whether the approved week one is a realistic progression the rebuild can lean
 * on. A week with more than one long run, or clearly more running than the goal
 * and volume call for, is not something to repeat verbatim: the weeks after it
 * should follow the engine's own progression instead. Deliberately conservative,
 * so a normal edited first week is never flagged.
 */
function weekOneIsRealistic(sessions: WeekOneSession[], referenceWeekOneKm: number): boolean {
	const runs = sessions.filter((s) => s.modality === 'running');
	const longRuns = runs.filter((s) => s.type === 'long').length;
	if (longRuns > 1) return false;
	const km = runningVolumeKm(runs.map((r) => toPlanned(r, r.slot)));
	if (referenceWeekOneKm > 0 && km > referenceWeekOneKm * 1.6) return false;
	return true;
}

/**
 * Rebuild the weeks after week one from the approved week one pattern. Week one
 * is returned object for object, untouched. Every later week is laid out by the
 * engine with the week one days as its available days (so an AI failure still
 * leaves a full deterministic plan), then the runner's added workouts are put
 * back on their days.
 *
 * The preview is a guide, not gospel: when the approved week one is unrealistic
 * for the goal and volume (three long runs in a week, say), its days are not
 * trusted and its added workouts are not repeated. The later weeks fall back to
 * the engine's own available days and progression, and a warning is returned
 * (see `warnings`) so the client can tell the runner what happened.
 */
export function rebuildFromWeekOne(input: RebuildInput): RebuildResult {
	const pattern = weekOnePattern(input.weekOne);
	// Week one's days are offsets from its own start; the engine takes weekday
	// indices, so map them back before seeding, whatever weekday the plan starts on.
	const startWeekday = weekdayOf(input.plan.startDate);
	const availableWeekdays = pattern.availableDays.map((offset) => (offset + startWeekday) % 7);
	// The engine's own first week is the yardstick: the plan's own volume and days
	// say what a realistic opening week is for this goal and runner.
	const reference = generatePlan(input.plan);
	const referenceWeekOneKm = reference.weeks[0]?.targetVolumeKm ?? 0;
	const realistic = weekOneIsRealistic(input.weekOne, referenceWeekOneKm);
	const warnings: string[] = [];
	if (!realistic) {
		warnings.push(
			"Your first week looked heavier than this plan can build from, so the weeks after it follow the plan's own progression instead of repeating it.",
		);
	}
	const seeded: PlanInput = realistic
		? {
				...input.plan,
				availableDays: availableWeekdays.length ? availableWeekdays : input.plan.availableDays,
			}
		: input.plan;
	const fresh = generatePlan({ ...seeded, weekShapes: input.weekShapes });
	const byNumber = new Map(fresh.weeks.map((w) => [w.weekNumber, w] as const));
	const recurring = realistic ? input.weekOne.filter(isAdded) : [];

	const weeks = input.existingWeeks.map((w, i) => {
		// Week one is the runner's own edit; the rebuild never touches it.
		if (i === 0) return w;
		const rebuilt = byNumber.get(w.weekNumber);
		if (!rebuilt) return w;
		const sessions = withRecurring(rebuilt.sessions, recurring);
		return {
			...rebuilt,
			weekNumber: w.weekNumber,
			startDate: w.startDate,
			endDate: w.endDate,
			sessions,
			targetVolumeKm: runningVolumeKm(sessions),
		};
	});

	// The fresh plan can be longer than the stored one: the engine appends the
	// goal's easy weeks after race day. Carry those extra weeks over too, with the
	// runner's added workouts repeated on them, so a rebuild ends with the same
	// week count a fresh generate would give for the same inputs.
	for (let i = input.existingWeeks.length; i < fresh.weeks.length; i++) {
		const w = fresh.weeks[i]!;
		const sessions = withRecurring(w.sessions, recurring);
		weeks.push({ ...w, sessions, targetVolumeKm: runningVolumeKm(sessions) });
	}

	return { weeks, pattern, warnings };
}
