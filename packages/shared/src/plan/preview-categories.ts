/**
 * Preview categories. The onboarding preview reads week one as categories
 * (Long run, Medium run, Short run, Quality run, Strength, Mobility, Recovery)
 * instead of workout titles, so the week reads at a glance before the runner
 * opens the plan. The mapping is pure and browser-safe, so other surfaces can
 * reuse it. The preview still carries the real sessions underneath; only the
 * label and the tap behaviour change.
 */

/** The categories a session can read as on the preview. */
export type PreviewCategory =
	| 'long-run'
	| 'medium-run'
	| 'short-run'
	| 'quality-run'
	| 'strength'
	| 'mobility'
	| 'recovery';

/** The fields the mapping needs. A planned session and a client session both carry them. */
export interface PreviewCategoryInput {
	modality: string;
	type: string;
	durationMin: number | null;
}

/**
 * A run at or past this many minutes reads as a Medium run; under it, a Short
 * run. The engine's own easy runs span about 25 minutes (the recovery jog after
 * the long run) to well past an hour (the medium-long run and big-volume easy
 * days), and an hour is the line where a run stops being a fill-in and starts
 * carrying the week. The engine's medium-long run only exists at 60 km weeks
 * and up, where it starts at 12 km, about an hour at the engine's default easy
 * pace, so it clears the line.
 */
export const MEDIUM_RUN_MINUTES = 60;

/**
 * The running kinds that read as Quality run: the engine's own quality set
 * (tempo, hills, interval, race-pace, threshold, fartlek, strides, the same
 * list the rebuild leans on) plus race day, which is goal-pace work in its own
 * right.
 */
const QUALITY_TYPES: readonly string[] = [
	'tempo',
	'threshold',
	'interval',
	'race-pace',
	'hills',
	'fartlek',
	'strides',
	'race',
];

/** The tile label for each category. */
export const PREVIEW_CATEGORY_LABEL: Record<PreviewCategory, string> = {
	'long-run': 'Long run',
	'medium-run': 'Medium run',
	'short-run': 'Short run',
	'quality-run': 'Quality run',
	strength: 'Strength',
	mobility: 'Mobility',
	recovery: 'Recovery',
};

/** The one-line blurb the preview popover shows for each category. */
export const PREVIEW_CATEGORY_BLURB: Record<PreviewCategory, string> = {
	'long-run': 'Time on your feet at an easy, even effort. It builds the endurance the rest of the plan leans on.',
	'medium-run': 'A longer easy run that spreads the volume so no single day carries it all. Stay conversational.',
	'short-run': 'A short, easy run that adds gentle volume and keeps the legs turning. Easy enough to chat.',
	'quality-run': 'The faster work: hills, fartlek, intervals or goal pace. It raises the pace you can hold.',
	strength: 'Builds the strength that protects joints and improves running economy.',
	mobility: 'Range of motion and activation to keep the stride healthy.',
	recovery: 'Walks, easy spins or a very slow jog. It moves blood and eases heavy legs between harder days.',
};

/**
 * Map a session to its preview category. Long run comes from the archetype, so
 * a library long run a runner added reads the same way the engine's own does.
 */
export function previewCategory(session: PreviewCategoryInput): PreviewCategory {
	switch (session.modality) {
		case 'strength':
			return 'strength';
		case 'mobility':
			return 'mobility';
		case 'walking':
		case 'recovery':
		case 'cross-train':
			return 'recovery';
	}
	// A run: the long run is named by archetype, quality kinds by archetype, and
	// the rest split by duration. A recovery jog is recovery work, not a run.
	if (session.type === 'long') return 'long-run';
	if (session.type === 'recovery') return 'recovery';
	if (QUALITY_TYPES.includes(session.type)) return 'quality-run';
	return (session.durationMin ?? 0) >= MEDIUM_RUN_MINUTES ? 'medium-run' : 'short-run';
}
