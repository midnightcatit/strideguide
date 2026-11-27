/**
 * Named workout recipes: the sessions a runner asks for by name, the popular
 * picks and the custom favourites. Each carries the name a runner would use
 * ("parkrun time trial", "Yasso 800s" already lives in the wave-5 file, "five by
 * five", "yoga for runners") rather than a generated label, so the picker reads
 * like a coach's list.
 *
 * Additive only. Every recipe references moves, drills and steps that exist in
 * the catalog today: a strength step names a move findMove resolves, and a
 * mobility or recovery step names a drill findDrill resolves, so the detail view
 * and the guided player need no special case. A move the recipe would want but
 * the database does not carry yet is noted in the pull request, not invented
 * here. No em dashes.
 */

import type { LibraryWorkout } from './library';
import { block, MIN, step, wk } from './library-helpers';

export const NAMED_WORKOUTS: LibraryWorkout[] = [
	// ---- Runs: named classics not already in the picker -------------------
	{
		id: 'parkrun-time-trial-5k',
		title: 'Parkrun time trial, 5 km',
		modality: 'running',
		type: 'race-pace',
		durationMin: 35,
		intensity: 'hard',
		summary:
			'A hard 5 km run at the effort you would hold on parkrun day. Go out controlled and finish strong.',
		purpose:
			'A time trial shows you the shape you are in and sets your training paces. Treat it like a race: warm up well, run even splits, and do not jog the middle.',
		targetRpe: [8, 9],
		workout: wk([
			block([
				step(
					'warmup',
					'Easy jog',
					8 * MIN,
					'Start slow, then build. Add a few strides if you feel flat.',
				),
			]),
			block([
				step(
					'work',
					'5 km time trial',
					22 * MIN,
					'Hard and even. Resist going out too fast in the first kilometre.',
					{ targetRpe: [8, 9], distanceM: 5000 },
				),
			]),
			block([
				step('cooldown', 'Easy jog', 5 * MIN, 'Ease right down and let your breathing settle.'),
			]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'race-pace', 'hard'],
	},
	{
		id: 'track-400m-repeats-45',
		title: '400 m repeats, 45 minutes',
		modality: 'running',
		type: 'interval',
		durationMin: 45,
		intensity: 'hard',
		summary: 'Eight laps of the track at a hard, even pace, with an easy jog between each.',
		purpose:
			'Short reps on a short recovery teach pace control and turnover. Run them relaxed and even rather than sprinting the first one and fading.',
		targetRpe: [8, 9],
		workout: wk([
			block([
				step('warmup', 'Easy jog', 12 * MIN, 'Build gradually and finish with a few strides.'),
			]),
			block(
				[
					step('work', '400 m', 95, 'Around 5K effort. Even and controlled, not all out.', {
						targetRpe: [8, 9],
						distanceM: 400,
					}),
					step('recovery', 'Easy jog', 90, 'Jog easily to recover before the next lap.'),
				],
				8,
				'Laps',
			),
			block([step('cooldown', 'Easy jog', 8 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'intervals', 'hard'],
	},
	{
		id: 'kenyan-hills-45',
		title: 'Kenyan hills, 45 minutes',
		modality: 'running',
		type: 'hills',
		durationMin: 45,
		intensity: 'hard',
		summary:
			'Run strong and controlled up each hill, then steady back down without stopping. The recoveries are short, not full.',
		purpose:
			'A rolling session that builds hill strength and the ability to hold effort on tired legs. Keep the climbs honest but never sprint, so you can finish the set.',
		targetRpe: [7, 9],
		workout: wk([
			block([step('warmup', 'Easy jog', 12 * MIN, 'Easy on flat ground to start.')]),
			block(
				[
					step(
						'work',
						'Climb',
						2 * MIN,
						'Strong and controlled. Short, quick steps, tall posture.',
						{
							targetRpe: [8, 9],
						},
					),
					step(
						'recovery',
						'Descent',
						2 * MIN,
						'Steady down, not a walk. Let the effort ease but keep moving.',
					),
				],
				7,
				'Hill loops',
			),
			block([step('cooldown', 'Easy jog', 5 * MIN, 'Flat and easy to finish.')]),
		]),
		refs: ['wave-1/2b-quality-sessions', 'wave-5/15a-running-workout-variations'],
		tags: ['run', 'hills', 'hard'],
	},
	{
		id: 'mile-repeats-50',
		title: 'Mile repeats, 50 minutes',
		modality: 'running',
		type: 'threshold',
		durationMin: 50,
		intensity: 'hard',
		summary:
			'Four hard miles, each a little quicker than you could hold for a whole race, with a short jog between.',
		purpose:
			'Holding a strong pace over a long rep builds the endurance to keep going when you are tired. Start the first rep conservatively so you can hold all four.',
		targetRpe: [7, 8],
		workout: wk([
			block([step('warmup', 'Easy jog', 12 * MIN, 'Build gradually.')]),
			block(
				[
					step(
						'work',
						'1 mile',
						6 * MIN,
						'Steady hard, not a sprint. Hold the same pace each rep.',
						{
							targetRpe: [7, 8],
							distanceM: 1609,
						},
					),
					step('recovery', 'Easy jog', 2 * MIN, 'Jog easily between reps.'),
				],
				4,
				'Reps',
			),
			block([step('cooldown', 'Easy jog', 6 * MIN, 'Ease off fully.')]),
		]),
		refs: ['wave-1/2b-quality-sessions', 'wave-3/12b-hr-zones-rpe'],
		tags: ['run', 'threshold', 'intervals'],
	},
	{
		id: 'hill-fartlek-45',
		title: 'Hill fartlek, 45 minutes',
		modality: 'running',
		type: 'fartlek',
		durationMin: 45,
		intensity: 'steady',
		summary:
			'Surges on rolling ground: take each climb hard, then ease off on the flat and the downhill. You choose the length of each surge.',
		purpose:
			'Mixes hill strength with speed play, so it builds power without a rigid structure. Surge by feel and keep the recoveries genuinely easy.',
		targetRpe: [5, 8],
		workout: wk([
			block([step('warmup', 'Easy jog', 10 * MIN, 'Easy, on the flattest ground you have.')]),
			block(
				[
					step(
						'work',
						'Hill surge',
						60,
						'Hard up the slope, then ease. Pick a landmark to reach.',
						{
							targetRpe: [7, 8],
						},
					),
					step(
						'recovery',
						'Easy jog',
						2 * MIN,
						'Jog easily on the flat or downhill until recovered.',
					),
				],
				8,
				'Surges',
			),
			block([step('work', 'Steady run', 8 * MIN, 'Relaxed and even to finish the session.')]),
			block([step('cooldown', 'Easy jog', 3 * MIN, 'Slow down gradually.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'hills', 'fartlek'],
	},
	{
		id: 'lsd-long-slow-distance-120',
		title: 'Long slow distance, 2 hours',
		modality: 'running',
		type: 'long',
		durationMin: 120,
		intensity: 'easy',
		summary:
			'Two easy hours, slow enough to talk the whole way. Eat and drink on the run once you pass an hour.',
		purpose:
			'The classic long slow distance run: time on your feet at an easy effort builds the endurance base for half and full marathons. Keep the pace almost too easy.',
		targetRpe: [3, 4],
		workout: wk([
			block([step('warmup', 'Easy jog', 10 * MIN, 'The first ten minutes should feel too easy.')]),
			block([
				step(
					'work',
					'Long slow run',
					100 * MIN,
					'Easy and even. Take fuel and fluid every 45 to 60 minutes.',
				),
			]),
			block([
				step('cooldown', 'Easy walk and jog', 10 * MIN, 'Slow down and let the heart rate drop.'),
			]),
		]),
		refs: ['wave-1/2a-aerobic-long-runs', 'wave-3/9a-fuelling-daily'],
		tags: ['run', 'endurance', 'advanced'],
	},

	// ---- Strength: named routines ----------------------------------------
	{
		id: 'five-by-five-full-body-60',
		title: 'Five by five, full body, 60 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 60,
		intensity: 'steady',
		summary:
			'Five sets of five on a squat, a deadlift, a press and a row, with heavy but controlled reps and long rests.',
		purpose:
			'Five by five builds whole-body strength, which carries into running economy. Add weight only when all five reps stay clean on every set, and rest fully between sets.',
		targetRpe: [7, 9],
		workout: wk([
			block([
				step(
					'warmup',
					'Warm-up',
					5 * MIN,
					'Easy walk, then a few light reps of each lift with no weight.',
				),
			]),
			block(
				[
					step(
						'work',
						'Barbell back squat',
						40,
						'Five reps. Brace, sit to a controlled depth, drive up.',
					),
					step('rest', 'Rest', 110, 'Rest fully. The next set should feel as strong as the last.'),
				],
				5,
				'Sets',
			),
			block(
				[
					step(
						'work',
						'Trap-bar deadlift',
						40,
						'Five reps. Push the floor away and keep the back flat.',
					),
					step('rest', 'Rest', 110, 'Rest fully before the next set.'),
				],
				5,
				'Sets',
			),
			block(
				[
					step(
						'work',
						'Dumbbell floor press',
						40,
						'Five reps. Lower until the upper arms rest on the floor.',
					),
					step('rest', 'Rest', 110, 'Rest before the next set.'),
				],
				5,
				'Sets',
			),
			block(
				[
					step(
						'work',
						'One-arm dumbbell row',
						40,
						'Five reps each side. Pull to the hip, elbow close.',
					),
					step('rest', 'Rest', 110, 'Rest, then start the other side.'),
				],
				5,
				'Sets',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Let your heart rate settle.')]),
		]),
		refs: ['wave-5/13b-barbell-kettlebell-power', 'wave-1/3b-strength-programming'],
		tags: ['strength', 'full-body', 'heavy'],
	},
	{
		id: 'nordic-hamstring-and-calf-25',
		title: 'Nordic and calf, 25 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 25,
		intensity: 'steady',
		summary:
			'Nordic curls for the hamstrings and a calf block, the two areas runners strain most often. Lower under full control.',
		purpose:
			'Nordic curls train the hamstrings hard through their lengthened range, which is linked to fewer hamstring strains. The calf work builds the tendon capacity that takes every foot strike.',
		targetRpe: [6, 8],
		workout: wk([
			block([
				step(
					'warmup',
					'Warm-up',
					4 * MIN,
					'Easy walk, then a few bodyweight glute bridges and calf raises.',
				),
			]),
			block(
				[
					step(
						'work',
						'Nordic hamstring curl',
						30,
						'Lower as slowly as you can control, then push back up.',
					),
					step(
						'work',
						'Sliding leg curl',
						40,
						'Keep the hips up as the heels slide out and pull back in.',
					),
					step('rest', 'Rest', 60, 'Rest before the next round.'),
				],
				3,
				'Rounds',
			),
			block(
				[
					step(
						'work',
						'Eccentric heel drop',
						45,
						'Each side. Lower the heel slowly, rise on both feet.',
					),
					step(
						'work',
						'Bent-knee soleus raise',
						40,
						'Knees bent, press through the ball of the foot.',
					),
					step('work', 'Single-leg calf raise', 45, 'Each side. Rise high, pause, lower slowly.'),
					step('rest', 'Rest', 60, 'Rest before the next round.'),
				],
				3,
				'Rounds',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Slow down and breathe.')]),
		]),
		refs: [
			'wave-8/11-posterior',
			'wave-5/13d-bodyweight-progressions',
			'wave-1/3a-strength-economy-injury',
		],
		tags: ['strength', 'hamstrings', 'calves'],
	},
	{
		id: 'medicine-ball-power-25',
		title: 'Medicine ball power, 25 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 25,
		intensity: 'steady',
		summary:
			'Throws, slams and jumps in short, sharp sets, with full recovery so every rep stays fast.',
		purpose:
			'Medicine ball and jump work trains the trunk and legs to produce force quickly, which supports a strong arm drive and a springy push-off. Stop when the reps slow down.',
		targetRpe: [6, 8],
		workout: wk([
			block([
				step('warmup', 'Warm-up', 5 * MIN, 'Easy jog and a few bodyweight squats and pogo hops.'),
			]),
			block(
				[
					step(
						'work',
						'Medicine-ball slam',
						30,
						'Drive the ball down with the whole trunk, not the arms.',
					),
					step(
						'work',
						'Medicine-ball chest pass',
						30,
						'Throw hard at a wall or partner, then reset.',
					),
					step('work', 'Jump squat', 30, 'Quick dip, jump tall, land softly and reset.'),
					step('work', 'Pogo hops', 20, 'Fast, small bounces off the balls of the feet.'),
					step('rest', 'Rest', 75, 'Full recovery. Quality matters more than the count.'),
				],
				5,
				'Rounds',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Settle your breathing.')]),
		]),
		refs: ['wave-5/13b-barbell-kettlebell-power', 'wave-1/3b-strength-programming'],
		tags: ['strength', 'power', 'plyometric', 'medicine-ball'],
	},

	// ---- Mobility: named routines ----------------------------------------
	{
		id: 'yoga-for-runners-25',
		title: 'Yoga for runners, 25 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 25,
		intensity: 'easy',
		summary:
			'A runner-focused flow: gentle movement for the hips, back and shoulders, a few steady poses, then slow breathing.',
		purpose:
			'Tight hips, a stiff mid-back and tense shoulders all feed into a tense stride. This flow works those areas and finishes with slow breathing to settle the system.',
		targetRpe: [2, 4],
		workout: wk([
			block(
				[
					step('warmup', 'Cat-cow', 90, 'Move the spine slowly, breathing out as you round.'),
					step(
						'warmup',
						'Downward dog',
						90,
						'Lift the hips back, press the floor away, soft knees.',
					),
					step(
						'warmup',
						"World's greatest stretch",
						60,
						'Each side. Lunge, rotate the top arm up, breathe.',
					),
				],
				1,
				'Loosen up',
			),
			block(
				[
					step(
						'work',
						'Warrior II',
						45,
						'Each side. Front knee over the toes, arms long and level.',
					),
					step(
						'work',
						'Half-kneeling hip flexor stretch',
						45,
						'Each side. Tuck the pelvis and ease forward.',
					),
					step('work', 'Single-leg balance (standing)', 30, 'Each side. Slow, steady breathing.'),
				],
				3,
				'Standing flow',
			),
			block(
				[
					step(
						'work',
						'Pigeon pose (figure-4 hip stretch)',
						45,
						'Each side. Stay tall, keep the front foot flexed.',
					),
					step(
						'work',
						'The hundred (Pilates)',
						45,
						'Pump the arms, hold the ribs down, back flat.',
					),
					step(
						'work',
						'Leg circles (Pilates)',
						30,
						'Each leg. Small circles, keep the pelvis still.',
					),
					step('work', 'Bird dog', 40, 'Each side. Reach opposite arm and leg, hips square.'),
				],
				4,
				'Floor flow',
			),
			block(
				[
					step(
						'cooldown',
						"Child's pose",
						90,
						'Sit the hips back toward the heels and breathe into the back.',
					),
					step(
						'cooldown',
						'Diaphragmatic breathing',
						150,
						'Breathe into the belly, slow and even.',
					),
				],
				1,
				'Wind down',
			),
		]),
		refs: ['wave-5/14d-yoga-pilates-breath', 'wave-3/8c-stretching-flexibility'],
		tags: ['mobility', 'yoga', 'rest-day'],
	},
	{
		id: 'race-day-warmup-20',
		title: 'Race day warm-up, 20 minutes',
		modality: 'mobility',
		type: 'drills',
		durationMin: 20,
		intensity: 'steady',
		summary:
			'The warm-up you run before a race or a hard time trial: an easy jog, dynamic drills, then a few strides to sharpen up.',
		purpose:
			'A race warm-up raises the heart rate and primes the legs, so the first hard minute feels smooth rather than shocking. Finish it about five minutes before the start.',
		targetRpe: [3, 7],
		workout: wk([
			block([
				step(
					'warmup',
					'Brisk walk or easy jog',
					6 * MIN,
					'Start easy and build over the last couple of minutes.',
				),
			]),
			block(
				[
					step(
						'warmup',
						'Leg swings (front to back)',
						30,
						'Each leg. Hold a wall, swing with control.',
					),
					step('warmup', 'Leg swings (side to side)', 30, 'Each leg. Keep the torso upright.'),
					step('warmup', 'Ankle rocks', 30, 'Each side. Knee forward over the toes, heel down.'),
					step('warmup', 'A-skips', 30, 'Quick, springy knee lifts. Stay tall.'),
					step('warmup', 'High knees', 30, 'Drive the knees up, land light and quick.'),
					step('warmup', 'Butt kicks', 30, 'Heels back toward the glutes. Stay light.'),
				],
				3,
				'Drills',
			),
			block(
				[
					step('work', 'Stride', 20, 'Build smoothly to near top speed, then ease down.', {
						targetRpe: [7, 8],
					}),
					step(
						'recovery',
						'Easy jog back',
						40,
						'Jog back easily to recover before the next stride.',
					),
				],
				5,
				'Strides',
			),
		]),
		refs: ['wave-5/14b-dynamic-mobility-drills', 'wave-3/8a-warmup-cooldown-mobility'],
		tags: ['mobility', 'pre-run', 'drills', 'race-day'],
	},

	// ---- Recovery: named routine -----------------------------------------
	{
		id: 'shakeout-jog-25',
		title: 'Shakeout jog, 25 minutes',
		modality: 'running',
		type: 'recovery',
		durationMin: 25,
		intensity: 'easy',
		summary:
			'A short, very easy jog to loosen the legs the day before a race or after travel. Slow enough that it feels almost too easy.',
		purpose:
			'A shakeout moves blood through the legs without adding training load, and helps settle the nerves before a race. Keep it short and relaxed, never a workout.',
		targetRpe: [2, 3],
		workout: wk([
			block([
				step(
					'work',
					'Very easy jog',
					20 * MIN,
					'Slower than you think. Walk any time you need to.',
				),
			]),
			block([
				step('cooldown', 'Easy walk', 5 * MIN, 'Finish with a relaxed walk and slow breathing.'),
			]),
		]),
		refs: ['wave-3/8b-recovery-modalities', 'wave-5/15a-running-workout-variations'],
		tags: ['run', 'recovery', 'race-day'],
	},
];
