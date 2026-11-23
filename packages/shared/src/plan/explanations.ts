import type { SessionArchetype } from '../types';

/**
 * Which seeded knowledge-base explanation (research/wave-*) backs each session archetype.
 * Keys mirror the `explanations.ref_id` values produced by the consolidation script.
 */
export const EXPLANATION_REFS: Record<SessionArchetype, string> = {
	easy: 'wave-1/2a-aerobic-long-runs',
	recovery: 'wave-3/8b-recovery-modalities',
	long: 'wave-1/2a-aerobic-long-runs',
	tempo: 'wave-1/2b-quality-sessions',
	threshold: 'wave-1/2b-quality-sessions',
	interval: 'wave-1/2b-quality-sessions',
	'race-pace': 'wave-2/5a-marathon-pacing-taper',
	strides: 'wave-1/2b-quality-sessions',
	hills: 'wave-1/2b-quality-sessions',
	fartlek: 'wave-1/2b-quality-sessions',
	race: 'wave-2/5a-marathon-pacing-taper',
	'machine-circuit': 'wave-2/4a-pf-machines-form',
	'full-body-strength': 'wave-1/3b-strength-programming',
	mobility: 'wave-3/8a-warmup-cooldown-mobility',
	'cross-train': 'wave-2/7a-general-health-cardio-strength',
};

export function explanationRefFor(type: string): string | undefined {
	return (EXPLANATION_REFS as Record<string, string>)[type];
}

/** A plain-language one-liner per session type, shown before the cited evidence. */
export const SHORT_WHY: Record<SessionArchetype, string> = {
	easy: 'Easy miles build the engine: more capillaries and mitochondria, so faster running feels easier.',
	recovery: 'A gentle shakeout moves blood through tired legs and helps you recover sooner.',
	long: 'Time on your feet teaches your body to burn fat and keep going, which is what race day asks for.',
	tempo: 'Holding threshold pace teaches your body to clear lactate, so goal pace feels more comfortable.',
	threshold: 'Steady work near threshold lifts the pace you can hold before it starts to feel hard.',
	interval: 'Short, hard reps raise your VO2max, which lifts the ceiling on every other pace.',
	'race-pace': 'Running at goal pace in training makes race day feel familiar and even.',
	strides: 'Relaxed fast bursts sharpen leg speed without the cost of a hard session.',
	hills: 'Hills build power and strength-endurance you can feel on flat ground.',
	fartlek: 'Unstructured speed play teaches pace changes with less pressure.',
	race: 'A rehearsal at goal effort, so the real thing is not a surprise.',
	'machine-circuit': 'Strength work protects your joints and makes each stride more economical.',
	'full-body-strength': 'Strength work protects your joints and makes each stride more economical.',
	mobility: 'Loosening hips, ankles and back keeps your stride healthy.',
	'cross-train': 'Low-impact work builds fitness while sparing your running legs.',
};
