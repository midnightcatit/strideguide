/**
 * Typical machine sets for common gyms, so a runner can pick their gym and get a
 * circuit of machines they actually have. These are typical for the chain, not a
 * per-location inventory; the per-machine override lets a runner correct it.
 * Machine names match the catalog (research/wave-5/13e).
 */

export interface GymPreset {
	id: string;
	name: string;
	machines: string[];
}

// The eight Planet Fitness staples, present at most chains.
const BASIC = [
	'Leg press',
	'Leg curl',
	'Leg extension',
	'Back extension',
	'Seated row',
	'Shoulder press',
	'Bicep curl',
	'Tricep extension',
];

// A typical mid-size chain floor.
const CHAIN = [
	...BASIC,
	'Lat pulldown',
	'Seated cable row',
	'Chest press / pec deck (cable fly)',
	'Hip abduction machine',
	'Hip adduction machine',
	'Hip thrust / glute drive machine',
	'Cable pull-through',
	'Cable woodchop / Pallof press',
	'Seated leg curl',
	'Standing calf raise',
	'Rear delt / lateral raise machine',
	'Assisted pull-up / dip',
	'Back extension / reverse hyper',
];

// A large commercial gym, adding the heavier leg and carry stations.
const FULL = [
	...CHAIN,
	'Smith machine squat',
	'Hack squat',
	'Pendulum squat',
	'Leg press (single-leg variation)',
	'Seated calf raise',
	'Farmer / trap-bar carry',
];

export const GYM_PRESETS: GymPreset[] = [
	{ id: 'planet-fitness', name: 'Planet Fitness', machines: CHAIN },
	{ id: 'anytime-fitness', name: 'Anytime Fitness', machines: CHAIN },
	{ id: 'puregym', name: 'PureGym', machines: CHAIN },
	{ id: 'the-gym-group', name: 'The Gym Group', machines: CHAIN },
	{ id: 'la-fitness', name: 'LA Fitness', machines: FULL },
	{ id: 'ymca', name: 'YMCA or rec centre', machines: CHAIN },
	{ id: 'full', name: 'A full gym', machines: FULL },
];

/** The machines for a preset id, or undefined when the id is unknown. */
export function machinesForPreset(id?: string): string[] | undefined {
	if (!id) return undefined;
	return GYM_PRESETS.find((p) => p.id === id)?.machines;
}
