/**
 * Suggested values for the onboarding inputs, with a plain reason for each, so a
 * default is a recommendation backed by typical ranges rather than a bare number.
 */

import { getGoalProfile } from '../goal-profiles';

export interface Recommendation {
	value: number;
	reason: string;
}

/** A typical weekly distance in km for a level and goal, the shared basis for
 * both the onboarding suggestion and the engine's own fallback, so the plan a
 * runner gets matches the number onboarding suggested. */
export function suggestedWeeklyKm(experience: string | undefined, profileSlug: string): number {
	const level = experience ?? 'beginner';
	const base: Record<string, number> = { beginner: 20, intermediate: 35, advanced: 55 };
	const factor: Record<string, number> = {
		marathon: 1.3,
		'half-marathon': 1.15,
		'10k': 0.9,
		'5k': 0.75,
		'whole-fitness': 0.85,
	};
	return Math.round((base[level] ?? 20) * (factor[profileSlug] ?? 0.9));
}

/** A suggested weekly distance in km, from the experience level and the goal. */
export function recommendWeeklyKm(
	experience: string | undefined,
	profileSlug: string,
): Recommendation {
	const level = experience ?? 'beginner';
	const value = suggestedWeeklyKm(experience, profileSlug);
	const goal = getGoalProfile(profileSlug)?.name ?? 'your goal';
	return {
		value,
		reason: `About ${value} km a week is typical for a ${level} runner training for ${goal}. Most of it should be easy, and the plan builds from here.`,
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
