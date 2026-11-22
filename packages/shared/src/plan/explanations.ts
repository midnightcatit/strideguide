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
