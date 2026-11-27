/**
 * Free-bodyweight catalog, at the same depth as the machine catalog, for users
 * who train at home or prefer not to use machines. Cues follow the same research
 * base (research/wave-1/3b strength programming; research/wave-2/4b free weights
 * and machines). Movement patterns mirror the machine set so push/pull, legs and
 * core stay balanced.
 */

import type { MachineExercise } from './machines';

export const BODYWEIGHT_MOVES: MachineExercise[] = [
	{
		name: 'Bodyweight squat',
		muscles: ['quadriceps', 'glutes'],
		pattern: 'squat',
		why: 'Builds the leg drive behind every stride and every climb, with no equipment.',
		feel: 'Front of the thighs and glutes, not your knees.',
		form: [
			'Feet shoulder-width, toes turned slightly out.',
			'Sit back and down, chest tall, knees tracking over the toes.',
			'Go as low as you can without the back rounding, then stand tall.',
		],
		mistakes: ['Knees caving inward', 'Heels lifting off the floor'],
	},
	{
		name: 'Split squat',
		muscles: ['quadriceps', 'glutes', 'balance'],
		pattern: 'squat',
		why: 'One leg at a time, like running, so it builds single-leg strength and steadiness.',
		feel: 'Front thigh and glute of the front leg.',
		form: [
			'Stagger the feet, front foot flat, back heel lifted.',
			'Drop the back knee toward the floor, torso upright.',
			'Push through the front foot to stand.',
		],
		mistakes: ['Stepping too narrow so the knee drifts inward', 'Leaning the torso forward'],
	},
	{
		name: 'Reverse lunge',
		muscles: ['glutes', 'quadriceps', 'hamstrings'],
		pattern: 'squat',
		why: 'Trains the push-off and the braking on downhills, one side at a time.',
		feel: 'Glute and thigh of the front leg.',
		form: [
			'Step back, not forward, to spare the knees.',
			'Lower until the back knee is just above the floor.',
			'Drive through the front foot to return.',
		],
		mistakes: ['Front knee sliding too far past the toes', 'Rushing the step and losing balance'],
	},
	{
		name: 'Step-up',
		muscles: ['glutes', 'quadriceps'],
		pattern: 'squat',
		why: 'Mirrors the drive up a step or a climb, and trains the hip to stay steady.',
		feel: 'Glute and thigh of the working leg.',
		form: [
			'Use a step or bench about knee height.',
			'Place the whole foot on top, then stand tall.',
			'Lower slowly, controlling the way down.',
		],
		mistakes: ['Pushing off the back foot', 'Letting the knee cave inward'],
	},
	{
		name: 'Single-leg RDL',
		muscles: ['hamstrings', 'glutes', 'balance'],
		pattern: 'hinge',
		why: 'Hamstrings brake every stride; this trains them and your balance together.',
		feel: 'Back of the standing thigh and the glute.',
		form: [
			'Stand on one leg with a soft knee.',
			'Hinge at the hip, reaching the other leg back, back flat.',
			'Stop at a hamstring stretch, then return.',
		],
		mistakes: ['Rounding the lower back', 'Rotating the hips open'],
	},
	{
		name: 'Glute bridge',
		muscles: ['glutes', 'hamstrings'],
		pattern: 'hinge',
		why: 'Strong glutes keep the pelvis level and the stride powerful when you tire.',
		feel: 'Glutes, with the hamstrings helping.',
		form: [
			'Lie on your back, heels close to the hips.',
			'Drive the hips up until the body is a straight line.',
			'Squeeze the glutes at the top, then lower slowly.',
		],
		mistakes: ['Arching the lower back instead of using the glutes', 'Pushing through the toes'],
	},
	{
		name: 'Calf raise',
		muscles: ['calves', 'Achilles'],
		pattern: 'calf',
		why: 'Calves and Achilles take the load of every step, and are where many runners get sore.',
		feel: 'Calves, with a stretch at the bottom.',
		form: [
			'Stand tall, feet flat, on a step if you have one.',
			'Rise onto the balls of the feet, pause at the top.',
			'Lower slowly for a full stretch.',
		],
		mistakes: ['Bouncing quickly instead of controlling', 'Rolling onto the outside of the foot'],
	},
	{
		name: 'Push-up',
		muscles: ['chest', 'triceps', 'core'],
		pattern: 'push',
		why: 'Holds your posture and arm swing together over a long run.',
		feel: 'Chest, arms and the front of the core.',
		form: [
			'Hands under the shoulders, body in one straight line.',
			'Lower until the chest is near the floor.',
			'Push up without letting the hips sag or pike.',
		],
		mistakes: ['Hips sagging or piking up', 'Elbows flaring wide'],
	},
	{
		name: 'Inverted row',
		muscles: ['mid-back', 'biceps'],
		pattern: 'pull',
		why: 'Balances the pushing work and keeps the upper back strong, which holds good posture.',
		feel: 'Between the shoulder blades and the arms.',
		form: [
			'Hang under a bar or a sturdy table, body straight.',
			'Pull the chest to the bar, elbows close to the body.',
			'Lower under control.',
		],
		mistakes: ['Hips dropping so the body bends', 'Yanking with the arms only'],
	},
	{
		name: 'Prone Y-T-W',
		muscles: ['upper back', 'shoulders'],
		pattern: 'pull',
		why: 'Small, steady work for the upper back and shoulders, with no equipment.',
		feel: 'Between the shoulder blades and the back of the shoulders.',
		form: [
			'Lie face down, arms out in a Y, then a T, then a W.',
			'Lift the arms slightly, thumbs up, squeezing the upper back.',
			'Move slowly and keep the neck relaxed.',
		],
		mistakes: ['Shrugging the shoulders toward the ears', 'Using momentum instead of control'],
	},
	{
		name: 'Plank',
		muscles: ['core', 'shoulders'],
		pattern: 'core',
		why: 'A steady trunk holds your form late in a run, when the legs start to fade.',
		feel: 'Front of the core, held firm, not the lower back.',
		form: [
			'Elbows under the shoulders, body in one line.',
			'Squeeze the glutes and brace the belly.',
			'Breathe steadily, and stop when the line breaks.',
		],
		mistakes: ['Hips sagging toward the floor', 'Holding your breath'],
	},
	{
		name: 'Dead bug',
		muscles: ['core'],
		pattern: 'core',
		why: 'Teaches the trunk to stay still while the limbs move, which is what running asks.',
		feel: 'Deep in the belly, with the lower back flat.',
		form: [
			'Lie on your back, arms up, knees bent at 90 degrees.',
			'Lower one arm and the opposite leg toward the floor.',
			'Keep the lower back flat, then switch sides.',
		],
		mistakes: ['Letting the lower back arch off the floor', 'Moving too fast to control'],
	},
];

/**
 * Dumbbell variants of the bodyweight moves, used when the user has dumbbells.
 * The bodyweight circuit is used in the base block, then these load it up as the
 * plan progresses.
 */
export const DUMBBELL_MOVES: MachineExercise[] = [
	{
		name: 'Goblet squat',
		muscles: ['quadriceps', 'glutes'],
		pattern: 'squat',
		why: 'The squat with load, to build the leg drive behind every stride.',
		feel: 'Front of the thighs and glutes.',
		form: [
			'Hold one dumbbell at the chest, feet shoulder-width.',
			'Sit back and down, chest tall, knees over the toes.',
			'Drive up through the whole foot.',
		],
		mistakes: ['Knees caving inward', 'Letting the chest drop'],
	},
	{
		name: 'Dumbbell split squat',
		muscles: ['quadriceps', 'glutes', 'balance'],
		pattern: 'squat',
		why: 'Single-leg strength with load, for steadiness when you tire.',
		feel: 'Front thigh and glute of the front leg.',
		form: [
			'Stagger the feet, a dumbbell in each hand.',
			'Drop the back knee toward the floor, torso upright.',
			'Push through the front foot to stand.',
		],
		mistakes: ['Stepping too narrow', 'Leaning the torso forward'],
	},
	{
		name: 'Dumbbell Romanian deadlift',
		muscles: ['hamstrings', 'glutes'],
		pattern: 'hinge',
		why: 'Loads the hamstrings that brake every stride.',
		feel: 'Back of the thighs and the glutes.',
		form: [
			'Stand tall with dumbbells in front of the thighs.',
			'Hinge at the hip, back flat, dumbbells close to the legs.',
			'Stop at a hamstring stretch, then stand tall.',
		],
		mistakes: ['Rounding the lower back', 'Bending the knees too much'],
	},
	{
		name: 'Dumbbell row',
		muscles: ['mid-back', 'biceps'],
		pattern: 'pull',
		why: 'Balances the pushing work and keeps the upper back strong.',
		feel: 'Between the shoulder blades and the arm.',
		form: [
			'Brace one hand on a bench, dumbbell in the other.',
			'Pull the dumbbell to the hip, elbow close to the body.',
			'Lower under control.',
		],
		mistakes: ['Twisting the torso', 'Yanking with the arm only'],
	},
	{
		name: 'Dumbbell shoulder press',
		muscles: ['shoulders', 'triceps'],
		pattern: 'push',
		why: 'Holds the shoulders and arm swing together over a long run.',
		feel: 'Shoulders and the back of the arms.',
		form: [
			'Dumbbells at shoulder height, palms forward.',
			'Press overhead without arching the back.',
			'Lower under control to the shoulders.',
		],
		mistakes: ['Arching the lower back', 'Pressing in front of the body'],
	},
	{
		name: 'Dumbbell calf raise',
		muscles: ['calves', 'Achilles'],
		pattern: 'calf',
		why: 'Loads the calves and Achilles that take every step.',
		feel: 'Calves, with a stretch at the bottom.',
		form: [
			'Stand tall with dumbbells, feet flat on a step if you have one.',
			'Rise onto the balls of the feet, pause, then lower slowly.',
			'Keep the weight over the big toe.',
		],
		mistakes: ['Bouncing', 'Rolling onto the outside of the foot'],
	},
];
