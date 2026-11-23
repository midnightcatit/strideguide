/**
 * Gym profiles, reconciled against research/surveys/gym-equipment-inventories.md.
 * Each preset lists the machines a chain typically has (mapped to our catalog
 * names) and the equipment mode its free-weight access implies, with the survey
 * confidence recorded. Presets are a starting point, not a promise: per-location
 * variation is real, so the per-machine override corrects it.
 */

import type { EquipmentPreference } from '../types';

export interface GymPreset {
	id: string;
	name: string;
	/** The equipment mode the free-weight access at this gym implies. */
	mode: EquipmentPreference;
	machines: string[];
	confidence: 'documented' | 'reported' | 'estimate';
	note: string;
}

// Planet Fitness staples (the app's original 8), present at most chains.
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

// Selectorized machines the survey reports across the mid-size chains.
const SELECTORIZED = [
	...BASIC,
	'Chest press / pec deck (cable fly)',
	'Lat pulldown',
	'Seated cable row',
	'Hip abduction machine',
	'Hip adduction machine',
	'Seated leg curl',
	'Standing calf raise',
	'Rear delt / lateral raise machine',
	'Assisted pull-up / dip',
	'Cable pull-through',
	'Cable woodchop / Pallof press',
];

// The heavier leg and carry stations at larger clubs.
const BIG_BOX_EXTRAS = [
	'Smith machine squat',
	'Hack squat',
	'Pendulum squat',
	'Leg press (single-leg variation)',
	'Seated calf raise',
	'Hip thrust / glute drive machine',
	'Back extension / reverse hyper',
	'Farmer / trap-bar carry',
];

export const GYM_PRESETS: GymPreset[] = [
	{
		id: 'planet-fitness',
		name: 'Planet Fitness',
		mode: 'machines',
		machines: [
			...SELECTORIZED,
			'Smith machine squat',
			'Hip thrust / glute drive machine',
			'Hack squat',
		],
		confidence: 'documented',
		note: 'Machine-first, usually no barbells or racks, but dumbbells and a Smith machine. Some clubs differ.',
	},
	{
		id: 'anytime-fitness',
		name: 'Anytime Fitness',
		mode: 'full-gym',
		machines: [...SELECTORIZED, 'Smith machine squat', 'Hip thrust / glute drive machine'],
		confidence: 'reported',
		note: 'Selectorized machines plus a real free-weight area with a rack and barbell.',
	},
	{
		id: 'la-fitness',
		name: 'LA Fitness',
		mode: 'full-gym',
		machines: [...SELECTORIZED, ...BIG_BOX_EXTRAS],
		confidence: 'reported',
		note: 'Full machine floor plus a genuine free-weight room and racks.',
	},
	{
		id: '24-hour-fitness',
		name: '24 Hour Fitness',
		mode: 'full-gym',
		machines: [...SELECTORIZED, 'Smith machine squat'],
		confidence: 'estimate',
		note: 'Varies by tier (Sport, Super-Sport, Ultra-Sport). Verify racks per club.',
	},
	{
		id: 'golds-gym',
		name: "Gold's Gym",
		mode: 'full-gym',
		machines: [...SELECTORIZED, ...BIG_BOX_EXTRAS],
		confidence: 'estimate',
		note: 'Free-weight led: racks, platforms and barbells are the draw.',
	},
	{
		id: 'crunch',
		name: 'Crunch',
		mode: 'full-gym',
		machines: [...SELECTORIZED, 'Smith machine squat'],
		confidence: 'reported',
		note: 'Balanced to free-weight led, with racks and a functional area.',
	},
	{
		id: 'equinox',
		name: 'Equinox',
		mode: 'full-gym',
		machines: [...SELECTORIZED, 'Smith machine squat'],
		confidence: 'estimate',
		note: 'Premium selectorized machines; rack count varies a lot by club.',
	},
	{
		id: 'ymca',
		name: 'YMCA or rec centre',
		mode: 'both',
		machines: [...SELECTORIZED],
		confidence: 'reported',
		note: 'Machine led with a weight room. Treat barbell access as uncertain per branch.',
	},
	{
		id: 'university-rec',
		name: 'University rec centre',
		mode: 'full-gym',
		machines: [...SELECTORIZED, ...BIG_BOX_EXTRAS],
		confidence: 'reported',
		note: 'Multiple racks and platforms plus a full machine circuit.',
	},
	{
		id: 'puregym',
		name: 'PureGym',
		mode: 'full-gym',
		machines: [...SELECTORIZED, 'Smith machine squat'],
		confidence: 'documented',
		note: 'Plate-loaded machines, free weights and racks, plus a functional area.',
	},
	{
		id: 'the-gym-group',
		name: 'The Gym Group',
		mode: 'both',
		machines: [
			'Bicep curl',
			'Chest press / pec deck (cable fly)',
			'Lat pulldown',
			'Seated row',
			'Hip abduction machine',
			'Leg curl',
			'Leg extension',
			'Tricep extension',
			'Back extension',
		],
		confidence: 'documented',
		note: 'Named pin-loaded machines on the chain site; free weights, racks unclear.',
	},
	{
		id: 'home',
		name: 'Home gym',
		mode: 'bodyweight-dumbbells',
		machines: [],
		confidence: 'estimate',
		note: 'Dumbbells, a kettlebell, bands and a bench; machines are optional.',
	},
];

/** The machines for a preset id, or undefined when the id is unknown. */
export function machinesForPreset(id?: string): string[] | undefined {
	if (!id) return undefined;
	return GYM_PRESETS.find((p) => p.id === id)?.machines;
}

/** The equipment mode a preset implies, or undefined when the id is unknown. */
export function modeForPreset(id?: string): EquipmentPreference | undefined {
	if (!id) return undefined;
	return GYM_PRESETS.find((p) => p.id === id)?.mode;
}
