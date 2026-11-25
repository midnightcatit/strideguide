import { expect, it } from 'vitest';
import { GOAL_PROFILES } from '@strideguide/shared';
import { goalProfileRows } from './goal-profiles';

it('gives every goal profile a reference row the user_goals guard can find', () => {
	// Migration 0016 aborts a user_goals insert whose slug is missing from
	// goal_profiles. That table is reference data seeded from the code catalogue,
	// so a profile the app offers with no row there fails onboarding at the first
	// goal insert. This is the invariant that was missing when the table was
	// empty and every plan build failed.
	const rows = goalProfileRows();
	const slugs = rows.map((row) => row.slug);
	expect(new Set(slugs).size).toBe(rows.length);
	expect(rows.length).toBe(GOAL_PROFILES.length);
	for (const profile of GOAL_PROFILES) {
		expect(slugs).toContain(profile.slug);
	}
	for (const row of rows) {
		expect(row.name.length).toBeGreaterThan(0);
		expect(row.builtIn).toBe(true);
	}
});
