/**
 * Planet Fitness machine catalog (the 8 machines known at our location),
 * used to build strength sessions. Content mirrors the researched exercise
 * library (research/wave-2/4a, 4b).
 */

export interface MachineExercise {
	name: string;
	muscles: string[];
	/** Movement pattern, used to balance push/pull and posterior chain. */
	pattern: 'pull' | 'push' | 'squat' | 'hinge' | 'knee-extension' | 'posterior-chain';
	/** Short "where you should feel it" cue. */
	feel: string;
}

export const PF_MACHINES: MachineExercise[] = [
	{
		name: 'Leg press',
		muscles: ['quadriceps', 'glutes'],
		pattern: 'squat',
		feel: 'Front of the thighs and glutes; not your lower back.',
	},
	{
		name: 'Leg curl',
		muscles: ['hamstrings'],
		pattern: 'posterior-chain',
		feel: 'Back of the thighs.',
	},
	{
		name: 'Leg extension',
		muscles: ['quadriceps'],
		pattern: 'knee-extension',
		feel: 'Front of the thighs, above the knee.',
	},
	{
		name: 'Back extension',
		muscles: ['erector spinae', 'glutes'],
		pattern: 'hinge',
		feel: 'Lower back and glutes — controlled, never sharp.',
	},
	{
		name: 'Seated row',
		muscles: ['mid-back', 'lats', 'biceps'],
		pattern: 'pull',
		feel: 'Between the shoulder blades.',
	},
	{
		name: 'Shoulder press',
		muscles: ['shoulders', 'triceps'],
		pattern: 'push',
		feel: 'Top of the shoulders.',
	},
	{
		name: 'Bicep curl',
		muscles: ['biceps'],
		pattern: 'pull',
		feel: 'Front of the upper arms.',
	},
	{
		name: 'Tricep extension',
		muscles: ['triceps'],
		pattern: 'push',
		feel: 'Back of the upper arms.',
	},
];

/** A running-relevant strength circuit: legs + posterior chain + push/pull balance. */
export function defaultCircuit(available: string[] = PF_MACHINES.map((m) => m.name)): MachineExercise[] {
	const byName = new Map(PF_MACHINES.map((m) => [m.name, m]));
	const want = ['Leg press', 'Leg curl', 'Back extension', 'Seated row', 'Leg extension', 'Shoulder press'];
	return want.map((n) => byName.get(n)).filter((m): m is MachineExercise => !!m && available.includes(m.name));
}
