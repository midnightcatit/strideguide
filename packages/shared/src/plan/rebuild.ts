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
	/** 0 = Monday … 6 = Sunday. */
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
}

/**
 * Rebuild the weeks after week one from the approved week one pattern. Week one
 * is returned object for object, untouched. Every later week is laid out by the
 * engine with the week one days as its available days (so an AI failure still
 * leaves a full deterministic plan), then the runner's added workouts are put
 * back on their days.
 */
export function rebuildFromWeekOne(input: RebuildInput): RebuildResult {
	const pattern = weekOnePattern(input.weekOne);
	const seeded: PlanInput = {
		...input.plan,
		availableDays: pattern.availableDays.length ? pattern.availableDays : input.plan.availableDays,
	};
	const fresh = generatePlan({ ...seeded, weekShapes: input.weekShapes });
	const byNumber = new Map(fresh.weeks.map((w) => [w.weekNumber, w] as const));
	const recurring = input.weekOne.filter(isAdded);

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

	return { weeks, pattern };
}
