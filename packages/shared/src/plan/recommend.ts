/**
 * Suggested values for the onboarding inputs, with a plain reason for each, so a
 * default is a recommendation backed by typical ranges rather than a bare number.
 */

import { getGoalProfile } from '../goal-profiles';
import { formatDistance, type Units } from '../units';
import type { BuildPreference } from '../types';

export interface Recommendation {
	value: number;
	reason: string;
}

/**
 * A recommended-volume multiplier by age band. Recovery capacity and connective
 * tissue resilience decline with age, so masters runners typically sustain a
 * little less weekly volume at the same relative effort. The bands (under 35,
 * 35-49, 50-64, 65 and over) follow the masters-athlete literature, where older
 * runners hold volume with more recovery time between hard weeks. The step is
 * small and monotonic, so the plan still builds; it just starts a little lower.
 * Age is used here; the runner's name never is.
 */
export function ageVolumeFactor(age?: number): number {
	if (!age || age < 35) return 1;
	if (age < 50) return 0.95;
	if (age < 65) return 0.9;
	return 0.85;
}

/**
 * A growth-rate multiplier by age band, applied to the weekly volume step. Older
 * runners take longer to absorb a build, so the same plan climbs more gently for
 * them. This is the age lever that still applies when the runner gives their own
 * weekly volume: their starting point is respected, the ramp is not steepened.
 */
export function ageBuildFactor(age?: number): number {
	if (!age || age < 35) return 1;
	if (age < 50) return 0.95;
	if (age < 65) return 0.85;
	return 0.75;
}

/** A typical weekly distance in km for a level and goal, the shared basis for
 * both the onboarding suggestion and the engine's own fallback, so the plan a
 * runner gets matches the number onboarding suggested. Age trims the suggestion
 * for masters runners, who on average sustain less weekly volume. */
export function suggestedWeeklyKm(
	experience: string | undefined,
	profileSlug: string,
	age?: number,
): number {
	const level = experience ?? 'beginner';
	const base: Record<string, number> = { beginner: 20, intermediate: 35, advanced: 55 };
	const factor: Record<string, number> = {
		marathon: 1.3,
		'half-marathon': 1.15,
		'10k': 0.9,
		'5k': 0.75,
		'whole-fitness': 0.85,
	};
	return Math.round((base[level] ?? 20) * (factor[profileSlug] ?? 0.9) * ageVolumeFactor(age));
}

/** A suggested weekly distance, from the experience level and the goal. The value
 * is always km (the engine's unit); the reason is written in the runner's units. */
export function recommendWeeklyKm(
	experience: string | undefined,
	profileSlug: string,
	units: Units = 'metric',
	age?: number,
): Recommendation {
	const level = experience ?? 'beginner';
	const value = suggestedWeeklyKm(experience, profileSlug, age);
	const goal = getGoalProfile(profileSlug)?.name ?? 'your goal';
	return {
		value,
		reason: `About ${formatDistance(value, units)} a week is typical for a ${level} runner training for ${goal}. Most of it should be easy, and the plan builds from here.`,
	};
}

/** A suggested number of strength sessions a week. */
export function recommendStrengthDays(profileSlug: string): Recommendation {
	const general = profileSlug === 'whole-fitness';
	const value = general ? 3 : 2;
	return {
		value,
		reason: general
			? 'Two or three strength sessions fit a general fitness goal, alongside the running and your sport.'
			: 'Two sessions a week is enough to protect joints and support running economy, and leaves room for the running.',
	};
}

/** A suggested daily training time in minutes. */
export function recommendSessionMinutes(): Recommendation {
	return {
		value: 45,
		reason: 'About 45 minutes covers a warm-up, the main work and a cool-down for most sessions.',
	};
}

/** A suggested build preference from the level, with a plain reason. */
export function recommendBuildPreference(experience: string | undefined): {
	value: BuildPreference;
	reason: string;
} {
	const level = experience ?? 'beginner';
	if (level === 'beginner') {
		return {
			value: 'ease-in',
			reason:
				'Starting gently and building week on week is the safest way to make running a habit. Switch to a bolder build once the plan starts to feel easy.',
		};
	}
	if (level === 'advanced') {
		return {
			value: 'steady',
			reason:
				'A steady build keeps the gains coming without crowding recovery. Pick the bolder option if you have raced recently and want more.',
		};
	}
	return {
		value: 'steady',
		reason:
			'A steady climb, about 10 percent a week with every fourth week lighter, suits most runners. Ease in if you are coming back from a break.',
	};
}
