/**
 * Built-in goal profiles: the engine's contract (PLAN.md section 4).
 * Adding a profile later is data, not new code.
 */
import type { GoalProfileData } from './types';

export const GOAL_PROFILES: GoalProfileData[] = [
	{
		slug: 'marathon',
		name: 'Marathon',
		description:
			'42.195 km. Long aerobic build with threshold work, a progressive long run, and a 2–3 week taper.',
		modalityMix: { running: 0.8, strength: 0.14, mobility: 0.04, recovery: 0.02 },
		progressionRules: [
			{ phase: 'base', weeks: 8, volumeStep: 0.1, deload: false },
			{ phase: 'build', weeks: 8, volumeStep: 0.08, deload: true },
			{ phase: 'peak', weeks: 4, volumeStep: 0.04, deload: false },
			{ phase: 'taper', weeks: 3, volumeStep: -0.25, deload: false },
		],
		successMetrics: [
			{ key: 'finish', label: 'Finish the marathon', weight: 0.4 },
			{ key: 'time', label: 'Improve race time', weight: 0.3 },
			{ key: 'consistency', label: 'Weekly consistency', weight: 0.3 },
		],
		requiredInputs: ['targetDate', 'baseline', 'availableDays'],
		sessionTypes: ['easy', 'long', 'tempo', 'threshold', 'interval', 'strides', 'hills', 'race'],
		defaultWeeks: 23,
	},
	{
		slug: 'half-marathon',
		name: 'Half Marathon',
		description:
			'21.1 km. Faster threshold work, longer quality sessions, and a shorter taper than the marathon.',
		modalityMix: { running: 0.78, strength: 0.16, mobility: 0.04, recovery: 0.02 },
		progressionRules: [
			{ phase: 'base', weeks: 6, volumeStep: 0.1, deload: false },
			{ phase: 'build', weeks: 6, volumeStep: 0.08, deload: true },
			{ phase: 'peak', weeks: 3, volumeStep: 0.05, deload: false },
			{ phase: 'taper', weeks: 2, volumeStep: -0.3, deload: false },
		],
		successMetrics: [
			{ key: 'time', label: 'Improve race time', weight: 0.5 },
			{ key: 'threshold', label: 'Raise threshold pace', weight: 0.3 },
			{ key: 'consistency', label: 'Weekly consistency', weight: 0.2 },
		],
		requiredInputs: ['targetDate', 'baseline', 'availableDays'],
		sessionTypes: ['easy', 'long', 'tempo', 'threshold', 'interval', 'strides', 'race'],
		defaultWeeks: 17,
	},
	{
		slug: '10k',
		name: '10K',
		description: '10 km. VO2max intervals plus sustained threshold work; strength supports speed.',
		modalityMix: { running: 0.74, strength: 0.2, mobility: 0.04, recovery: 0.02 },
		progressionRules: [
			{ phase: 'base', weeks: 4, volumeStep: 0.1, deload: false },
			{ phase: 'build', weeks: 5, volumeStep: 0.08, deload: true },
			{ phase: 'peak', weeks: 2, volumeStep: 0.03, deload: false },
			{ phase: 'taper', weeks: 1, volumeStep: -0.35, deload: false },
		],
		successMetrics: [
			{ key: 'time', label: 'Improve 10K time', weight: 0.6 },
			{ key: 'vo2max', label: 'Improve interval pace', weight: 0.4 },
		],
		requiredInputs: ['targetDate', 'baseline', 'availableDays'],
		sessionTypes: ['easy', 'tempo', 'threshold', 'interval', 'strides', 'hills', 'race'],
		defaultWeeks: 12,
	},
	{
		slug: '5k',
		name: '5K',
		description: '5 km. Speed-biased: short VO2max intervals, strides, and hill work.',
		modalityMix: { running: 0.7, strength: 0.24, mobility: 0.04, recovery: 0.02 },
		progressionRules: [
			{ phase: 'base', weeks: 3, volumeStep: 0.1, deload: false },
			{ phase: 'build', weeks: 4, volumeStep: 0.07, deload: true },
			{ phase: 'peak', weeks: 2, volumeStep: 0.03, deload: false },
			{ phase: 'taper', weeks: 1, volumeStep: -0.35, deload: false },
		],
		successMetrics: [
			{ key: 'time', label: 'Improve 5K time', weight: 0.6 },
			{ key: 'speed', label: 'Improve top-end speed', weight: 0.4 },
		],
		requiredInputs: ['targetDate', 'baseline', 'availableDays'],
		sessionTypes: ['easy', 'interval', 'strides', 'hills', 'race'],
		defaultWeeks: 10,
	},
	{
		slug: 'whole-fitness',
		name: 'Whole Fitness & Health',
		description:
			'General health: balanced cardio and full-body strength, no race date required, sustainable year-round.',
		modalityMix: { running: 0.45, strength: 0.4, mobility: 0.1, recovery: 0.05 },
		progressionRules: [
			{ phase: 'base', weeks: 8, volumeStep: 0.05, deload: false },
			{ phase: 'build', weeks: 8, volumeStep: 0.05, deload: true },
		],
		successMetrics: [
			{ key: 'consistency', label: 'Weekly consistency', weight: 0.5 },
			{ key: 'strength', label: 'Strength progress', weight: 0.3 },
			{ key: 'aerobic', label: 'Aerobic base', weight: 0.2 },
		],
		requiredInputs: ['availableDays'],
		sessionTypes: [
			'easy',
			'long',
			'machine-circuit',
			'full-body-strength',
			'mobility',
			'cross-train',
		],
		defaultWeeks: 16,
	},
];

export function getGoalProfile(slug: string): GoalProfileData | undefined {
	return GOAL_PROFILES.find((p) => p.slug === slug);
}
