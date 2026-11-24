import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
	vi.useRealTimers();
	vi.resetModules();
});

it('checks a birth year against the current clock, not the import clock', async () => {
	// A Worker's module-load clock reads the epoch. If the rule captured the
	// current year while loading, the ceiling would be 1960 and every real birth
	// year would fail, which is what made onboarding drop the name and birth
	// year. The rule has to read the year when it validates a value.
	vi.useFakeTimers();
	vi.setSystemTime(new Date(0));
	vi.resetModules();
	const { birthYearSchema } = await import('./birth-year');
	vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));

	expect(birthYearSchema.safeParse(1986).success).toBe(true);
	expect(birthYearSchema.safeParse(2016).success).toBe(true);
	expect(birthYearSchema.safeParse(2017).success).toBe(false);
	expect(birthYearSchema.safeParse(1899).success).toBe(false);
});
