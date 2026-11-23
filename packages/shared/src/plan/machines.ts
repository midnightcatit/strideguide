/**
 * Planet Fitness machine catalog (the 8 machines known at our location),
 * used to build strength sessions and to drill down into per-exercise detail.
 * Cues mirror the researched exercise library (research/wave-2/4a, 4b).
 */

export interface MachineExercise {
	name: string;
	muscles: string[];
	/** Movement pattern, used to balance push/pull and posterior chain. */
	pattern: 'pull' | 'push' | 'squat' | 'hinge' | 'knee-extension' | 'posterior-chain';
	/** One plain sentence on why this matters for running. */
	why: string;
	/** Short "where you should feel it" cue. */
	feel: string;
	/** Key technique cues (3–4), in plain language. */
	form: string[];
	/** Common mistakes to avoid. */
	mistakes: string[];
}

export const PF_MACHINES: MachineExercise[] = [
	{
		name: 'Leg press',
		muscles: ['quadriceps', 'glutes'],
		pattern: 'squat',
		why: 'Leg drive for the climbs and the last mile, when your legs start to fade.',
		feel: 'Front of the thighs and glutes; not your lower back.',
		form: [
			'Feet shoulder-width on the platform, whole foot in contact.',
			'Lower until knees are about 90°, no deeper if your back rounds.',
			'Press through mid-foot without locking the knees hard.',
		],
		mistakes: ['Letting the lower back round off the pad', 'Bouncing at the bottom'],
	},
	{
		name: 'Leg curl',
		muscles: ['hamstrings'],
		pattern: 'posterior-chain',
		why: 'Hamstrings brake every stride and carry the load on downhills.',
		feel: 'Back of the thighs.',
		form: [
			'Line the knee up with the machine pivot.',
			'Curl smoothly, squeeze the hamstrings at the top.',
			"Lower under control; don't let the stack slam.",
		],
		mistakes: ['Using momentum to swing the pad', 'Hips lifting off the seat'],
	},
	{
		name: 'Leg extension',
		muscles: ['quadriceps'],
		pattern: 'knee-extension',
		why: 'Quads absorb each landing and push you up the climbs.',
		feel: 'Front of the thighs, above the knee.',
		form: [
			'Knee in line with the pivot; pad on the shin, not the foot.',
			'Extend to a straight leg without hyperextending.',
			'Control the return.',
		],
		mistakes: ['Kicking up fast and dropping', 'Seat set too low'],
	},
	{
		name: 'Back extension',
		muscles: ['erector spinae', 'glutes'],
		pattern: 'hinge',
		why: 'Holds your posture tall when you tire late in a long run.',
		feel: 'Lower back and glutes, controlled and never sharp.',
		form: [
			'Hinge from the hips with a neutral spine.',
			'Rise to a straight line without arching past neutral.',
			'Move slowly; stop if you feel it in the joints.',
		],
		mistakes: ['Overextending at the top', 'Jerky reps'],
	},
	{
		name: 'Seated row',
		muscles: ['mid-back', 'lats', 'biceps'],
		pattern: 'pull',
		why: 'A strong upper back keeps your arms relaxed and your posture steady.',
		feel: 'Between the shoulder blades.',
		form: [
			'Sit tall; chest up, small bend in the knees.',
			'Pull the handle to your lower ribs, elbows close.',
			'Squeeze the shoulder blades, then release slowly.',
		],
		mistakes: ['Leaning back to yank the weight', 'Shrugging the shoulders'],
	},
	{
		name: 'Shoulder press',
		muscles: ['shoulders', 'triceps'],
		pattern: 'push',
		why: 'Steady shoulders keep your arm swing loose over long distances.',
		feel: 'Top of the shoulders.',
		form: [
			'Handles at shoulder height, wrists stacked.',
			'Press up and slightly in, without shrugging.',
			'Lower to a comfortable range, with no clanking.',
		],
		mistakes: ['Arching the lower back', 'Bouncing out of the bottom'],
	},
	{
		name: 'Bicep curl',
		muscles: ['biceps'],
		pattern: 'pull',
		why: 'Arm strength keeps your form relaxed when you are tired.',
		feel: 'Front of the upper arms.',
		form: [
			'Elbows pinned to your sides.',
			'Curl without swinging the torso.',
			'Lower slowly to a near-straight arm.',
		],
		mistakes: ['Swinging with the back', 'Half reps at speed'],
	},
	{
		name: 'Tricep extension',
		muscles: ['triceps'],
		pattern: 'push',
		why: 'Triceps drive the arm swing and help you hold good posture.',
		feel: 'Back of the upper arms.',
		form: [
			'Elbows fixed in place, upper arms still.',
			'Extend fully, squeeze, then return under control.',
			'Keep shoulders relaxed.',
		],
		mistakes: ['Elbows drifting', 'Using body weight to push down'],
	},
];

/** A running-relevant strength circuit: legs + posterior chain + push/pull balance. */
export function defaultCircuit(
	available: string[] = PF_MACHINES.map((m) => m.name),
): MachineExercise[] {
	const byName = new Map(PF_MACHINES.map((m) => [m.name, m]));
	const want = [
		'Leg press',
		'Leg curl',
		'Back extension',
		'Leg extension',
		'Seated row',
		'Shoulder press',
		'Bicep curl',
		'Tricep extension',
	];
	return want.map((n) => byName.get(n)).filter((m): m is MachineExercise => !!m && available.includes(m.name));
}

export function findMachine(name?: string): MachineExercise | undefined {
	if (!name) return undefined;
	return PF_MACHINES.find((m) => m.name === name);
}
