/**
 * Wave-5 workout additions, lifted from the research (research/wave-5/15a running
 * session types, 15b form drills, 16a cross-training, 13a to 13d strength moves,
 * 14a/14c/14d mobility and recovery). Same shape as the core library, so the picker,
 * the player and the detail view need no special case. No em dashes.
 */

import { block, MIN, step, wk } from './library-helpers';
import type { LibraryWorkout } from './library';

export const EXTRA_WORKOUTS: LibraryWorkout[] = [
	// ---- Running: quality sessions ---------------------------------------
	{
		id: 'norwegian-4x4-45',
		title: 'Norwegian 4x4',
		modality: 'running',
		type: 'interval',
		durationMin: 45,
		intensity: 'hard',
		summary:
			'Four hard 4-minute efforts with 3 minutes of easy jogging between. The best-evidenced session for lifting aerobic power.',
		purpose:
			'The 4x4 raises VO2max more than steady running at the same effort, so it lifts the ceiling on every other pace. Keep the hard parts honest but controlled.',
		targetRpe: [8, 9],
		workout: wk([
			block([
				step(
					'warmup',
					'Easy jog',
					12 * MIN,
					'Build gradually and add a few short strides at the end.',
				),
			]),
			block(
				[
					step(
						'work',
						'Hard effort',
						4 * MIN,
						'About 90 percent of your hardest. Strong and controlled, not a sprint.',
						{
							targetRpe: [8, 9],
						},
					),
					step(
						'recovery',
						'Easy jog',
						3 * MIN,
						'Jog until your breathing comes back down before the next one.',
					),
				],
				4,
				'4 x 4',
			),
			block([step('cooldown', 'Easy jog', 8 * MIN, 'Ease off fully.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/1b-intensity-zones'],
		tags: ['run', 'intervals', 'hard', 'vo2'],
	},
	{
		id: 'cruise-intervals-55',
		title: 'Cruise intervals',
		modality: 'running',
		type: 'threshold',
		durationMin: 55,
		intensity: 'steady',
		summary:
			'Several reps at threshold pace with short jog recoveries, comfortably hard and controlled.',
		purpose:
			'Accumulate time near lactate threshold with less fatigue than one long tempo, which lifts the pace you can hold before it starts to bite.',
		targetRpe: [6, 7],
		workout: wk([
			block([
				step('warmup', 'Easy jog', 15 * MIN, 'Build gradually, with a few strides at the end.'),
			]),
			block(
				[
					step(
						'work',
						'Threshold effort',
						6 * MIN,
						'Comfortably hard. Steady breathing, a few words possible.',
						{
							targetRpe: [6, 7],
						},
					),
					step('recovery', 'Easy jog', 90, 'Short jog to recover, then go again.'),
				],
				4,
				'Efforts',
			),
			block([step('cooldown', 'Easy jog', 10 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'threshold'],
	},
	{
		id: 'yasso-800s-50',
		title: 'Yasso 800s',
		modality: 'running',
		type: 'interval',
		durationMin: 50,
		intensity: 'hard',
		summary:
			'Ten 800 m reps with an equal-time jog between. A classic marathon-sharpening session.',
		purpose:
			'Teaches even pacing and the ability to repeat a hard, controlled effort. Treat any time prediction as a rough guide, not a promise.',
		targetRpe: [7, 8],
		workout: wk([
			block([step('warmup', 'Easy jog', 15 * MIN, 'Build gradually.')]),
			block(
				[
					step(
						'work',
						'800 m rep',
						210,
						'Even effort across all reps. Aim to run them all at the same pace.',
						{
							targetRpe: [7, 8],
							distanceM: 800,
						},
					),
					step(
						'recovery',
						'Jog recovery',
						200,
						'Jog for about the same time it took to run the rep.',
					),
				],
				6,
				'800s',
			),
			block([step('cooldown', 'Easy jog', 10 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations'],
		tags: ['run', 'intervals', 'marathon'],
	},
	{
		id: 'marathon-pace-run-70',
		title: 'Marathon pace run',
		modality: 'running',
		type: 'race-pace',
		durationMin: 70,
		intensity: 'steady',
		summary: 'A long run with a block at goal marathon pace in the middle.',
		purpose:
			'Teaches your body to hold race pace on tired legs and rehearses fuelling, which is where marathons are won or lost.',
		targetRpe: [5, 6],
		workout: wk([
			block([step('warmup', 'Easy jog', 20 * MIN, 'Easy, then build the last few minutes.')]),
			block([
				step(
					'work',
					'Marathon pace',
					40 * MIN,
					'Goal race pace, even and relaxed. Take fuel if the run is long.',
					{
						targetRpe: [5, 6],
					},
				),
			]),
			block([step('cooldown', 'Easy jog', 10 * MIN, 'Ease down.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2a-aerobic-long-runs'],
		tags: ['run', 'marathon', 'race-pace'],
	},
	{
		id: 'half-marathon-pace-60',
		title: 'Half-marathon pace run',
		modality: 'running',
		type: 'race-pace',
		durationMin: 60,
		intensity: 'steady',
		summary: 'A run with two blocks at goal half-marathon pace, separated by easy running.',
		purpose:
			'Builds the specific endurance to hold a faster pace than the marathon, which sharpens your race-day feel.',
		targetRpe: [6, 7],
		workout: wk([
			block([step('warmup', 'Easy jog', 15 * MIN, 'Build gradually.')]),
			block([
				step('work', 'Half-marathon pace', 15 * MIN, 'Goal race pace, controlled and even.', {
					targetRpe: [6, 7],
				}),
			]),
			block([step('recovery', 'Easy jog', 5 * MIN, 'Float easily between the blocks.')]),
			block([
				step('work', 'Half-marathon pace', 15 * MIN, 'Hold the same pace as the first block.', {
					targetRpe: [6, 7],
				}),
			]),
			block([step('cooldown', 'Easy jog', 10 * MIN, 'Ease down.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'half-marathon', 'race-pace'],
	},
	{
		id: 'cut-down-run-50',
		title: 'Cut-down run',
		modality: 'running',
		type: 'progression',
		durationMin: 50,
		intensity: 'steady',
		summary:
			'Start easy and step the pace down in three stages, finishing quicker than you started.',
		purpose:
			'Trains you to run the second half stronger than the first, a habit that pays off in races. Finish in control, not spent.',
		targetRpe: [4, 7],
		workout: wk([
			block([step('warmup', 'Easy jog', 10 * MIN, 'Start relaxed.')]),
			block([step('work', 'Easy', 12 * MIN, 'Relaxed, conversational.')]),
			block([
				step('work', 'Steady', 12 * MIN, 'A step quicker, still controlled.', {
					targetRpe: [5, 6],
				}),
			]),
			block([
				step('work', 'Threshold', 10 * MIN, 'Noticeably quicker, comfortably hard.', {
					targetRpe: [6, 7],
				}),
			]),
			block([step('cooldown', 'Easy jog', 6 * MIN, 'Finish easy.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2a-aerobic-long-runs'],
		tags: ['run', 'pacing'],
	},
	{
		id: 'broken-tempo-45',
		title: 'Broken tempo',
		modality: 'running',
		type: 'tempo',
		durationMin: 45,
		intensity: 'hard',
		summary:
			'Three 10-minute tempo efforts with a short float between, instead of one unbroken block.',
		purpose:
			'Gets the same tempo time with less fatigue, and the floats teach you to recover at pace rather than stopping.',
		targetRpe: [6, 7],
		workout: wk([
			block([step('warmup', 'Easy jog', 10 * MIN, 'Build gradually.')]),
			block(
				[
					step('work', 'Tempo', 10 * MIN, 'Comfortably hard and even.', { targetRpe: [6, 7] }),
					step('recovery', 'Float', 60, 'Jog slowly, then go again before you fully recover.'),
				],
				3,
				'Tempo blocks',
			),
			block([step('cooldown', 'Easy jog', 5 * MIN, 'Ease off.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'threshold'],
	},
	{
		id: 'pyramid-intervals-50',
		title: 'Pyramid intervals',
		modality: 'running',
		type: 'interval',
		durationMin: 50,
		intensity: 'hard',
		summary: 'Hard efforts of 1, 2, 3, 2 and 1 minutes, with easy jogging between.',
		purpose:
			'Mixes short and medium efforts so the session passes quickly and covers more than one kind of speed.',
		targetRpe: [7, 9],
		workout: wk([
			block([step('warmup', 'Easy jog', 12 * MIN, 'Build gradually.')]),
			block([
				step('work', 'Hard', 60, 'Quick and relaxed.', { targetRpe: [8, 9] }),
				step('recovery', 'Easy jog', 90, 'Recover before the next one.'),
			]),
			block([
				step('work', 'Hard', 2 * MIN, 'Controlled hard.', { targetRpe: [7, 8] }),
				step('recovery', 'Easy jog', 90, 'Recover.'),
			]),
			block([
				step('work', 'Hard', 3 * MIN, 'Steady hard, hold form.', { targetRpe: [7, 8] }),
				step('recovery', 'Easy jog', 90, 'Recover.'),
			]),
			block([
				step('work', 'Hard', 2 * MIN, 'Same as the first 2 minutes.', { targetRpe: [7, 8] }),
				step('recovery', 'Easy jog', 90, 'Recover.'),
			]),
			block([step('work', 'Hard', 60, 'Finish quick, stay relaxed.', { targetRpe: [8, 9] })]),
			block([step('cooldown', 'Easy jog', 10 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'intervals'],
	},
	{
		id: 'short-rep-200s-35',
		title: 'Short-rep speed',
		modality: 'running',
		type: 'interval',
		durationMin: 35,
		intensity: 'hard',
		summary: 'Ten 200 m reps with a walk or easy jog back. Fast and relaxed, never straining.',
		purpose:
			'Keeps leg speed and running form sharp without much fatigue, and is easy to recover from.',
		targetRpe: [8, 9],
		workout: wk([
			block([step('warmup', 'Easy jog', 12 * MIN, 'Include a few strides to wake up the legs.')]),
			block(
				[
					step('work', '200 m rep', 40, 'Fast and smooth. Stop before your form breaks down.', {
						targetRpe: [8, 9],
						distanceM: 200,
					}),
					step('recovery', 'Walk or jog back', 75, 'Full recovery, then go again.'),
				],
				8,
				'200s',
			),
			block([step('cooldown', 'Easy jog', 8 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'speed', 'form'],
	},
	{
		id: 'hill-strides-35',
		title: 'Hill strides',
		modality: 'running',
		type: 'hills',
		durationMin: 35,
		intensity: 'steady',
		summary: 'An easy run that ends with short, quick strides up a gentle hill.',
		purpose:
			'Builds leg power and running form with less pounding than flat speed work, and the hill makes the stride self-limiting.',
		targetRpe: [4, 8],
		workout: wk([
			block([step('warmup', 'Easy jog', 12 * MIN, 'Easy, on flat ground.')]),
			block([step('work', 'Easy run', 10 * MIN, 'Relaxed, heading toward a gentle hill.')]),
			block(
				[
					step(
						'work',
						'Hill stride',
						20,
						'Quick, light steps up the hill. Strong but relaxed, not a sprint.',
						{
							targetRpe: [7, 8],
						},
					),
					step('recovery', 'Walk down', 60, 'Walk back down and reset.'),
				],
				6,
				'Strides',
			),
			block([step('cooldown', 'Easy jog', 5 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'hills', 'power'],
	},
	{
		id: 'downhill-reps-45',
		title: 'Downhill reps',
		modality: 'running',
		type: 'hills',
		durationMin: 45,
		intensity: 'steady',
		summary:
			'Controlled fast running down a gentle hill, walked or jogged back up. Introduce slowly.',
		purpose:
			'Trains the quads to handle downhill running, which helps on hilly courses. The first session leaves the legs sore for days, so keep it small and away from key sessions.',
		targetRpe: [5, 7],
		workout: wk([
			block([step('warmup', 'Easy jog', 15 * MIN, 'Build gradually, on flat ground.')]),
			block(
				[
					step(
						'work',
						'Downhill rep',
						45,
						'Relaxed and in control. Quick feet, stay tall, do not overstride.',
						{
							targetRpe: [5, 7],
						},
					),
					step('recovery', 'Walk or jog up', 90, 'Walk back up, recover fully.'),
				],
				6,
				'Downhill reps',
			),
			block([step('cooldown', 'Easy jog', 8 * MIN, 'Easy, on flat ground.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations'],
		tags: ['run', 'hills', 'advanced'],
	},
	{
		id: 'back-to-back-long-75',
		title: 'Long run, 75 minutes (back-to-back)',
		modality: 'running',
		type: 'long',
		durationMin: 75,
		intensity: 'easy',
		summary: 'A steady long run to follow an earlier long run, teaching the legs to run tired.',
		purpose:
			'The second long run in a back-to-back pair builds endurance under fatigue, a useful marathon block. Keep the effort easy throughout.',
		targetRpe: [4, 5],
		workout: wk([
			block([step('warmup', 'Easy jog', 5 * MIN, 'Start very easy, the legs may feel heavy.')]),
			block([
				step('work', 'Long run', 65 * MIN, 'Easy and even. Fuel if it runs past an hour.', {
					targetRpe: [4, 5],
				}),
			]),
			block([step('cooldown', 'Easy walk and jog', 5 * MIN, 'Slow down gradually.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2a-aerobic-long-runs'],
		tags: ['run', 'endurance', 'advanced'],
	},

	// ---- Running: form and drills ----------------------------------------
	{
		id: 'running-drills-form-25',
		title: 'Running drills and form',
		modality: 'mobility',
		type: 'drills',
		durationMin: 25,
		intensity: 'easy',
		summary: 'A set of running drills that train a tall posture and a quick, quiet foot strike.',
		purpose:
			'Drills are skill work: they build the feel of good form and add a little bounce and stiffness, which supports running economy. Keep them light and snappy.',
		targetRpe: [3, 5],
		workout: wk([
			block([
				step(
					'warmup',
					'Easy jog',
					5 * MIN,
					'Easy jog to warm up, then walk through each drill once.',
				),
			]),
			block(
				[
					step(
						'work',
						'A-skips',
						30,
						'Knee to hip height, snap the foot down under you. Stay tall.',
					),
					step('work', 'B-skips', 30, 'Like A-skips, then flick the foot out and paw it back.'),
					step('recovery', 'Walk back', 30, 'Walk back to the start and reset.'),
					step('work', 'High knees', 30, 'Quick, tall, fast feet.'),
					step('work', 'Butt kicks', 30, 'Heels to the glutes, stay light.'),
					step('recovery', 'Walk back', 30, 'Reset.'),
					step('work', 'Straight-leg runs', 30, 'Stiff knees, springy ankles, quiet landings.'),
					step('work', 'Ankling', 30, 'Relaxed ankles, quick and quiet off the ground.'),
				],
				2,
				'Drill circuit',
			),
			block([step('cooldown', 'Easy jog', 4 * MIN, 'Shake the legs out.')]),
		]),
		refs: ['wave-5/15b-running-drills-mechanics'],
		tags: ['run', 'form', 'drills', 'no-equipment'],
	},

	// ---- Cross-training ---------------------------------------------------
	{
		id: 'easy-spin-flush-ride-40',
		title: 'Easy spin flush ride',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 40,
		intensity: 'easy',
		summary: 'A light, smooth spin at a chatty effort, legs turning freely with little resistance.',
		purpose:
			'Moves blood and eases heavy legs after a hard run without adding impact. Also works as an aerobic top-up on a low-load day.',
		targetRpe: [3, 5],
		workout: wk([
			block([step('warmup', 'Easy spin', 8 * MIN, 'Very light resistance, spin smoothly.')]),
			block([
				step(
					'work',
					'Steady spin',
					30 * MIN,
					'Chatty effort. Keep the legs turning at a comfortable cadence.',
				),
			]),
			block([step('cooldown', 'Easy spin', 2 * MIN, 'Wind down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'bike', 'recovery'],
	},
	{
		id: 'bike-threshold-45',
		title: 'Bike threshold intervals',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 45,
		intensity: 'hard',
		summary:
			'Three 8-minute efforts on the bike at a hard, controlled pace, with easy spinning between.',
		purpose:
			'Builds aerobic fitness with no running impact, useful when you want a hard day without the pounding.',
		targetRpe: [6, 8],
		workout: wk([
			block([step('warmup', 'Easy spin', 10 * MIN, 'Light, building to a comfortable effort.')]),
			block(
				[
					step('work', 'Threshold effort', 8 * MIN, 'Hard but controlled, steady breathing.', {
						targetRpe: [6, 8],
					}),
					step('recovery', 'Easy spin', 3 * MIN, 'Spin easily to recover.'),
				],
				3,
				'Efforts',
			),
			block([step('cooldown', 'Easy spin', 8 * MIN, 'Wind down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'bike', 'hard'],
	},
	{
		id: 'deep-water-running-40',
		title: 'Deep water running',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 40,
		intensity: 'steady',
		summary: 'Run in the deep end of a pool with a float belt, copying the running action.',
		purpose:
			'The closest running substitute with no ground impact, useful if you have a sore spot but want to keep the engine. Set effort by feel, since pool heart rate runs a little lower.',
		targetRpe: [4, 7],
		workout: wk([
			block([
				step(
					'warmup',
					'Easy aqua jog',
					8 * MIN,
					'Find a rhythm, upright posture, quick leg turnover.',
				),
			]),
			block(
				[
					step('work', 'Steady aqua jog', 4 * MIN, 'Simulate your running cadence. Harder effort.'),
					step('recovery', 'Easy aqua jog', 2 * MIN, 'Ease back down.'),
				],
				5,
				'Efforts',
			),
			block([step('cooldown', 'Easy aqua jog', 2 * MIN, 'Wind down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'aqua-run', 'low-impact', 'injury'],
	},
	{
		id: 'easy-swim-30',
		title: 'Easy swim',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 30,
		intensity: 'easy',
		summary: 'A relaxed, continuous swim at a pace you can hold without gasping.',
		purpose:
			'Full-body aerobic work with no impact, and a good change of scene that rests the legs.',
		targetRpe: [3, 5],
		workout: wk([
			block([step('warmup', 'Easy lengths', 6 * MIN, 'Start gently, find a smooth stroke.')]),
			block([
				step(
					'work',
					'Steady swim',
					20 * MIN,
					'Even, relaxed pace. Rest briefly at the wall if you need to.',
				),
			]),
			block([step('cooldown', 'Easy lengths', 4 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'swim', 'low-impact'],
	},
	{
		id: 'steady-row-30',
		title: 'Steady row',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 30,
		intensity: 'steady',
		summary: 'A steady, continuous row at a sustainable effort, driven from the legs.',
		purpose:
			'Trains the legs, back and arms together with no impact, and the drive pattern is close to pushing off in running.',
		targetRpe: [5, 7],
		workout: wk([
			block([step('warmup', 'Easy row', 6 * MIN, 'Long, smooth strokes to warm up.')]),
			block([
				step(
					'work',
					'Steady row',
					22 * MIN,
					'Sustainable effort. Push with the legs, then pull with the back and arms.',
				),
			]),
			block([step('cooldown', 'Easy row', 2 * MIN, 'Slow the rate down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'row'],
	},
	{
		id: 'elliptical-easy-35',
		title: 'Elliptical',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 35,
		intensity: 'easy',
		summary:
			'A steady session on the elliptical at a conversational effort, no impact on the joints.',
		purpose:
			'Low-impact aerobic work that closely mimics the running motion, useful for extra volume or when the legs need a break from pounding.',
		targetRpe: [4, 5],
		workout: wk([
			block([step('warmup', 'Easy', 5 * MIN, 'Start easy, find a smooth rhythm.')]),
			block([
				step('work', 'Steady', 27 * MIN, 'Conversational effort, arms and legs driving together.'),
			]),
			block([step('cooldown', 'Easy', 3 * MIN, 'Slow down gradually.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'elliptical', 'low-impact'],
	},
	{
		id: 'incline-walk-40',
		title: 'Incline treadmill walk',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 40,
		intensity: 'steady',
		summary: 'A brisk walk on a treadmill set to a steady incline.',
		purpose:
			'Builds aerobic fitness and trains the hips, glutes and calves on hills with low impact, which supports hill running.',
		targetRpe: [4, 6],
		workout: wk([
			block([step('warmup', 'Flat walk', 5 * MIN, 'Easy pace, no incline.')]),
			block([
				step(
					'work',
					'Incline walk',
					30 * MIN,
					'Steady brisk pace at a firm incline. Stand tall, do not hold the rails.',
					{ targetRpe: [4, 6] },
				),
			]),
			block([step('cooldown', 'Flat walk', 5 * MIN, 'Drop the incline and ease off.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'incline', 'hills'],
	},
	{
		id: 'stair-climber-25',
		title: 'Stair climber',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 25,
		intensity: 'steady',
		summary: 'A steady climb on the stair machine at a controlled effort.',
		purpose:
			'Loads the glutes, quads and calves through a hill-like drive with less impact than running, a good strength-endurance top-up.',
		targetRpe: [5, 7],
		workout: wk([
			block([step('warmup', 'Easy climb', 5 * MIN, 'Slow pace to warm up.')]),
			block([
				step(
					'work',
					'Steady climb',
					18 * MIN,
					'Controlled effort, stand tall, light hands on the rails.',
					{ targetRpe: [5, 7] },
				),
			]),
			block([step('cooldown', 'Easy climb', 2 * MIN, 'Slow the pace down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'stairs'],
	},

	// ---- Strength: home, dumbbell, kettlebell, bands ---------------------
	{
		id: 'dumbbell-full-body-35',
		title: 'Dumbbell full-body',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 35,
		intensity: 'steady',
		summary:
			'A balanced dumbbell session covering legs, hips, push and pull, at a load you can control.',
		purpose:
			'Loaded strength work drives running economy, and single-leg and hinge moves fit running better than machine-only work.',
		targetRpe: [6, 8],
		workout: wk([
			block([
				step(
					'warmup',
					'Warm-up',
					6 * MIN,
					'Easy walk, then bodyweight squats and a few glute bridges.',
				),
			]),
			block(
				[
					step(
						'work',
						'Goblet squat',
						50,
						'Hold one dumbbell at the chest. Sit down between the feet, chest tall.',
					),
					step(
						'work',
						'Dumbbell Romanian deadlift',
						50,
						'Hinge from the hip, flat back, dumbbells close to the legs.',
					),
					step('work', 'Dumbbell row', 50, 'Each side. Pull to the hip, elbow close.'),
					step('work', 'Dumbbell shoulder press', 50, 'Press overhead without arching the back.'),
					step('work', 'Dumbbell calf raise', 50, 'Rise high, pause, lower slowly.'),
					step('rest', 'Rest', 75, 'Rest well before the next round.'),
				],
				3,
				'Sets',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Settle your breathing.')]),
		]),
		refs: ['wave-5/13a-dumbbell-freeweight-exercises', 'wave-1/3b-strength-programming'],
		tags: ['strength', 'dumbbells', 'full-body'],
	},
	{
		id: 'kettlebell-power-30',
		title: 'Kettlebell power',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 30,
		intensity: 'steady',
		summary: 'Swings, goblet squats and single-leg work with a kettlebell. Hips do the work.',
		purpose:
			'The swing is a ballistic hip hinge that builds hip power, which supports a strong push-off. Learn the hinge before adding speed.',
		targetRpe: [6, 8],
		workout: wk([
			block([
				step('warmup', 'Warm-up', 6 * MIN, 'Easy squats, hip hinges and a few glute bridges.'),
			]),
			block(
				[
					step(
						'work',
						'Two-hand kettlebell swing',
						40,
						'Hinge, then snap the hips. The bell floats, the arms just hold on.',
					),
					step(
						'work',
						'Kettlebell goblet squat',
						50,
						'Hold the bell at the chest, sit between the feet.',
					),
					step('work', 'Single-leg kettlebell deadlift', 50, 'Each side. Hips square, back flat.'),
					step('rest', 'Rest', 75, 'Recover before the next round.'),
				],
				3,
				'Rounds',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Let your heart rate settle.')]),
		]),
		refs: ['wave-5/13b-barbell-kettlebell-power', 'wave-1/3b-strength-programming'],
		tags: ['strength', 'kettlebell', 'power'],
	},
	{
		id: 'band-home-strength-30',
		title: 'Band and home strength',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 30,
		intensity: 'steady',
		summary: 'A no-gym session with bands and bodyweight, covering hips, legs, back and core.',
		purpose:
			'Bands match weights for strength when the effort is matched, so this builds useful strength with almost no kit.',
		targetRpe: [5, 7],
		workout: wk([
			block([step('warmup', 'Warm-up', 5 * MIN, 'Easy walk and a few bodyweight squats.')]),
			block(
				[
					step(
						'work',
						'Banded squat',
						45,
						'Band above the knees. Push the knees out as you squat.',
					),
					step('work', 'Band Romanian deadlift', 45, 'Stand on the band, hinge with a flat back.'),
					step('work', 'Band pull-apart', 45, 'Arms straight, squeeze the shoulder blades.'),
					step(
						'work',
						'Banded glute bridge',
						45,
						'Band above the knees, drive the hips up and squeeze.',
					),
					step('work', 'Mini-band lateral walk', 45, 'Each way. Stay low, keep the band tight.'),
					step('rest', 'Rest', 60, 'Rest before the next round.'),
				],
				3,
				'Circuit',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Slow down.')]),
		]),
		refs: ['wave-5/13c-minimal-equipment-bands-home', 'wave-1/3c-bodyweight-and-machines'],
		tags: ['strength', 'bands', 'no-gym'],
	},
	{
		id: 'runner-core-20',
		title: 'Runner core',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 20,
		intensity: 'steady',
		summary: 'Anti-rotation and trunk control work to hold your form late in a run.',
		purpose:
			'A steady trunk keeps the pelvis level and the stride efficient when you tire. Move slowly and keep the lower back flat.',
		targetRpe: [5, 7],
		workout: wk([
			block([step('warmup', 'Warm-up', 4 * MIN, 'Easy walk, then a few cat-cow reps.')]),
			block(
				[
					step('work', 'Plank', 40, 'One line from head to heels. Breathe steadily.'),
					step('work', 'Side plank', 40, 'Each side. Stack the hips, do not let them drop.'),
					step('work', 'Dead bug', 40, 'Keep the lower back flat as you move the limbs.'),
					step(
						'work',
						'Ab wheel rollout',
						40,
						'Roll out only as far as you can hold the flat back.',
					),
					step('rest', 'Rest', 60, 'Breathe before the next round.'),
				],
				2,
				'Circuit',
			),
			block([step('cooldown', 'Easy walk', 4 * MIN, 'Settle your breathing.')]),
		]),
		refs: ['wave-5/13d-bodyweight-progressions', 'wave-1/3c-bodyweight-and-machines'],
		tags: ['strength', 'core', 'no-equipment'],
	},
	{
		id: 'hamstring-calf-strength-30',
		title: 'Hamstring and calf strength',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 30,
		intensity: 'steady',
		summary: 'Eccentric hamstring and calf work, the two areas with the strongest injury evidence.',
		purpose:
			'Nordic curls roughly halve hamstring injuries, and controlled calf loading builds the tendon that takes every step. Go slowly on the lowering phase.',
		targetRpe: [6, 8],
		workout: wk([
			block([step('warmup', 'Warm-up', 6 * MIN, 'Easy walk, then a few glute bridges.')]),
			block(
				[
					step(
						'work',
						'Nordic hamstring curl',
						40,
						'Lower as slowly as you can, use the hands to help back up.',
					),
					step(
						'work',
						'Eccentric heel drop',
						50,
						'Rise on two feet, lower on one, slowly for a full stretch.',
					),
					step(
						'work',
						'Bent-knee soleus raise',
						50,
						'Bend the knee to target the deeper calf, lower slowly.',
					),
					step('work', 'Single-leg calf raise', 50, 'Each side. Rise high, pause, lower slow.'),
					step('rest', 'Rest', 75, 'Rest fully before the next round.'),
				],
				3,
				'Rounds',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Slow down.')]),
		]),
		refs: ['wave-5/13d-bodyweight-progressions', 'wave-1/3a-strength-economy-injury'],
		tags: ['strength', 'hamstrings', 'calves', 'injury'],
	},

	// ---- Mobility and flexibility ----------------------------------------
	{
		id: 'flexibility-long-holds-25',
		title: 'Flexibility',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 25,
		intensity: 'easy',
		summary: 'A longer set of gentle holds across the whole body, two short rounds each.',
		purpose:
			'Builds range of motion over time. Short holds work as well as long ones, and two rounds meet the total time without the power cost of a single long hold.',
		targetRpe: [1, 3],
		workout: wk([
			block(
				[
					step(
						'cooldown',
						'Standing straight-knee calf stretch',
						40,
						'Back leg straight, heel down, lean into the wall.',
					),
					step(
						'cooldown',
						'Kneeling hip flexor stretch',
						40,
						'Each side. Tuck the pelvis, press the hips gently forward.',
					),
					step(
						'cooldown',
						'Standing hamstring stretch',
						40,
						'Each side. Hinge with a flat back, gentle stretch only.',
					),
					step(
						'cooldown',
						'Seated glute figure-4 stretch',
						40,
						'Each side. Cross the ankle over the knee and ease the knee down.',
					),
					step(
						'cooldown',
						'Open book thoracic rotation',
						40,
						'Each side. Follow the top hand with your eyes.',
					),
					step(
						'cooldown',
						'Doorway chest stretch',
						40,
						'Forearms on the frame, step through gently.',
					),
				],
				2,
				'Holds',
			),
		]),
		refs: ['wave-5/14a-stretch-library'],
		tags: ['mobility', 'flexibility', 'no-equipment'],
	},
	{
		id: 'yoga-wind-down-20',
		title: 'Yoga wind-down',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 20,
		intensity: 'easy',
		summary: 'A short, calming flow of yoga poses and slow breathing.',
		purpose:
			'Yoga improves flexibility and balance and lowers tension after training. Breathe slowly and stop short of any pain.',
		targetRpe: [1, 2],
		workout: wk([
			block(
				[
					step(
						'warmup',
						'Downward dog',
						60,
						'Long spine, heels reaching down. Pedal the feet if it is tight.',
					),
					step(
						'cooldown',
						'Warrior II',
						60,
						'Each side. Front knee over the ankle, arms wide, gaze past the front hand.',
					),
					step(
						'cooldown',
						'Pigeon pose (figure-4 hip stretch)',
						60,
						'Each side. Keep the hips square, ease in gently.',
					),
					step(
						'cooldown',
						"Child's pose",
						60,
						'Sit back toward the heels, arms long, breathe into the back.',
					),
					step(
						'cooldown',
						'Diaphragmatic breathing',
						120,
						'Breathe into the belly, slow and even. Five to six breaths a minute.',
					),
				],
				1,
				'Flow',
			),
		]),
		refs: ['wave-5/14d-yoga-pilates-breath'],
		tags: ['mobility', 'yoga', 'breath', 'no-equipment'],
	},

	// ---- Recovery --------------------------------------------------------
	{
		id: 'full-body-foam-roll-15',
		title: 'Full-body foam roll',
		modality: 'recovery',
		type: 'recovery',
		durationMin: 15,
		intensity: 'easy',
		summary: 'Slow rolling over the main running muscles, pausing on tender spots.',
		purpose:
			'Rolling gives a small boost to flexibility and soreness and helps you feel loose. It is comfort and recovery, not a fix for tight tissue.',
		targetRpe: [1, 2],
		workout: wk([
			block(
				[
					step('work', 'Foam roll calves', 90, 'Roll slowly. Pause on a tender spot and breathe.'),
					step('work', 'Foam roll hamstrings', 90, 'From the back of the knee to the hip.'),
					step('work', 'Foam roll quads', 90, 'Front of the thigh, keep the hips down.'),
					step(
						'work',
						'Foam roll glutes',
						90,
						'Cross one ankle over the knee and roll the outer glute.',
					),
					step('work', 'Thoracic spine foam roll', 90, 'Roll the upper back, not the lower back.'),
				],
				1,
				'Roll',
			),
		]),
		refs: ['wave-5/14c-foam-roll-self-myofascial'],
		tags: ['recovery', 'foam-roll', 'no-equipment'],
	},
	{
		id: 'breath-and-settle-10',
		title: 'Breathe and settle',
		modality: 'recovery',
		type: 'recovery',
		durationMin: 10,
		intensity: 'easy',
		summary: 'A short breathing practice to calm down and help you sleep.',
		purpose:
			'Slow breathing lowers tension and supports sleep, which is the real recovery lever. Sit or lie somewhere quiet.',
		targetRpe: [1, 1],
		workout: wk([
			block(
				[
					step(
						'work',
						'Diaphragmatic breathing',
						120,
						'Breathe into the belly for four counts, out for six.',
					),
					step(
						'work',
						'Box breathing (4-4-4-4)',
						120,
						'In for four, hold four, out for four, hold four.',
					),
					step(
						'work',
						'Slow-paced breathing near 6 breaths per minute',
						300,
						'Slow, even breaths. About ten seconds per full breath.',
					),
				],
				1,
				'Breathing',
			),
		]),
		refs: ['wave-5/14d-yoga-pilates-breath', 'wave-3/9b-sleep-recovery-guidance'],
		tags: ['recovery', 'breath', 'sleep', 'no-equipment'],
	},
];
