/**
 * Workout library: the sessions a user can add to their calendar beyond the plan.
 * Each entry is a complete, plain-English workout. Steps use the same shape the
 * engine builds, so the detail and player screens render them with no special case.
 *
 * Refs point at research files under research/ (the explanation ids). Only real
 * ids are used; an empty list means no single file fits and the summary says why.
 */

import type { Modality, StructuredWorkout } from '../types';
import { block, MIN, step, wk } from './library-helpers';
import { EXTRA_WORKOUTS } from './library-extra';
import { PLUS_WORKOUTS } from './library-plus';
import { mobilityRoutine, mobilityWorkout } from './mobility';
import { focusRoutine, type StretchFocus } from './mobility-plan';

export interface LibraryWorkout {
	id: string;
	title: string;
	modality: Modality;
	type: string;
	durationMin: number;
	intensity: 'easy' | 'steady' | 'hard';
	/** One plain sentence: what it is and how it should feel. */
	summary: string;
	/** One or two plain sentences: why you would do it. */
	purpose: string;
	targetRpe?: [number, number];
	workout: StructuredWorkout;
	/** Research explanation ids this workout draws on. */
	refs: string[];
	tags: string[];
}

const CORE_WORKOUTS: LibraryWorkout[] = [
	// ---- Walks ------------------------------------------------------------
	{
		id: 'brisk-walk-30',
		title: 'Brisk walk, 30 minutes',
		modality: 'walking',
		type: 'walk',
		durationMin: 30,
		intensity: 'easy',
		summary:
			'A steady walk at a pace where you can talk in full sentences but would not want to sing.',
		purpose:
			'Builds easy aerobic time without adding running impact, and is a good day after a hard session.',
		targetRpe: [3, 4],
		workout: wk([
			block([step('warmup', 'Easy walk', 5 * MIN, 'Start slow and let your breathing settle.')]),
			block([
				step(
					'work',
					'Brisk walk',
					20 * MIN,
					'Swing the arms and stand tall. You should be breathing a bit harder.',
				),
			]),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Slow down and let your heart rate drop.')]),
		]),
		refs: ['wave-3/8b-recovery-modalities'],
		tags: ['walk', 'no-equipment', 'beginner'],
	},
	{
		id: 'hill-walk-40',
		title: 'Hill walk, 40 minutes',
		modality: 'walking',
		type: 'walk',
		durationMin: 40,
		intensity: 'steady',
		summary: 'A walk that includes a few climbs, with a steady, controlled effort on the way up.',
		purpose: 'Builds hip and calf strength and aerobic effort with less impact than hill running.',
		targetRpe: [4, 5],
		workout: wk([
			block([step('warmup', 'Easy walk', 5 * MIN, 'Flat ground to warm up.')]),
			block(
				[
					step('work', 'Climb', 2 * MIN, 'Shorter steps, lean slightly forward from the ankles.'),
					step('recovery', 'Easy descent', 2 * MIN, 'Walk down relaxed and let the legs recover.'),
				],
				5,
				'Hill loops',
			),
			block([step('cooldown', 'Flat walk', 10 * MIN, 'Flat ground and easy breathing.')]),
		]),
		refs: ['wave-3/8b-recovery-modalities'],
		tags: ['walk', 'hills', 'no-equipment'],
	},
	{
		id: 'recovery-walk-20',
		title: 'Recovery walk, 20 minutes',
		modality: 'walking',
		type: 'walk',
		durationMin: 20,
		intensity: 'easy',
		summary: 'A slow, relaxed walk. The goal is to move, not to work.',
		purpose: 'Keeps blood flowing to tired legs the day after hard work, which helps you recover.',
		targetRpe: [2, 3],
		workout: wk([
			block([
				step('work', 'Relaxed walk', 20 * MIN, 'Easy and unhurried. Stop if anything hurts.'),
			]),
		]),
		refs: ['wave-3/8b-recovery-modalities'],
		tags: ['walk', 'recovery', 'no-equipment'],
	},
	{
		id: 'walk-run-intro-25',
		title: 'Walk-run intro, 25 minutes',
		modality: 'running',
		type: 'walk-run',
		durationMin: 25,
		intensity: 'easy',
		summary: 'Alternate one minute of easy running with two minutes of walking, eight times.',
		purpose:
			'Builds running fitness gradually, so your legs and lungs adapt without a big jump in load.',
		targetRpe: [3, 5],
		workout: wk([
			block([step('warmup', 'Walk', 5 * MIN, 'Brisk walk to start.')]),
			block(
				[
					step(
						'work',
						'Easy run',
						1 * MIN,
						'Run slowly enough to talk. This should feel easy, not fast.',
					),
					step('recovery', 'Walk', 2 * MIN, 'Walk to recover fully before the next run.'),
				],
				8,
				'Run-walk',
			),
			block([step('cooldown', 'Walk', 5 * MIN, 'Easy walk to finish.')]),
		]),
		refs: ['wave-2/7b-beginner-progression'],
		tags: ['run', 'beginner', 'no-equipment'],
	},

	// ---- Runs -------------------------------------------------------------
	{
		id: 'easy-run-30',
		title: 'Easy run, 30 minutes',
		modality: 'running',
		type: 'easy',
		durationMin: 30,
		intensity: 'easy',
		summary: 'A relaxed run where you can speak in full sentences the whole way.',
		purpose:
			'Builds the aerobic base that every other session depends on, with low stress on the body.',
		targetRpe: [3, 4],
		workout: wk([
			block([step('warmup', 'Easy jog', 3 * MIN, 'Start very slow and let the pace come up.')]),
			block([
				step('work', 'Easy run', 24 * MIN, 'Run at a pace where you could chat. Slower is fine.'),
			]),
			block([step('cooldown', 'Easy jog', 3 * MIN, 'Gentle jog, then walk if you need to.')]),
		]),
		refs: ['wave-1/2a-aerobic-long-runs'],
		tags: ['run', 'aerobic'],
	},
	{
		id: 'easy-run-45',
		title: 'Easy run, 45 minutes',
		modality: 'running',
		type: 'easy',
		durationMin: 45,
		intensity: 'easy',
		summary: 'A longer easy run at the same relaxed effort, for building time on your feet.',
		purpose: 'Adds aerobic volume gradually. Keep the effort easy even when the run feels short.',
		targetRpe: [3, 4],
		workout: wk([
			block([step('warmup', 'Easy jog', 5 * MIN, 'Start very slow.')]),
			block([step('work', 'Easy run', 35 * MIN, 'Hold the same easy effort the whole way.')]),
			block([step('cooldown', 'Easy jog', 5 * MIN, 'Finish gently.')]),
		]),
		refs: ['wave-1/2a-aerobic-long-runs'],
		tags: ['run', 'aerobic'],
	},
	{
		id: 'recovery-jog-20',
		title: 'Recovery jog, 20 minutes',
		modality: 'running',
		type: 'recovery',
		durationMin: 20,
		intensity: 'easy',
		summary: 'A very slow jog, slow enough that it can feel almost too easy.',
		purpose: 'Keeps you moving after hard days and eases you back into running after a break.',
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
		]),
		refs: ['wave-3/8b-recovery-modalities'],
		tags: ['run', 'recovery'],
	},
	{
		id: 'steady-run-40',
		title: 'Steady run, 40 minutes',
		modality: 'running',
		type: 'steady',
		durationMin: 40,
		intensity: 'steady',
		summary: 'A run at a comfortable, even pace, a little quicker than easy but still controlled.',
		purpose:
			'Teaches your body to hold a steady pace for longer, a skill that transfers to race day.',
		targetRpe: [4, 5],
		workout: wk([
			block([step('warmup', 'Easy jog', 5 * MIN, 'Start easy.')]),
			block([
				step(
					'work',
					'Steady run',
					30 * MIN,
					'Comfortably controlled. You can speak in short phrases.',
				),
			]),
			block([step('cooldown', 'Easy jog', 5 * MIN, 'Ease off the pace.')]),
		]),
		refs: ['wave-1/2a-aerobic-long-runs', 'wave-1/2b-quality-sessions'],
		tags: ['run', 'aerobic'],
	},
	{
		id: 'long-run-60',
		title: 'Long run, 60 minutes',
		modality: 'running',
		type: 'long',
		durationMin: 60,
		intensity: 'easy',
		summary: 'A long, easy run at a pace you could hold for an hour without strain.',
		purpose:
			'Builds endurance, the strongest single driver of distance performance. Keep it easy so you can do the next one.',
		targetRpe: [4, 5],
		workout: wk([
			block([
				step(
					'warmup',
					'Easy jog',
					5 * MIN,
					'Start slow. The first 10 minutes should feel too easy.',
				),
			]),
			block([step('work', 'Long run', 50 * MIN, 'Easy and steady. Drink water if it is warm.')]),
			block([step('cooldown', 'Easy walk and jog', 5 * MIN, 'Slow down gradually.')]),
		]),
		refs: ['wave-1/2a-aerobic-long-runs', 'wave-3/9a-fuelling-daily'],
		tags: ['run', 'endurance'],
	},
	{
		id: 'long-run-90',
		title: 'Long run, 90 minutes',
		modality: 'running',
		type: 'long',
		durationMin: 90,
		intensity: 'easy',
		summary: 'A long run for experienced runners. Pace stays easy from start to finish.',
		purpose:
			'Builds the endurance needed for half and full marathons. Eat and drink on the run if it goes past an hour.',
		targetRpe: [4, 5],
		workout: wk([
			block([step('warmup', 'Easy jog', 5 * MIN, 'Start very easy.')]),
			block([
				step(
					'work',
					'Long run',
					80 * MIN,
					'Hold the same easy effort. Fuel every 45 to 60 minutes if you can.',
				),
			]),
			block([step('cooldown', 'Easy walk and jog', 5 * MIN, 'Finish gently.')]),
		]),
		refs: ['wave-1/2a-aerobic-long-runs', 'wave-3/9a-fuelling-daily'],
		tags: ['run', 'endurance', 'advanced'],
	},
	{
		id: 'strides-30',
		title: 'Easy run with strides, 30 minutes',
		modality: 'running',
		type: 'strides',
		durationMin: 30,
		intensity: 'easy',
		summary: 'An easy run that ends with six short, fast strides, each about 20 seconds long.',
		purpose:
			'Keeps leg speed and running form sharp without adding fatigue. A stride is a relaxed build to near top speed, not a sprint.',
		targetRpe: [3, 5],
		workout: wk([
			block([step('warmup', 'Easy jog', 5 * MIN, 'Start easy.')]),
			block([step('work', 'Easy run', 17 * MIN, 'Easy and relaxed.')]),
			block(
				[
					step(
						'work',
						'Stride',
						20,
						'Build smoothly over 10 seconds, then hold a relaxed, fast form. Do not sprint.',
						{
							targetRpe: [7, 8],
						},
					),
					step('recovery', 'Walk', 60, 'Walk fully to recover before the next stride.'),
				],
				6,
				'Strides',
			),
			block([step('cooldown', 'Easy jog', 3 * MIN, 'Finish easy.')]),
		]),
		refs: ['wave-1/2b-quality-sessions'],
		tags: ['run', 'speed', 'form'],
	},
	{
		id: 'fartlek-35',
		title: 'Fartlek, 35 minutes',
		modality: 'running',
		type: 'fartlek',
		durationMin: 35,
		intensity: 'steady',
		summary:
			'Unplanned surges of faster running mixed into an easy run. You choose when and how hard, guided by how you feel.',
		purpose:
			'Builds speed and mental flexibility in a relaxed way. "Fartlek" is Swedish for speed play.',
		targetRpe: [4, 7],
		workout: wk([
			block([step('warmup', 'Easy jog', 5 * MIN, 'Start easy.')]),
			block(
				[
					step(
						'work',
						'Surge',
						45,
						'Run hard for about 45 seconds, then ease off. Pick a landmark to surge to.',
						{
							targetRpe: [7, 8],
						},
					),
					step('recovery', 'Easy jog', 90, 'Jog easily until you feel ready for the next surge.'),
				],
				8,
				'Surges',
			),
			block([step('cooldown', 'Easy jog', 5 * MIN, 'Finish easy.')]),
		]),
		refs: ['wave-1/2b-quality-sessions'],
		tags: ['run', 'speed'],
	},
	{
		id: 'tempo-30',
		title: 'Tempo run, 30 minutes',
		modality: 'running',
		type: 'tempo',
		durationMin: 30,
		intensity: 'hard',
		summary: 'Fifteen minutes at a comfortably hard pace, between easy running and a race effort.',
		purpose:
			'Raises the pace you can hold before fatigue builds, which makes race pace feel easier.',
		targetRpe: [6, 7],
		workout: wk([
			block([step('warmup', 'Easy jog', 10 * MIN, 'Start easy and build gradually.')]),
			block([
				step(
					'work',
					'Tempo',
					15 * MIN,
					'Comfortably hard. Breathing is steady, and you can say a few words.',
					{
						targetRpe: [6, 7],
					},
				),
			]),
			block([step('cooldown', 'Easy jog', 5 * MIN, 'Ease off fully.')]),
		]),
		refs: ['wave-1/2b-quality-sessions', 'wave-3/12b-hr-zones-rpe'],
		tags: ['run', 'threshold'],
	},
	{
		id: 'threshold-intervals-40',
		title: 'Threshold intervals, 40 minutes',
		modality: 'running',
		type: 'threshold',
		durationMin: 40,
		intensity: 'hard',
		summary:
			'Four 5-minute efforts at a steady hard pace, each with 2 minutes of easy jogging between.',
		purpose:
			'Builds the ability to sustain a hard pace for longer. Hold the effort steady across all four.',
		targetRpe: [6, 7],
		workout: wk([
			block([step('warmup', 'Easy jog', 10 * MIN, 'Build gradually.')]),
			block(
				[
					step(
						'work',
						'Threshold effort',
						5 * MIN,
						'Steady and hard, but controlled. Do not start too fast.',
						{
							targetRpe: [6, 7],
						},
					),
					step('recovery', 'Easy jog', 2 * MIN, 'Jog easily to recover.'),
				],
				4,
				'Efforts',
			),
			block([step('cooldown', 'Easy jog', 6 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-1/2b-quality-sessions', 'wave-3/12b-hr-zones-rpe'],
		tags: ['run', 'threshold', 'intervals'],
	},
	{
		id: 'vo2-intervals-40',
		title: 'Hard intervals, 40 minutes',
		modality: 'running',
		type: 'interval',
		durationMin: 40,
		intensity: 'hard',
		summary:
			'Five 3-minute hard efforts with 2 minutes of easy jogging between. The hard parts are short and tough.',
		purpose: 'Raises your maximum aerobic capacity, which lifts the ceiling on every other pace.',
		targetRpe: [8, 9],
		workout: wk([
			block([
				step(
					'warmup',
					'Easy jog',
					10 * MIN,
					'Build gradually and include a few strides at the end.',
				),
			]),
			block(
				[
					step(
						'work',
						'Hard effort',
						3 * MIN,
						'Hard but controlled, about 8 to 9 out of 10. Keep the form tall.',
						{
							targetRpe: [8, 9],
						},
					),
					step('recovery', 'Easy jog', 2 * MIN, 'Jog to recover. Breathing should come back down.'),
				],
				5,
				'Efforts',
			),
			block([step('cooldown', 'Easy jog', 8 * MIN, 'Easy to finish.')]),
		]),
		refs: ['wave-1/2b-quality-sessions', 'wave-1/1b-intensity-zones'],
		tags: ['run', 'intervals', 'hard'],
	},
	{
		id: 'hill-reps-40',
		title: 'Hill reps, 40 minutes',
		modality: 'running',
		type: 'hills',
		durationMin: 40,
		intensity: 'hard',
		summary: 'Eight 60-second hard climbs, walking or jogging back down to recover.',
		purpose: 'Builds leg strength and running power with less pounding than flat speed work.',
		targetRpe: [8, 9],
		workout: wk([
			block([step('warmup', 'Easy jog', 10 * MIN, 'Easy, on flat ground.')]),
			block(
				[
					step(
						'work',
						'Climb',
						60,
						'Drive up the hill with short, quick steps. Keep the upper body relaxed.',
						{
							targetRpe: [8, 9],
						},
					),
					step(
						'recovery',
						'Walk down',
						90,
						'Walk down slowly. Let the heart rate drop before the next climb.',
					),
				],
				8,
				'Hill reps',
			),
			block([step('cooldown', 'Easy jog', 8 * MIN, 'Flat ground to finish.')]),
		]),
		refs: ['wave-1/2b-quality-sessions'],
		tags: ['run', 'hills', 'power'],
	},
	{
		id: 'progression-run-40',
		title: 'Progression run, 40 minutes',
		modality: 'running',
		type: 'progression',
		durationMin: 40,
		intensity: 'steady',
		summary:
			'Start easy, then get a little faster in three stages. Finish the last stage still in control.',
		purpose:
			'Teaches you to run the second half stronger than the first, a habit that helps in every race.',
		targetRpe: [4, 6],
		workout: wk([
			block([step('warmup', 'Easy jog', 5 * MIN, 'Start easy.')]),
			block([step('work', 'Easy', 15 * MIN, 'Relaxed and easy.')]),
			block([step('work', 'Steady', 15 * MIN, 'A little quicker, still comfortable.')]),
			block([
				step(
					'work',
					'Faster',
					10 * MIN,
					'Noticeably quicker, but you could still talk in short phrases.',
					{
						targetRpe: [6, 7],
					},
				),
			]),
			block([step('cooldown', 'Easy jog', 5 * MIN, 'Finish easy.')]),
		]),
		refs: ['wave-1/2a-aerobic-long-runs'],
		tags: ['run', 'pacing'],
	},

	// ---- Strength (bodyweight) -------------------------------------------
	{
		id: 'bodyweight-full-body-25',
		title: 'Full-body bodyweight circuit, 25 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 25,
		intensity: 'steady',
		summary:
			'Two rounds of six moves that cover legs, push, pull, hips and core. No equipment needed.',
		purpose:
			'Builds the strength that holds your form when you tire. Bodyweight moves are easy to repeat and to progress.',
		targetRpe: [6, 7],
		workout: wk([
			block([step('warmup', 'Warm-up', 5 * MIN, 'March, then walk through the moves slowly.')]),
			block(
				[
					step('work', 'Bodyweight squat', 45, 'Feet shoulder-width. Knees track over the toes.'),
					step(
						'work',
						'Push-up',
						45,
						'Body in one line. Lower until your chest is close to the floor.',
					),
					step('work', 'Inverted row', 45, 'Under a sturdy table or bar. Body straight.'),
					step('work', 'Glute bridge', 45, 'Drive the hips up and squeeze at the top.'),
					step('work', 'Plank', 45, 'Elbows under shoulders. Breathe steadily.'),
					step('work', 'Dead bug', 45, 'Keep the lower back flat. Move slowly.'),
					step('rest', 'Rest', 60, 'Breathe and get ready for the next round.'),
				],
				2,
				'Circuit',
			),
			block([step('cooldown', 'Easy walk', 4 * MIN, 'Let your heart rate settle.')]),
		]),
		refs: ['wave-1/3c-bodyweight-and-machines', 'wave-1/3b-strength-programming'],
		tags: ['strength', 'no-equipment', 'full-body'],
	},
	{
		id: 'lower-body-strength-30',
		title: 'Lower-body strength, 30 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 30,
		intensity: 'steady',
		summary:
			'Three sets each of split squats, single-leg RDLs, glute bridges and calf raises, one side at a time.',
		purpose:
			'Strong legs and single-leg control are what keep running form steady on hills and when you tire.',
		targetRpe: [6, 8],
		workout: wk([
			block([
				step('warmup', 'Warm-up', 5 * MIN, 'Easy walk, then a few squats and glute bridges.'),
			]),
			block(
				[
					step(
						'work',
						'Split squat',
						60,
						'Each side. Drop the back knee toward the floor, torso tall.',
					),
					step(
						'work',
						'Single-leg RDL',
						60,
						'Each side. Hinge from the hip and keep the back flat.',
					),
					step('work', 'Glute bridge', 60, 'Squeeze the glutes at the top, lower slowly.'),
					step('work', 'Calf raise', 45, 'Rise high, pause, then lower slowly for a full stretch.'),
					step('rest', 'Rest', 90, 'Rest well between sets.'),
				],
				3,
				'Sets',
			),
			block([step('cooldown', 'Easy walk', 5 * MIN, 'Slow down gradually.')]),
		]),
		refs: ['wave-1/3c-bodyweight-and-machines', 'wave-1/3a-strength-economy-injury'],
		tags: ['strength', 'legs', 'no-equipment'],
	},
	{
		id: 'upper-core-20',
		title: 'Upper body and core, 20 minutes',
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 20,
		intensity: 'steady',
		summary:
			'Push-ups, rows, upper-back work and core holds. The aim is steady posture for the end of a run.',
		purpose:
			'A strong upper back and trunk keep your posture and arm swing efficient when you are tired.',
		targetRpe: [5, 7],
		workout: wk([
			block([step('warmup', 'Warm-up', 4 * MIN, 'Arm circles and shoulder rolls.')]),
			block(
				[
					step('work', 'Push-up', 40, 'Hands under shoulders, body straight.'),
					step('work', 'Inverted row', 40, 'Pull the chest to the bar, elbows close.'),
					step('work', 'Prone Y-T-W', 40, 'Lie face down and lift the arms slowly.'),
					step('work', 'Plank', 40, 'Breathe steadily and keep the body in one line.'),
					step('work', 'Dead bug', 40, 'Keep the lower back on the floor.'),
					step('rest', 'Rest', 60, 'Breathe before the next round.'),
				],
				2,
				'Circuit',
			),
			block([step('cooldown', 'Easy walk', 4 * MIN, 'Settle your breathing.')]),
		]),
		refs: ['wave-1/3c-bodyweight-and-machines'],
		tags: ['strength', 'upper-body', 'core', 'no-equipment'],
	},
	{
		id: 'runners-strength-40',
		title: "Runner's strength, 40 minutes",
		modality: 'strength',
		type: 'full-body-strength',
		durationMin: 40,
		intensity: 'steady',
		summary: 'Two rounds of a balanced set: legs, hips, pushing, pulling and core.',
		purpose:
			'A complete session that covers what running asks for without taking more time than most runners have.',
		targetRpe: [6, 8],
		workout: wk([
			block([
				step('warmup', 'Warm-up', 6 * MIN, 'Walk briskly, then a few easy squats and lunges.'),
			]),
			block(
				[
					step('work', 'Split squat', 50, 'Each side. Control the way down.'),
					step('work', 'Single-leg RDL', 50, 'Each side. Keep the hips square.'),
					step('work', 'Step-up', 50, 'Each side. Drive through the whole foot.'),
					step('work', 'Push-up', 50, 'Body in one line.'),
					step('work', 'Inverted row', 50, 'Pull the chest to the bar.'),
					step('work', 'Dead bug', 50, 'Keep the lower back flat.'),
					step('rest', 'Rest', 75, 'Rest fully before the next round.'),
				],
				2,
				'Circuit',
			),
			block([step('cooldown', 'Easy walk', 6 * MIN, 'Slow down and breathe.')]),
		]),
		refs: ['wave-1/3b-strength-programming', 'wave-1/3c-bodyweight-and-machines'],
		tags: ['strength', 'full-body', 'no-equipment'],
	},

	// ---- Mobility and stretching ------------------------------------------
	{
		id: 'pre-run-warmup-10',
		title: 'Pre-run warm-up, 10 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 10,
		intensity: 'easy',
		summary:
			'Dynamic moves that warm up the hips, legs and ankles before a run. Keep them moving, no holds.',
		purpose:
			'Raises muscle temperature and takes the joints through their range, which prepares you for the first hard minute. Dynamic moves are better than long holds before running.',
		targetRpe: [2, 4],
		workout: wk([
			block(
				[
					step(
						'warmup',
						'Leg swings, front to back',
						40,
						'Hold a wall. Swing gently, letting the leg travel a little further each time.',
					),
					step(
						'warmup',
						'Leg swings, side to side',
						40,
						'Sweep across the body, keep the torso upright.',
					),
					step(
						'warmup',
						'Walking lunges',
						40,
						'Step long, lower the back knee, keep the torso tall.',
					),
					step('warmup', 'A-skips', 40, 'Quick, springy knee lifts. Stay tall.'),
					step('warmup', 'High knees', 30, 'Drive the knees up and land light and quick.'),
					step('warmup', 'Butt kicks', 30, 'Heels back toward the glutes. Stay light.'),
				],
				1,
				'Dynamic warm-up',
			),
		]),
		refs: ['wave-3/8c-stretching-flexibility', 'wave-3/8a-warmup-cooldown-mobility'],
		tags: ['mobility', 'pre-run', 'no-equipment'],
	},
	{
		id: 'post-run-cooldown-12',
		title: 'Post-run stretch, 12 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 12,
		intensity: 'easy',
		summary:
			'Six gentle holds after a run, each 30 to 45 seconds. Breathe slowly and stop before any pain.',
		purpose:
			'Eases tight calves, hamstrings and hips after running. Holds are gentle, so they do not drain the power you will need next time.',
		targetRpe: [1, 3],
		workout: wk([
			block(
				[
					step('cooldown', 'Calf stretch', 40, 'Back leg straight, heel down. Lean into the wall.'),
					step(
						'cooldown',
						'Hamstring stretch',
						40,
						'Hinge from the hips with a flat back. Stop at a gentle stretch.',
					),
					step(
						'cooldown',
						'Quad stretch',
						40,
						'Hold the ankle with knees together. Keep the hips square.',
					),
					step(
						'cooldown',
						'Hip flexor stretch',
						40,
						'Kneel and tuck the pelvis under. Press the hips gently forward.',
					),
					step(
						'cooldown',
						'Glute stretch',
						40,
						'Cross one ankle over the other knee and ease the knee toward the chest.',
					),
					step(
						'cooldown',
						'Chest and shoulder stretch',
						40,
						'Clasp the hands behind you and open the chest.',
					),
				],
				1,
				'Holds',
			),
		]),
		refs: ['wave-3/8c-stretching-flexibility', 'wave-3/8a-warmup-cooldown-mobility'],
		tags: ['mobility', 'post-run', 'no-equipment'],
	},
	{
		id: 'full-body-mobility-20',
		title: 'Full-body mobility, 20 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 20,
		intensity: 'easy',
		summary: 'Gentle movement and holds for the whole body. A good session on a rest day.',
		purpose:
			'Keeps your range of motion across the hips, back and shoulders, so running and daily life feel less stiff.',
		targetRpe: [1, 3],
		workout: wk([
			block(
				[
					step('warmup', 'Cat-cow', 45, 'Move the spine slowly, breathing out as you round.'),
					step('warmup', 'Leg swings', 45, 'Gentle, controlled swings in both directions.'),
					step('warmup', "World's greatest stretch", 45, 'Lunge, rotate the top arm up, breathe.'),
				],
				1,
				'Move',
			),
			block(
				[
					step('cooldown', 'Hamstring stretch', 45, 'Flat back, gentle stretch, slow breath.'),
					step('cooldown', 'Calf stretch', 45, 'Back leg straight, heel down.'),
					step(
						'cooldown',
						'Hip flexor stretch',
						45,
						'Tuck the pelvis under and press forward gently.',
					),
					step(
						'cooldown',
						'Thoracic rotation',
						45,
						'Lie on your side and open the top arm across the body.',
					),
					step('cooldown', 'Chest and shoulder stretch', 45, 'Clasp the hands and open the chest.'),
				],
				1,
				'Holds',
			),
		]),
		refs: ['wave-3/8c-stretching-flexibility'],
		tags: ['mobility', 'rest-day', 'no-equipment'],
	},
	{
		id: 'hips-glutes-15',
		title: 'Hips and glutes, 15 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 15,
		intensity: 'easy',
		summary: 'Focused holds for the hips and glutes, the muscles that steer the stride.',
		purpose:
			'Tight hips limit stride length and load the knees. Gentle work here helps the stride stay smooth.',
		targetRpe: [1, 3],
		workout: wk([
			block(
				[
					step(
						'cooldown',
						'Glute stretch',
						45,
						'Cross one ankle over the knee. Ease the knee toward the chest.',
					),
					step(
						'cooldown',
						'Hip flexor stretch',
						45,
						'Kneel, tuck the pelvis, and press forward gently.',
					),
					step(
						'cooldown',
						'Adductor stretch',
						45,
						'Wide stance, shift the weight to one side. Keep the knee over the foot.',
					),
					step(
						'cooldown',
						'Glute bridge',
						45,
						'Lie down, drive the hips up, hold and lower slowly.',
					),
				],
				1,
				'Holds',
			),
		]),
		refs: ['wave-3/8c-stretching-flexibility'],
		tags: ['mobility', 'hips', 'no-equipment'],
	},
	{
		id: 'hamstrings-calves-15',
		title: 'Hamstrings and calves, 15 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 15,
		intensity: 'easy',
		summary: 'Gentle holds for the back of the legs, which take the load of every stride.',
		purpose:
			'Hamstrings and calves tighten with running and hard efforts. Regular, gentle holds keep them supple.',
		targetRpe: [1, 3],
		workout: wk([
			block(
				[
					step('cooldown', 'Hamstring stretch', 45, 'Hinge from the hips with a flat back.'),
					step(
						'cooldown',
						'Calf stretch, straight knee',
						45,
						'Back leg straight, heel pressed down.',
					),
					step(
						'cooldown',
						'Calf stretch, bent knee',
						45,
						'Bend the back knee to target the lower calf.',
					),
					step(
						'cooldown',
						'Single-leg hamstring stretch',
						45,
						'One leg up, flex the foot toward you, hinge gently.',
					),
				],
				1,
				'Holds',
			),
		]),
		refs: ['wave-3/8c-stretching-flexibility'],
		tags: ['mobility', 'legs', 'no-equipment'],
	},
	{
		id: 'upper-back-shoulders-15',
		title: 'Upper back and shoulders, 15 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 15,
		intensity: 'easy',
		summary:
			'Gentle openers for the upper back and shoulders, to counter the hunched posture of a long day or a long run.',
		purpose: 'Keeps the arms swinging freely and the chest open, which helps breathing.',
		targetRpe: [1, 3],
		workout: wk([
			block(
				[
					step(
						'cooldown',
						'Thoracic rotation',
						45,
						'Lie on your side, knees bent, and open the top arm.',
					),
					step(
						'cooldown',
						'Chest and shoulder stretch',
						45,
						'Clasp the hands behind and lift the chest.',
					),
					step('cooldown', 'Doorway stretch', 45, 'Forearms on a doorframe, step through gently.'),
					step(
						'cooldown',
						"Child's pose",
						45,
						'Sit back toward the heels and reach the arms forward.',
					),
				],
				1,
				'Holds',
			),
		]),
		refs: ['wave-3/8c-stretching-flexibility'],
		tags: ['mobility', 'upper-body', 'no-equipment'],
	},
	{
		id: 'desk-break-8',
		title: 'Desk-break mobility, 8 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 8,
		intensity: 'easy',
		summary: 'Quick moves you can do between tasks, with no equipment and no change of clothes.',
		purpose:
			'Breaks up long sitting, which stiffens the hips and back. Short and often beats long and rare.',
		targetRpe: [1, 2],
		workout: wk([
			block(
				[
					step('warmup', 'Seated spinal twist', 45, 'Sit tall and rotate gently to each side.'),
					step(
						'cooldown',
						'Standing hip flexor stretch',
						45,
						'Step one foot back, tuck the pelvis, press forward.',
					),
					step('cooldown', 'Chest opener', 45, 'Clasp the hands behind and open the chest.'),
					step('warmup', 'Standing hamstring sweep', 45, 'Hinge gently and let the arms hang.'),
				],
				1,
				'Quick move',
			),
		]),
		refs: ['wave-3/8c-stretching-flexibility'],
		tags: ['mobility', 'desk', 'no-equipment'],
	},
	{
		id: 'mobility-stretch-8',
		title: 'Mobility and stretching, 8 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 8,
		intensity: 'easy',
		summary: 'A short mobility session to keep the range you already have.',
		purpose:
			'Range of motion and activation to keep the stride healthy. The engine plans this one when your flexibility goal is already close.',
		targetRpe: [1, 3],
		workout: mobilityWorkout(mobilityRoutine(false)),
		refs: ['wave-3/8a-warmup-cooldown-mobility', 'wave-3/8c-stretching-flexibility'],
		tags: ['mobility', 'rest-day', 'no-equipment'],
	},
	{
		id: 'mobility-stretch-12',
		title: 'Mobility and stretching, 12 minutes',
		modality: 'mobility',
		type: 'mobility',
		durationMin: 12,
		intensity: 'easy',
		summary: 'A mobility session with a little more work toward your flexibility goal.',
		purpose:
			'Range of motion and activation to keep the stride healthy, with extra holds when your flexibility goal is further out.',
		targetRpe: [1, 3],
		workout: mobilityWorkout(mobilityRoutine(true)),
		refs: ['wave-3/8a-warmup-cooldown-mobility', 'wave-3/8c-stretching-flexibility'],
		tags: ['mobility', 'rest-day', 'no-equipment'],
	},

	// ---- Recovery ---------------------------------------------------------
	{
		id: 'foam-roll-breathe-10',
		title: 'Foam roll and breathe, 10 minutes',
		modality: 'recovery',
		type: 'recovery',
		durationMin: 10,
		intensity: 'easy',
		summary:
			'Slow rolling over the calves, back of the thighs and glutes, with slow breathing between.',
		purpose:
			'Eases muscle tension and helps you feel loose after hard sessions. It is recovery, not a substitute for training.',
		targetRpe: [1, 2],
		workout: wk([
			block(
				[
					step(
						'work',
						'Calves',
						90,
						'Roll slowly. Pause on any tender spot for 10 seconds, breathing slowly.',
					),
					step('work', 'Back of the thighs', 90, 'Roll from the back of the knee to the hip.'),
					step('work', 'Glutes', 90, 'Sit on the roller and cross one ankle over the knee.'),
					step('recovery', 'Slow breathing', 90, 'Breathe in for four counts, out for six.'),
				],
				1,
				'Roll and breathe',
			),
		]),
		refs: ['wave-3/8b-recovery-modalities'],
		tags: ['recovery', 'no-equipment'],
	},
	{
		id: 'walk-and-breathe-20',
		title: 'Walk and breathe, 20 minutes',
		modality: 'recovery',
		type: 'recovery',
		durationMin: 20,
		intensity: 'easy',
		summary: 'A slow walk with slow breathing, the easiest way to reset after a hard week.',
		purpose:
			'Calms the nervous system and keeps you moving, which many runners find helps them sleep better.',
		targetRpe: [1, 2],
		workout: wk([
			block([
				step(
					'work',
					'Slow walk',
					15 * MIN,
					'Walk at an unhurried pace, noticing your surroundings.',
				),
			]),
			block([
				step('recovery', 'Slow breathing', 5 * MIN, 'Breathe in for four counts, out for six.'),
			]),
		]),
		refs: ['wave-3/9b-sleep-recovery-guidance', 'wave-3/8b-recovery-modalities'],
		tags: ['recovery', 'walk', 'no-equipment'],
	},
];

/**
 * The thorough mobility routines, one per focus. The engine names these when the
 * flexibility goal is far enough out to aim the work, and they are in the picker
 * so a runner can also add the one that fits them. The routine itself is data:
 * focusRoutine reads the drill lists from mobility-plan, so adding a focus is a
 * data change, not a code change.
 */
const BUILD_MOBILITY: LibraryWorkout[] = (
	[
		{
			focus: 'general',
			title: 'Mobility and stretching',
			summary: 'A full mobility pass for the whole body, two short rounds of each gentle hold.',
			purpose:
				'Builds range of motion across the areas running tightens. It is the routine the plan picks when your flexibility goal is a large step up.',
		},
		{
			focus: 'hips-glutes',
			title: 'Hips and glutes',
			summary: 'Gentle holds for the hips, glutes and groin, two short rounds of each.',
			purpose:
				'Tight hips and glutes limit stride length and steer load into the knee. Aims the work at the areas that drive your stride.',
		},
		{
			focus: 'hamstrings-calves',
			title: 'Hamstrings and calves',
			summary: 'Gentle holds for the back of the legs and the calves, two short rounds of each.',
			purpose:
				'Hamstrings and calves take the load of every hill and every stride. Keeps the back line and the ankle supple.',
		},
		{
			focus: 'ankles',
			title: 'Ankles and feet',
			summary: 'Holds and gentle rocking for the ankles, calves and feet, two short rounds of each.',
			purpose:
				'Ankle range shapes how you land and push off. Aims the work at the ankle when that is where your running lives.',
		},
		{
			focus: 'upper-back',
			title: 'Upper back and shoulders',
			summary: 'Openers for the mid-back, chest and shoulders, two short rounds of each.',
			purpose:
				'Keeps the upper back rotating and the chest open, so the arm swing stays free and breathing is not tied to a stiff spine.',
		},
	] as { focus: StretchFocus; title: string; summary: string; purpose: string }[]
).map((entry) => ({
	id: `mobility-build-${entry.focus}`,
	title: `${entry.title}, 20 minutes`,
	modality: 'mobility',
	type: 'mobility',
	durationMin: 20,
	intensity: 'easy',
	summary: entry.summary,
	purpose: entry.purpose,
	targetRpe: [1, 3],
	workout: mobilityWorkout(focusRoutine(entry.focus)),
	refs: ['wave-3/8c-stretching-flexibility', 'wave-5/14a-stretch-library'],
	tags: ['mobility', 'flexibility', 'build', `focus:${entry.focus}`, 'no-equipment'],
}));

/** The core workouts plus the wave-5 and wave-6 additions, in one list for the picker. */
export const WORKOUT_LIBRARY: LibraryWorkout[] = [
	...CORE_WORKOUTS,
	...BUILD_MOBILITY,
	...EXTRA_WORKOUTS,
	...PLUS_WORKOUTS,
];
