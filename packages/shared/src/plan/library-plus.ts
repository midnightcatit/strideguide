/**
 * Wave-6 workout additions: a wider set of running sessions, form drills,
 * strength sessions and cross-training, lifted from the research (research/wave-5/
 * 15a running session types, 15b form drills, 16a cross-training, 13a to 13d
 * strength moves, 14b/14d mobility and breath). Same shape as the core library and
 * the wave-5 additions, so the picker, the player and the detail view need no
 * special case. No em dashes.
 */

import { block, MIN, step, wk } from './library-helpers';
import type { LibraryWorkout } from './library';

export const PLUS_WORKOUTS: LibraryWorkout[] = [
	// ---- Running: more quality sessions ----------------------------------
	{
		id: 'ladder-intervals-60',
		title: 'Ladder intervals, 60 minutes',
		modality: 'running',
		type: 'interval',
		durationMin: 60,
		intensity: 'hard',
		summary:
			'Track reps over rising and falling distances, 400 m up to 1600 m and back down, each at a controlled strong pace.',
		purpose:
			'The long middle reps teach you to hold a strong pace as fatigue builds, which is useful through a 5K to 10K block. Aim to run them all at an even effort.',
		targetRpe: [7, 9],
		workout: wk([
			block([
				step(
					'warmup',
					'Easy jog',
					15 * MIN,
					'Build gradually and add a few short strides at the end.',
				),
			]),
			block([
				step('work', '400 m', 110, '5K to 10K pace, quick and relaxed.', {
					targetRpe: [8, 9],
					distanceM: 400,
				}),
				step('recovery', 'Easy jog', 120, 'Jog easily between reps.'),
			]),
			block([
				step('work', '800 m', 220, 'Same effort as the 400, do not press.', {
					targetRpe: [7, 8],
					distanceM: 800,
				}),
				step('recovery', 'Easy jog', 120, 'Recover before the next rep.'),
			]),
			block([
				step('work', '1200 m', 330, 'Strong and even. Hold the pace you set early.', {
					targetRpe: [7, 8],
					distanceM: 1200,
				}),
				step('recovery', 'Easy jog', 120, 'Jog to recover.'),
			]),
			block([
				step('work', '1600 m', 440, 'The longest rep. Settle in and stay controlled.', {
					targetRpe: [7, 8],
					distanceM: 1600,
				}),
				step('recovery', 'Easy jog', 120, 'Recover fully before the way back down.'),
			]),
			block([
				step('work', '1200 m', 330, 'Back down the ladder. Same pace as the first one.', {
					targetRpe: [7, 8],
					distanceM: 1200,
				}),
				step('recovery', 'Easy jog', 120, 'Jog to recover.'),
			]),
			block([
				step('work', '800 m', 220, 'Hold on. Keep the form tall.', {
					targetRpe: [8, 9],
					distanceM: 800,
				}),
				step('recovery', 'Easy jog', 120, 'Last recovery.'),
			]),
			block([
				step('work', '400 m', 110, 'Finish quick and relaxed, not straining.', {
					targetRpe: [8, 9],
					distanceM: 400,
				}),
			]),
			block([step('cooldown', 'Easy jog', 10 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'intervals', 'hard'],
	},
	{
		id: 'short-30-15-intervals-40',
		title: '30/15 short intervals, 40 minutes',
		modality: 'running',
		type: 'interval',
		durationMin: 40,
		intensity: 'hard',
		summary:
			'Two sets of short 30-second hard efforts with 15-second floats, a format that holds you near the top of your aerobic range.',
		purpose:
			'Short efforts with short floats keep you near maximal oxygen uptake for longer than a few long reps, so the aerobic stimulus is high for the time. Very hard, so use it sparingly.',
		targetRpe: [8, 9],
		workout: wk([
			block([
				step(
					'warmup',
					'Easy jog',
					12 * MIN,
					'Build gradually, with a few strides to wake up the legs.',
				),
			]),
			block(
				[
					step('work', 'Hard 30 seconds', 30, 'Strong and quick. Hold form as you tire.', {
						targetRpe: [8, 9],
					}),
					step('recovery', 'Float', 15, 'Ease off, do not stop. Then go again.'),
				],
				10,
				'Set 1',
			),
			block([step('recovery', 'Easy jog', 3 * MIN, 'Jog easily to reset before set two.')]),
			block(
				[
					step('work', 'Hard 30 seconds', 30, 'Same effort as set one, even if the legs are heavy.', {
						targetRpe: [8, 9],
					}),
					step('recovery', 'Float', 15, 'Keep moving through the float.'),
				],
				10,
				'Set 2',
			),
			block([step('cooldown', 'Easy jog', 10 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/1b-intensity-zones'],
		tags: ['run', 'intervals', 'hard', 'vo2'],
	},
	{
		id: 'tabata-run-35',
		title: 'Tabata-style run, 35 minutes',
		modality: 'running',
		type: 'interval',
		durationMin: 35,
		intensity: 'hard',
		summary:
			'Short all-out efforts with very short walks, run in two sets. The hardest short session in the library.',
		purpose:
			'A sharp top-end stimulus for when time is tight. It is very hard, so use it sparingly and only when you are fresh.',
		targetRpe: [9, 10],
		workout: wk([
			block([
				step('warmup', 'Easy jog', 15 * MIN, 'Build gradually, with strides at the end.'),
			]),
			block(
				[
					step('work', 'All out', 20, 'As fast as you can hold good form.', { targetRpe: [9, 10] }),
					step('recovery', 'Walk', 10, 'Walk, breathe, then go again.'),
				],
				8,
				'Set 1',
			),
			block([step('recovery', 'Easy jog', 3 * MIN, 'Jog easily before set two.')]),
			block(
				[
					step('work', 'All out', 20, 'Same again. Hold it together.', { targetRpe: [9, 10] }),
					step('recovery', 'Walk', 10, 'Walk and breathe.'),
				],
				8,
				'Set 2',
			),
			block([step('cooldown', 'Easy jog', 10 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'intervals', 'hard'],
	},
	{
		id: 'pyramid-fartlek-45',
		title: 'Pyramid fartlek, 45 minutes',
		modality: 'running',
		type: 'fartlek',
		durationMin: 45,
		intensity: 'hard',
		summary:
			'Surges by feel of 2, 1 and half a minute, up and back down, inside one continuous run.',
		purpose:
			'Trains pace change and effort control in a flexible format that suits roads, trails and a busy day. You pick the speed, guided by how you feel.',
		targetRpe: [7, 8],
		workout: wk([
			block([step('warmup', 'Easy jog', 15 * MIN, 'Start easy and build gradually.')]),
			block([
				step('work', 'Surge 2 minutes', 2 * MIN, 'Hard but controlled.', { targetRpe: [7, 8] }),
				step('recovery', 'Easy jog', 90, 'Jog easily until you feel ready.'),
			]),
			block([
				step('work', 'Surge 1 minute', 60, 'A little quicker, still relaxed.', { targetRpe: [7, 8] }),
				step('recovery', 'Easy jog', 90, 'Ease off.'),
			]),
			block([
				step('work', 'Surge 30 seconds', 30, 'Quick and sharp.', { targetRpe: [8, 9] }),
				step('recovery', 'Easy jog', 90, 'Recover.'),
			]),
			block([
				step('work', 'Surge 1 minute', 60, 'Back up. Same as the first minute.', { targetRpe: [7, 8] }),
				step('recovery', 'Easy jog', 90, 'Ease off.'),
			]),
			block([
				step('work', 'Surge 2 minutes', 2 * MIN, 'Finish the pyramid strong but in control.', {
					targetRpe: [7, 8],
				}),
			]),
			block([step('cooldown', 'Easy jog', 10 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'fartlek', 'speed'],
	},
	{
		id: 'progression-long-run-90',
		title: 'Progression long run, 90 minutes',
		modality: 'running',
		type: 'long',
		durationMin: 90,
		intensity: 'steady',
		summary:
			'A long run that starts easy and finishes the last stretch at or just under marathon pace.',
		purpose:
			'Builds endurance while teaching a controlled finish on tired legs, the habit that pays off late in a race. Keep the early part genuinely easy.',
		targetRpe: [5, 6],
		workout: wk([
			block([step('warmup', 'Easy jog', 10 * MIN, 'Start very easy and let the pace settle.')]),
			block([
				step('work', 'Easy running', 55 * MIN, 'Relaxed and conversational the whole way.'),
			]),
			block([
				step(
					'work',
					'Marathon pace',
					25 * MIN,
					'Lift to goal pace for the finish. Hold it even and stay in control.',
					{ targetRpe: [6, 7] },
				),
			]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-1/2a-aerobic-long-runs'],
		tags: ['run', 'endurance', 'marathon'],
	},
	{
		id: 'marathon-simulation-120',
		title: 'Marathon simulation, 120 minutes',
		modality: 'running',
		type: 'race-pace',
		durationMin: 120,
		intensity: 'steady',
		summary:
			'A long run in your race kit, taking your race fuel, with long blocks at goal marathon pace.',
		purpose:
			'Rehearses pace, fuelling and kit about three to four weeks out, so nothing on race day is new. Take the fuel you plan to race with.',
		targetRpe: [6, 7],
		workout: wk([
			block([
				step('warmup', 'Easy running', 20 * MIN, 'Start easy and settle into a rhythm.'),
			]),
			block([
				step(
					'work',
					'Marathon pace',
					40 * MIN,
					'Goal race pace, even and relaxed. Practise your fuelling plan.',
					{ targetRpe: [6, 7] },
				),
			]),
			block([step('recovery', 'Easy jog', 5 * MIN, 'Float easily between the two blocks.')]),
			block([
				step(
					'work',
					'Marathon pace',
					40 * MIN,
					'Hold the same pace on tired legs. This is the point of the session.',
					{ targetRpe: [6, 7] },
				),
			]),
			block([step('cooldown', 'Easy jog', 15 * MIN, 'Ease down and walk to finish.')]),
		]),
		refs: ['wave-5/15a-running-workout-variations', 'wave-2/5a-marathon-pacing-taper'],
		tags: ['run', 'marathon', 'race-pace', 'advanced'],
	},

	// ---- Running: form and drills ----------------------------------------
	{
		id: 'posture-drills-20',
		title: 'Posture and lean drills, 20 minutes',
		modality: 'mobility',
		type: 'drills',
		durationMin: 20,
		intensity: 'easy',
		summary:
			'Wall lean, A-march and arm swing drills that train a tall posture and a light footstrike under the hips.',
		purpose:
			'Drills are skill work: they build the feel of good posture and a foot that lands under you. Keep them light and snappy and stop before they turn into a run.',
		targetRpe: [3, 5],
		workout: wk([
			block([
				step('warmup', 'Easy jog', 5 * MIN, 'Easy jog to warm up, then walk through each drill once.'),
			]),
			block(
				[
					step(
						'work',
						'Wall drill',
						20,
						'Hands on a wall, lean from the ankles, body in one straight line.',
					),
					step('work', 'A-march', 30, 'Drive the knee up and step down under the hip. Stay tall.'),
					step(
						'work',
						'Arm swing drill',
						30,
						'Elbows near 90 degrees, swing front to back, shoulders relaxed.',
					),
					step('work', 'A-skips', 30, 'Knee to hip height, snap the foot down under you.'),
					step('recovery', 'Walk back', 30, 'Walk back to the start and reset.'),
				],
				2,
				'Drill circuit',
			),
			block([step('cooldown', 'Easy jog', 4 * MIN, 'Shake the legs out.')]),
		]),
		refs: ['wave-5/15b-running-drills-mechanics'],
		tags: ['run', 'form', 'drills', 'no-equipment'],
	},
	{
		id: 'cadence-quick-feet-drills-20',
		title: 'Cadence and quick feet, 20 minutes',
		modality: 'mobility',
		type: 'drills',
		durationMin: 20,
		intensity: 'easy',
		summary:
			'Metronome cadence work and light quick-feet drills that build a quicker, quieter running rhythm.',
		purpose:
			'A slightly quicker step rate shifts load off the knee and hip, and quiet cueing lowers impact without forcing a foot strike. Nudge the rate up, do not reach for it.',
		targetRpe: [3, 5],
		workout: wk([
			block([
				step('warmup', 'Easy jog', 5 * MIN, 'Easy jog, then a few relaxed strides.'),
			]),
			block(
				[
					step(
						'work',
						'Cadence ladder',
						60,
						'Set a metronome to your step rate, then step it up about 5 percent at a time.',
					),
					step('work', 'Quick feet', 30, 'Short, quick steps. Keep the feet light and quiet.'),
					step(
						'work',
						'Quiet landing runs',
						45,
						'Run a short stretch and try to make each footfall silent.',
					),
					step(
						'work',
						'Overstriding fix',
						45,
						'Let the foot land close to under your hips. Do not reach forward.',
					),
					step('recovery', 'Walk back', 30, 'Reset before the next round.'),
				],
				2,
				'Drill circuit',
			),
			block([step('cooldown', 'Easy jog', 4 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-5/15b-running-drills-mechanics'],
		tags: ['run', 'form', 'drills', 'no-equipment'],
	},
	{
		id: 'elastic-bounds-hops-20',
		title: 'Elastic bounds and hops, 20 minutes',
		modality: 'mobility',
		type: 'drills',
		durationMin: 20,
		intensity: 'easy',
		summary:
			'Short bounds, hops and ankle work that train stiff, springy legs and quick ground contacts.',
		purpose:
			'Plyometric work has the best performance evidence of the form drills and improves running economy. Keep the volume low, land softly and stop when the spring fades.',
		targetRpe: [4, 6],
		workout: wk([
			block([
				step('warmup', 'Easy jog', 6 * MIN, 'Easy jog, then a few A-skips to wake up the legs.'),
			]),
			block(
				[
					step(
						'work',
						'Pogo hops',
						20,
						'Bounce off the balls of the feet, knees nearly straight, quick contacts.',
					),
					step(
						'work',
						'Straight-leg bounds',
						25,
						'Bound forward off each leg, landing leg nearly straight, arms driving.',
					),
					step('work', 'Ankling', 30, 'Relaxed ankles, quick and quiet off the ground.'),
					step('recovery', 'Walk back', 45, 'Walk back and reset. Full recovery before the next set.'),
				],
				3,
				'Sets',
			),
			block([step('cooldown', 'Easy jog', 4 * MIN, 'Shake the legs out.')]),
		]),
		refs: ['wave-5/15b-running-drills-mechanics'],
		tags: ['run', 'form', 'power', 'drills'],
	},

	// ---- Strength --------------------------------------------------------
	{
		id: 'glute-hip-strength-30',
		title: 'Glute and hip strength, 30 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 30,
		intensity: 'steady',
		summary:
			'Hip abduction, clam and bridge work that trains the hip muscles steering your stride.',
		purpose:
			'The hip abductors keep the pelvis level and the knee tracking straight, and they respond well to direct loading. Aim the effort at the glute, not the front of the hip.',
		targetRpe: [5, 7],
		workout: wk([
			block([
				step('warmup', 'Warm-up', 5 * MIN, 'Easy walk, then a set of bodyweight glute bridges.'),
			]),
			block(
				[
					step('work', 'Hip abduction machine', 50, 'Push the knees apart without leaning back.'),
					step(
						'work',
						'Banded clamshell',
						45,
						'Each side. Keep the feet together and the hips stacked.',
					),
					step('work', 'Mini-band lateral walk', 45, 'Each way. Stay low and keep the band tight.'),
					step('work', 'Single-leg glute bridge', 45, 'Each side. Drive the hip up and keep the pelvis level.'),
					step('work', 'Glute bridge', 45, 'Squeeze the glutes at the top, lower slowly.'),
					step('rest', 'Rest', 60, 'Rest before the next round.'),
				],
				3,
				'Rounds',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Slow down.')]),
		]),
		refs: ['wave-1/3c-bodyweight-and-machines', 'wave-5/13c-minimal-equipment-bands-home'],
		tags: ['strength', 'glutes', 'hips', 'no-gym'],
	},
	{
		id: 'posterior-chain-strength-35',
		title: 'Posterior chain strength, 35 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 35,
		intensity: 'steady',
		summary:
			'Hinge, bridge and curl work for the glutes and hamstrings that power every push-off.',
		purpose:
			'The glutes and hamstrings drive the stride and brake the landing. Loading the hinge and the knee bend covers both. Lower under control to get the most from the eccentric.',
		targetRpe: [6, 8],
		workout: wk([
			block([
				step('warmup', 'Warm-up', 6 * MIN, 'Easy walk, then a few bodyweight hip hinges.'),
			]),
			block(
				[
					step(
						'work',
						'Romanian deadlift',
						50,
						'Hinge from the hip, flat back, bar close to the legs.',
					),
					step('work', 'Barbell hip thrust', 50, 'Drive the hips up and finish with the glutes.'),
					step('work', 'Seated leg curl', 50, 'Lower slowly for a full stretch on the way back.'),
					step('work', 'Back extension', 50, 'Rise to a straight line without arching past neutral.'),
					step('rest', 'Rest', 90, 'Rest fully before the next round.'),
				],
				3,
				'Rounds',
			),
			block([step('cooldown', 'Easy walk', 6 * MIN, 'Let your heart rate settle.')]),
		]),
		refs: ['wave-5/13b-barbell-kettlebell-power', 'wave-1/3a-strength-economy-injury'],
		tags: ['strength', 'hamstrings', 'glutes'],
	},
	{
		id: 'single-leg-strength-35',
		title: 'Single-leg strength and balance, 35 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 35,
		intensity: 'steady',
		summary: 'Split squats, step-ups and single-leg hinge work, one side at a time.',
		purpose:
			'Running is one leg at a time, so single-leg strength and balance transfer directly. Control every rep and keep the hips square.',
		targetRpe: [6, 8],
		workout: wk([
			block([
				step('warmup', 'Warm-up', 6 * MIN, 'Easy walk, then a few bodyweight split squats.'),
			]),
			block(
				[
					step(
						'work',
						'Bulgarian split squat',
						50,
						'Each side. Front knee tracks over the middle toes.',
					),
					step('work', 'Dumbbell step-up', 50, 'Each side. Drive up through the top leg only.'),
					step(
						'work',
						'Single-leg Romanian deadlift',
						50,
						'Each side. Keep the hips square and the back flat.',
					),
					step('work', 'Single-leg calf raise', 50, 'Each side. Rise high, pause, lower slowly.'),
					step('rest', 'Rest', 90, 'Rest, then work the other side first next round.'),
				],
				3,
				'Rounds',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Slow down and breathe.')]),
		]),
		refs: ['wave-5/13a-dumbbell-freeweight-exercises', 'wave-1/3c-bodyweight-and-machines'],
		tags: ['strength', 'legs', 'balance'],
	},
	{
		id: 'plyometric-power-30',
		title: 'Plyometric power, 30 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 30,
		intensity: 'steady',
		summary: 'Jumps and hops that train fast, springy legs. Short, sharp sets with full recovery.',
		purpose:
			'Plyometrics improve running economy and pair well with heavier strength work. Keep the reps low, land softly, and stop when the spring fades.',
		targetRpe: [6, 8],
		workout: wk([
			block([
				step('warmup', 'Warm-up', 6 * MIN, 'Easy jog and a few bodyweight squats and pogo hops.'),
			]),
			block(
				[
					step('work', 'Jump squat', 30, 'Quick dip, jump tall, land softly and reset.'),
					step('work', 'Box jump', 30, 'Land with both feet flat on the box, stand tall.'),
					step('work', 'Pogo hops', 20, 'Fast, small bounces off the balls of the feet.'),
					step('work', 'Depth drop', 25, 'Step off a low box, land softly and rebound.'),
					step('rest', 'Rest', 90, 'Full recovery. Quality matters more than the number.'),
				],
				3,
				'Rounds',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Settle your breathing.')]),
		]),
		refs: ['wave-5/13d-bodyweight-progressions', 'wave-1/3b-strength-programming'],
		tags: ['strength', 'power', 'plyometric'],
	},
	{
		id: 'upper-body-strength-30',
		title: 'Upper body strength, 30 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 30,
		intensity: 'steady',
		summary:
			'Push and pull work for the shoulders, back and arms that hold your posture late in a run.',
		purpose:
			'A strong upper back and shoulders keep the arm swing relaxed and the torso tall when you tire. Balance the pushing with as much pulling.',
		targetRpe: [5, 7],
		workout: wk([
			block([step('warmup', 'Warm-up', 5 * MIN, 'Arm circles and a few easy push-ups.')]),
			block(
				[
					step('work', 'Push-up', 40, 'Body in one line. Lower until the chest is close to the floor.'),
					step('work', 'One-arm dumbbell row', 40, 'Each side. Pull to the hip, elbow close.'),
					step('work', 'Lat pulldown', 40, 'Pull the bar to the upper chest, elbows driving down.'),
					step('work', 'Dumbbell floor press', 40, 'Lower until the upper arms rest, then press.'),
					step('work', 'Dumbbell lateral raise', 40, 'Raise to shoulder height, lower slowly.'),
					step('work', 'Plank', 40, 'Breathe steadily and keep the body in one line.'),
					step('rest', 'Rest', 60, 'Breathe before the next round.'),
				],
				2,
				'Circuit',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Settle your breathing.')]),
		]),
		refs: ['wave-5/13a-dumbbell-freeweight-exercises', 'wave-1/3c-bodyweight-and-machines'],
		tags: ['strength', 'upper-body', 'core'],
	},
	{
		id: 'groin-adductor-strength-25',
		title: 'Groin and adductor strength, 25 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 25,
		intensity: 'steady',
		summary:
			'Adductor work, including the Copenhagen plank, that builds the inner-thigh strength linked to fewer groin problems.',
		purpose:
			'An adductor programme built on the Copenhagen exercise cut groin problems in sport. Start with short holds and build slowly, since the first sessions make you sore.',
		targetRpe: [6, 8],
		workout: wk([
			block([
				step('warmup', 'Warm-up', 5 * MIN, 'Easy walk, then a few bodyweight squats and glute bridges.'),
			]),
			block(
				[
					step('work', 'Hip adduction machine', 45, 'Squeeze the legs together under control.'),
					step(
						'work',
						'Copenhagen adductor plank',
						20,
						'Each side. Hold the hips up; lower the bottom leg only as far as you can control.',
					),
					step('work', 'Side plank', 40, 'Each side. Stack the hips and do not let them drop.'),
					step(
						'work',
						'Banded clamshell',
						45,
						'Each side. Keep the feet together and the pelvis still.',
					),
					step('work', 'Suitcase carry', 45, 'Each side. Walk tall without letting the loaded side drop.'),
					step('rest', 'Rest', 60, 'Rest before the next round.'),
				],
				2,
				'Rounds',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Slow down.')]),
		]),
		refs: ['wave-5/13e-machine-catalog-additions', 'wave-1/3a-strength-economy-injury'],
		tags: ['strength', 'adductors', 'injury'],
	},

	// ---- Cross-training --------------------------------------------------
	{
		id: 'bike-tempo-45',
		title: 'Steady bike tempo, 45 minutes',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 45,
		intensity: 'steady',
		summary:
			'A sustained ride at an effort you can hold with short sentences, breathing deep but controlled.',
		purpose:
			'Carries real aerobic work while you cut running impact, and stands in for a steady run when a niggle calls for a lighter day on the legs.',
		targetRpe: [5, 7],
		workout: wk([
			block([step('warmup', 'Easy spin', 10 * MIN, 'Light resistance, build to a comfortable effort.')]),
			block([
				step(
					'work',
					'Steady ride',
					30 * MIN,
					'Even effort, smooth cadence. Nose breathing where you can.',
				),
			]),
			block([step('cooldown', 'Easy spin', 5 * MIN, 'Wind down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'bike'],
	},
	{
		id: 'road-bike-endurance-75',
		title: 'Road bike endurance, 75 minutes',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 75,
		intensity: 'steady',
		summary: 'A longer ride at a comfortable aerobic effort, smooth cadence and even effort on the flats.',
		purpose:
			'Builds aerobic base with no running impact, useful in a base block or when running volume is being held back.',
		targetRpe: [5, 6],
		workout: wk([
			block([step('warmup', 'Easy spin', 10 * MIN, 'Start easy and find a smooth rhythm.')]),
			block([
				step('work', 'Steady ride', 55 * MIN, 'Hold an even aerobic effort. Eat if the ride is long.'),
			]),
			block([step('cooldown', 'Easy spin', 10 * MIN, 'Ease off and spin the legs out.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities', 'wave-1/2a-aerobic-long-runs'],
		tags: ['cross-train', 'bike', 'endurance'],
	},
	{
		id: 'row-intervals-25',
		title: 'Row intervals, 25 minutes',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 25,
		intensity: 'hard',
		summary:
			'Hard short efforts on the rower with easy paddling between, the legs and back driving each stroke.',
		purpose:
			'A high aerobic stimulus in little time with no running impact. Good for a hard day without the pounding.',
		targetRpe: [7, 9],
		workout: wk([
			block([step('warmup', 'Easy row', 5 * MIN, 'Long, smooth strokes to warm up.')]),
			block(
				[
					step('work', 'Hard stroke set', 60, 'Hard but controlled. Push with the legs first.', {
						targetRpe: [7, 9],
					}),
					step('recovery', 'Easy row', 60, 'Paddle easily to recover.'),
				],
				8,
				'Efforts',
			),
			block([step('cooldown', 'Easy row', 4 * MIN, 'Slow the rate down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'row', 'hard'],
	},
	{
		id: 'stair-climb-intervals-25',
		title: 'Stair climb intervals, 25 minutes',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 25,
		intensity: 'hard',
		summary: 'Hard climbs on stairs or the stair machine with an easy descent or flat recovery between.',
		purpose:
			'A short, time-efficient aerobic hit. Best if your calves, Achilles and lower legs are not sore, since it loads those areas.',
		targetRpe: [7, 9],
		workout: wk([
			block([step('warmup', 'Easy climb', 5 * MIN, 'Slow pace to warm up.')]),
			block(
				[
					step('work', 'Hard climb', 90, 'Strong and controlled. Stand tall, light hands.', {
						targetRpe: [7, 9],
					}),
					step('recovery', 'Easy descent', 90, 'Walk or climb down slowly to recover.'),
				],
				5,
				'Efforts',
			),
			block([step('cooldown', 'Easy climb', 5 * MIN, 'Slow the pace down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'stairs', 'hard'],
	},
	{
		id: 'ski-erg-intervals-30',
		title: 'Ski erg intervals, 30 minutes',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 30,
		intensity: 'hard',
		summary: 'Hard pulls on the ski erg with easy recovery between, driving down with the whole body.',
		purpose:
			'Whole-body aerobic work with no impact, a strong winter option when you want intensity without running.',
		targetRpe: [7, 8],
		workout: wk([
			block([step('warmup', 'Easy ski', 8 * MIN, 'Long, smooth pulls to warm up.')]),
			block(
				[
					step('work', 'Hard pulls', 60, 'Powerful and rhythmic. Drive down with the whole body.', {
						targetRpe: [7, 8],
					}),
					step('recovery', 'Easy ski', 60, 'Easy pulls to recover.'),
				],
				8,
				'Efforts',
			),
			block([step('cooldown', 'Easy ski', 6 * MIN, 'Ease down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'ski', 'hard'],
	},
	{
		id: 'cross-country-ski-60',
		title: 'Cross-country ski, 60 minutes',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 60,
		intensity: 'steady',
		summary: 'A steady ski or roller ski at an even aerobic effort, gliding and striding with rhythm.',
		purpose:
			'Builds a large aerobic base with no running impact. Ideal in winter as a running substitute or a supplement.',
		targetRpe: [5, 7],
		workout: wk([
			block([step('warmup', 'Easy ski', 10 * MIN, 'Start easy and find your rhythm.')]),
			block([
				step('work', 'Steady ski', 40 * MIN, 'Even aerobic effort. Glide and stride smoothly.'),
			]),
			block([step('cooldown', 'Easy ski', 10 * MIN, 'Ease down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'ski', 'endurance'],
	},
	{
		id: 'aqua-run-maintenance-45',
		title: 'Aqua run maintenance, 45 minutes',
		modality: 'recovery',
		type: 'cross-train',
		durationMin: 45,
		intensity: 'steady',
		summary:
			'A steady pool run at a real running effort: quick cadence, full leg cycle, effort controlled but honest.',
		purpose:
			'The closest running substitute during an impact injury. It holds aerobic fitness and the running motion when you cannot run on land. Set effort by feel, since pool heart rate runs a little lower.',
		targetRpe: [6, 7],
		workout: wk([
			block([
				step(
					'warmup',
					'Easy aqua jog',
					7 * MIN,
					'Upright posture, quick leg turnover, find a rhythm.',
				),
			]),
			block(
				[
					step('work', 'Steady aqua jog', 4 * MIN, 'Copy your running cadence at a harder effort.', {
						targetRpe: [6, 7],
					}),
					step('recovery', 'Easy aqua jog', 2 * MIN, 'Ease back down.'),
				],
				6,
				'Efforts',
			),
			block([step('cooldown', 'Easy aqua jog', 2 * MIN, 'Wind down.')]),
		]),
		refs: ['wave-5/16a-cross-training-modalities'],
		tags: ['cross-train', 'aqua-run', 'low-impact', 'injury'],
	},

	// ---- Mobility --------------------------------------------------------
	{
		id: 'dynamic-warmup-ramp-12',
		title: 'Dynamic warm-up, 12 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 12,
		intensity: 'easy',
		summary:
			'A raise, activate and mobilise warm-up that gets the hips, ankles and shoulders ready to run.',
		purpose:
			'Dynamic movement before running raises muscle temperature and takes the joints through their range. It beats long static holds before a run, which can cost power.',
		targetRpe: [2, 4],
		workout: wk([
			block(
				[
					step('warmup', 'Easy jog', 3 * MIN, 'Easy jog to raise your temperature.'),
					step('warmup', 'High knees', 30, 'Quick, tall, fast feet.'),
					step('warmup', 'Butt kicks', 30, 'Heels to the glutes, stay light.'),
				],
				1,
				'Raise',
			),
			block(
				[
					step('warmup', 'Leg swings, front to back', 40, 'Hold a wall. Swing gently, build the range.'),
					step('warmup', 'Hip circles', 40, 'Slow, controlled circles in both directions.'),
					step('warmup', 'Ankle rocks', 40, 'Knee toward the wall, heel down, gentle rocks.'),
					step('warmup', 'Arm circles', 30, 'Small to large, both directions.'),
				],
				1,
				'Activate',
			),
			block(
				[
					step('warmup', 'Inchworm', 40, 'Walk the hands out, then walk the feet to the hands.'),
					step('warmup', "World's greatest stretch", 45, 'Lunge, rotate the top arm up, breathe.'),
					step('warmup', 'A-skips', 30, 'Knee to hip height, snap the foot down under you.'),
				],
				1,
				'Mobilise',
			),
		]),
		refs: ['wave-5/14b-dynamic-mobility-drills', 'wave-3/8a-warmup-cooldown-mobility'],
		tags: ['mobility', 'pre-run', 'no-equipment'],
	},
	{
		id: 'pilates-core-25',
		title: 'Pilates core control, 25 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 25,
		intensity: 'easy',
		summary: 'Slow Pilates-style trunk work that builds control of the deep core and hips.',
		purpose:
			'Pilates improves core control and balance without heavy load. Move slowly, breathe steadily and keep the lower back calm.',
		targetRpe: [2, 4],
		workout: wk([
			block(
				[
					step('warmup', 'The hundred', 90, 'Small, quick arm pulses with a steady breath pattern.'),
					step('cooldown', 'Leg circles', 90, 'Each side. Keep the trunk still as the leg circles.'),
				],
				1,
				'Warm-up',
			),
			block(
				[
					step('cooldown', 'Dead bug', 60, 'Keep the lower back flat as you move the limbs.'),
					step('cooldown', 'Bird dog', 60, 'Reach opposite arm and leg, stay level and slow.'),
					step(
						'cooldown',
						'Single-leg glute bridge',
						60,
						'Each side. Drive the hip up and keep the pelvis level.',
					),
					step('cooldown', 'Side plank', 45, 'Each side. Stack the hips, do not let them drop.'),
				],
				2,
				'Control',
			),
			block([
				step('cooldown', 'Diaphragmatic breathing', 120, 'Breathe into the belly, slow and even.'),
			]),
		]),
		refs: ['wave-5/14d-yoga-pilates-breath'],
		tags: ['mobility', 'core', 'pilates', 'no-equipment'],
	},
	// ---- Fun and viral formats (wave-6) ----------------------------------
	{
		id: 'ten-twenty-thirty-35',
		title: '10-20-30 intervals, 35 minutes',
		modality: 'running',
		type: 'interval',
		durationMin: 35,
		intensity: 'hard',
		summary:
			'Three sets of five rounds, each round 30 seconds easy, 20 seconds steady, 10 seconds quick, with an easy jog between sets.',
		purpose:
			'The 10-20-30 format raised VO2max about 4 percent and cut 5K times in a controlled study, on roughly half the usual training volume. The 10-second bursts are short enough to stay sharp, which is the point of the format.',
		targetRpe: [7, 9],
		workout: wk([
			block([step('warmup', 'Easy jog', 12 * MIN, 'Build gradually and add a few short strides.')]),
			block(
				[
					step('work', '30 s easy', 30, 'Relaxed, a slow jog.'),
					step('work', '20 s steady', 20, 'Comfortably hard, controlled.'),
					step('work', '10 s quick', 10, 'Fast but relaxed, not a sprint.'),
				],
				5,
				'Round',
			),
			block([step('rest', 'Easy jog', 2 * MIN, 'Recover before the next set.')], 3, 'Set'),
			block([step('cooldown', 'Easy jog', 8 * MIN, 'Let your heart rate come down.')]),
		]),
		refs: ['wave-6/16a-viral-and-fun-formats'],
		tags: ['running', 'interval', 'vo2max'],
	},
	{
		id: 'ruck-walk-40',
		title: 'Ruck walk, 40 minutes',
		modality: 'walking',
		type: 'walk',
		durationMin: 40,
		intensity: 'steady',
		summary:
			'A steady walk with a loaded pack at about 10 to 15 percent of your body weight, brisk enough to talk in short sentences.',
		purpose:
			'Carrying a pack raises the aerobic cost of walking by about 10 to 30 percent at the same pace, without the impact of running. Load-carriage research supports building it up over weeks, and the injury data argues for keeping the load moderate.',
		targetRpe: [4, 6],
		workout: wk([
			block([step('warmup', 'Walk, no pack', 5 * MIN, 'Start light before you shoulder the pack.')]),
			block([
				step('work', 'Ruck walk', 30 * MIN, 'Steady pace, tall posture, pack snug to your back.'),
			]),
			block([step('cooldown', 'Walk, pack off', 5 * MIN, 'Ease off and let your breathing settle.')]),
		]),
		refs: ['wave-6/16a-viral-and-fun-formats'],
		tags: ['walking', 'rucking', 'low-impact', 'strength-endurance'],
	},
	{
		id: 'cozy-cardio-30',
		title: 'Cozy cardio, 30 minutes',
		modality: 'walking',
		type: 'walk',
		durationMin: 30,
		intensity: 'easy',
		summary:
			'A gentle indoor walk you can do while a show plays, at a pace that never feels like a workout.',
		purpose:
			'The point is low-effort movement you will actually do. Easy walking has solid cardiovascular and metabolic support, and it is the low-impact counterpart to the running in your plan.',
		targetRpe: [2, 4],
		workout: wk([
			block([
				step('work', 'Easy walk', 30 * MIN, 'Comfortable and unhurried. You should be able to chat.'),
			]),
		]),
		refs: ['wave-6/16a-viral-and-fun-formats'],
		tags: ['walking', 'easy', 'low-impact', 'habit'],
	},
];
