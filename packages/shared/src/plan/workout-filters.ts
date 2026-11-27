/**
 * The body-part vocabulary and the filters the workout lists share, derived from
 * the data the catalog and the mobility library already carry. A muscle name on a
 * move and a target on a drill both map to one body part here, so a workout's
 * parts can be read from its own moves and drills instead of guessed. Kept pure
 * so the vocabulary, the derivation and the filter predicate are cheap to test.
 *
 * The list is finer than the machine picker's coarse MUSCLE_GROUPS: quads,
 * hamstrings, calves and adductors are split out of Legs, and hips is its own
 * part, because the strength and mobility sessions are aimed at exactly those
 * areas. A session that genuinely trains the whole body carries 'full body'
 * alone, set by hand on the entry, rather than every part its moves touch.
 */

import { findMove } from './catalog';
import type { Modality, StructuredWorkout } from '../types';
import { findDrill } from './stretches';

/** The body parts a workout can be filed under, in the order the chips show them. */
export const BODY_PARTS = [
	'quads',
	'hamstrings',
	'glutes',
	'calves',
	'adductors',
	'hips',
	'core',
	'chest',
	'back',
	'shoulders',
	'arms',
	'full body',
] as const;

export type BodyPart = (typeof BODY_PARTS)[number];

/** The plain word a chip shows for each part. */
export const BODY_PART_LABELS: Record<BodyPart, string> = {
	quads: 'Quads',
	hamstrings: 'Hamstrings',
	glutes: 'Glutes',
	calves: 'Calves',
	adductors: 'Adductors',
	hips: 'Hips',
	core: 'Core',
	chest: 'Chest',
	back: 'Back',
	shoulders: 'Shoulders',
	arms: 'Arms',
	'full body': 'Full body',
};

/**
 * A muscle name (on a move) or a drill target mapped to its body part. A term
 * that is not a muscle or an area (coordination, aerobic, balance) is left out
 * on purpose, so it never files a drill under a part it does not train. When a
 * muscle could sit in two parts, the finer one wins: hip abductors and rotators
 * are glutes, calf and foot structures are calves, the adductors and groin are
 * adductors, and the hip flexors are hips.
 */
export const BODY_PART_BY_TERM: Record<string, BodyPart> = {
	// Quads
	quadriceps: 'quads',
	quads: 'quads',
	'rectus femoris': 'quads',
	'vastus lateralis': 'quads',
	// Hamstrings
	hamstrings: 'hamstrings',
	'biceps femoris': 'hamstrings',
	// Glutes
	glutes: 'glutes',
	'gluteus maximus': 'glutes',
	'gluteus medius': 'glutes',
	'gluteus minimus': 'glutes',
	'hip abductors': 'glutes',
	abductors: 'glutes',
	'hip external rotators': 'glutes',
	'deep hip rotators': 'glutes',
	piriformis: 'glutes',
	'piriformis region': 'glutes',
	'lateral hip': 'glutes',
	'tensor fasciae latae': 'glutes',
	// Calves and the lower leg
	calves: 'calves',
	calf: 'calves',
	gastrocnemius: 'calves',
	soleus: 'calves',
	'tibialis anterior': 'calves',
	peroneals: 'calves',
	shins: 'calves',
	'foot intrinsics': 'calves',
	'foot stabilisers': 'calves',
	'ankle stabilizers': 'calves',
	'toe extensors': 'calves',
	'toe flexors': 'calves',
	achilles: 'calves',
	'achilles tendon': 'calves',
	'achilles area': 'calves',
	ankles: 'calves',
	'ankle joint': 'calves',
	'ankle joint capsule': 'calves',
	'plantar fascia': 'calves',
	'arch of the foot': 'calves',
	'foot and ankle': 'calves',
	'lower legs': 'calves',
	// Adductors
	adductors: 'adductors',
	'adductor magnus': 'adductors',
	'adductor longus': 'adductors',
	'adductor brevis': 'adductors',
	'hip adductors': 'adductors',
	gracilis: 'adductors',
	groin: 'adductors',
	'inner thigh': 'adductors',
	'hip internal rotators': 'adductors',
	// Hips
	'hip flexors': 'hips',
	iliopsoas: 'hips',
	hips: 'hips',
	'hip joint': 'hips',
	'hip stabilizers': 'hips',
	// Core
	trunk: 'core',
	obliques: 'core',
	'rectus abdominis': 'core',
	'transverse abdominis': 'core',
	core: 'core',
	abdominals: 'core',
	'quadratus lumborum': 'core',
	'deep abdominal wall': 'core',
	// Chest
	'pectoralis major': 'chest',
	'pectoralis minor': 'chest',
	pectoralis: 'chest',
	pectorals: 'chest',
	chest: 'chest',
	ribs: 'chest',
	// Back
	'latissimus dorsi': 'back',
	lats: 'back',
	rhomboids: 'back',
	'mid-back': 'back',
	'middle trapezius': 'back',
	'lower trapezius': 'back',
	'upper trapezius': 'back',
	trapezius: 'back',
	'upper back': 'back',
	'erector spinae': 'back',
	'spinal erectors': 'back',
	'lower back': 'back',
	'thoracic spine': 'back',
	// Shoulders
	shoulders: 'shoulders',
	deltoids: 'shoulders',
	deltoid: 'shoulders',
	'anterior deltoid': 'shoulders',
	'anterior deltoids': 'shoulders',
	'posterior deltoid': 'shoulders',
	'posterior deltoids': 'shoulders',
	'lateral deltoid': 'shoulders',
	'rear deltoids': 'shoulders',
	'front shoulders': 'shoulders',
	'anterior shoulder': 'shoulders',
	'posterior shoulder': 'shoulders',
	'rotator cuff': 'shoulders',
	supraspinatus: 'shoulders',
	'serratus anterior': 'shoulders',
	'shoulder joint': 'shoulders',
	neck: 'shoulders',
	'levator scapulae': 'shoulders',
	// Arms
	biceps: 'arms',
	'biceps brachii': 'arms',
	triceps: 'arms',
	'triceps brachii': 'arms',
	brachialis: 'arms',
	forearms: 'arms',
	grip: 'arms',
};

/** The body parts a list of muscle names or drill targets maps to, in part order. */
export function bodyPartsForTerms(terms: readonly string[]): BodyPart[] {
	const found = new Set<BodyPart>();
	for (const term of terms) {
		const part = BODY_PART_BY_TERM[term];
		if (part) found.add(part);
	}
	return BODY_PARTS.filter((part) => found.has(part));
}

/**
 * A workout's body parts, read from its own moves and drills. A move names its
 * primary muscle first and lists supporting muscles after, so only the first
 * muscle that maps is taken (the same rule muscleGroupFor uses), which keeps a
 * core session from reading as shoulders and glutes too. A drill's targets are
 * all areas it works, so every target is taken. Run steps name neither, so a run
 * reads as no body part and is filtered by category alone.
 */
export function deriveBodyParts(workout: StructuredWorkout): BodyPart[] {
	const terms: string[] = [];
	for (const block of workout.blocks) {
		for (const step of block.steps) {
			const move = findMove(step.label);
			if (move) {
				const primary = move.muscles.find((m) => BODY_PART_BY_TERM[m]);
				if (primary) terms.push(primary);
			}
			const drill = findDrill(step.label);
			if (drill) terms.push(...drill.targets);
		}
	}
	return bodyPartsForTerms(terms);
}

/** The least a workout needs for its parts to be read or overridden. */
export interface HasBodyParts {
	modality: Modality;
	workout: StructuredWorkout;
	/** Set by hand when the parts are known, or to say 'full body' in one word. */
	bodyParts?: BodyPart[];
}

/**
 * A workout's body parts: the hand-set field when the entry carries one, else
 * derived from the entry's own moves and drills. A run or walk resolves to none,
 * and is filtered by category instead.
 */
export function bodyPartsForWorkout(w: HasBodyParts): BodyPart[] {
	return w.bodyParts ?? deriveBodyParts(w.workout);
}

/** True when a workout's parts pass the body-part filter. `all` always passes. */
export function matchesBodyPart(parts: readonly BodyPart[] | undefined, filter: BodyPart | 'all'): boolean {
	if (filter === 'all') return true;
	return parts?.includes(filter) ?? false;
}

/** Every body part present across a list of workouts, in the chip order. */
export function bodyPartsIn(workouts: readonly HasBodyParts[]): BodyPart[] {
	const found = new Set<BodyPart>();
	for (const w of workouts) for (const part of bodyPartsForWorkout(w)) found.add(part);
	return BODY_PARTS.filter((part) => found.has(part));
}

/**
 * A workout's length as the secondary text a list row shows next to the title:
 * '30 min'. Empty when there is no length, so a row never reads 'undefined min'.
 */
export function workoutLengthLabel(durationMin?: number): string {
	if (!durationMin || durationMin <= 0) return '';
	return `${durationMin} min`;
}
