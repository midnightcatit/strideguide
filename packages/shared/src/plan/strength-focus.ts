/**
 * The lean pill on a strength session. The lean is a day's emphasis inside the
 * full-body session, and this names the body parts it actually adds, in the
 * finer vocabulary the workout filters already use (quads, hamstrings, glutes,
 * calves, adductors, hips for a legs lean; core, chest, back, shoulders, arms
 * for an upper-and-core lean). A day with no lean reads "full body". Kept pure
 * so the derivation is cheap to test and the pill can never contradict the
 * composition title.
 */

import type { MachineExercise } from './machines';
import { BODY_PARTS, BODY_PART_BY_TERM, type BodyPart } from './workout-filters';

/** The parts a legs lean covers, in showing order. */
const LOWER_BODY_PARTS: BodyPart[] = ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'hips'];

/** The parts an upper body and core lean covers, in showing order. */
const UPPER_CORE_PARTS: BodyPart[] = ['core', 'chest', 'back', 'shoulders', 'arms'];

/** The fallback pill for each lean when a circuit carries no matching part. */
const LEAN_FALLBACK: Record<string, string> = {
	legs: 'quads + glutes + hamstrings',
	'upper-core': 'core + back + shoulders',
};

/**
 * A move's primary body part: the first muscle that maps, the same rule the
 * muscle-group picker and the workout filters use, so a core move with a
 * supporting shoulder does not read as shoulders.
 */
export function primaryBodyPart(move: MachineExercise): BodyPart | undefined {
	for (const muscle of move.muscles) {
		const part = BODY_PART_BY_TERM[muscle];
		if (part) return part;
	}
	return undefined;
}

/**
 * The lean pill: the parts the day leans on, derived from the circuit's own
 * moves and restricted to the lean's area, most-emphasized first (by how many
 * moves carry the part), at most three, joined with " + ". An unleaned day, or
 * no lean id at all, reads "full body".
 */
export function leanFocusLabel(
	focusId: string | null | undefined,
	moves: readonly MachineExercise[],
): string {
	if (!focusId) return 'full body';
	const domain = focusId === 'legs' ? LOWER_BODY_PARTS : UPPER_CORE_PARTS;
	const counts = new Map<BodyPart, number>();
	for (const move of moves) {
		const part = primaryBodyPart(move);
		if (part && domain.includes(part)) counts.set(part, (counts.get(part) ?? 0) + 1);
	}
	const ordered = domain
		.filter((part) => counts.has(part))
		.sort(
			(a, b) =>
				counts.get(b)! - counts.get(a)! || BODY_PARTS.indexOf(a) - BODY_PARTS.indexOf(b),
		);
	const top = ordered.slice(0, 3);
	if (!top.length) return LEAN_FALLBACK[focusId] ?? 'full body';
	return top.join(' + ');
}
