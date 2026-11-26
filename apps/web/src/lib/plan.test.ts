import { describe, expect, it } from 'vitest';
import { addDaysIso, monthGridStartIso, weekColumn, weekDayInitials } from './plan';

describe('calendar week grouping', () => {
	it('places a Wednesday-started plan in the Monday-start calendar week', () => {
		const planStart = '2026-01-07'; // a Wednesday
		const columns = [0, 1, 2, 3, 4, 5, 6].map((day) =>
			weekColumn(addDaysIso(planStart, day), 0),
		);
		// Wed through Sun fill the first row from Wednesday on, then the plan
		// week's own Monday and Tuesday wrap to the start of the next row.
		expect(columns).toEqual([2, 3, 4, 5, 6, 0, 1]);
	});

	it('starts a Sunday-preference week on Sunday', () => {
		expect(weekColumn('2026-01-04', 1)).toBe(0); // Sunday
		expect(weekColumn('2026-01-05', 1)).toBe(1); // Monday
		expect(weekColumn('2026-01-07', 1)).toBe(3); // Wednesday
		expect(weekColumn('2026-01-10', 1)).toBe(6); // Saturday
		expect(weekDayInitials(1)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
		expect(weekDayInitials(1)[0]).toBe('S');
		expect(weekDayInitials(0)[0]).toBe('M');
	});

	it('backs a month grid up across a month boundary', () => {
		// February 1 2026 is a Sunday, so a Monday-start grid leads with Jan 26.
		expect(monthGridStartIso(2026, 1, 0)).toBe('2026-01-26');
		// A Sunday-start grid begins on February 1 itself.
		expect(monthGridStartIso(2026, 1, 1)).toBe('2026-02-01');
		// The grid's seventh cell lands on the first of the next month.
		expect(addDaysIso(monthGridStartIso(2026, 1, 0), 6)).toBe('2026-02-01');
		// A plan week that crosses the boundary keeps its weekday columns:
		// Thursday Jan 29 through Wednesday Feb 4, Monday-start.
		const planStart = '2026-01-29'; // a Thursday
		const columns = [0, 1, 2, 3, 4, 5, 6].map((day) =>
			weekColumn(addDaysIso(planStart, day), 0),
		);
		expect(columns).toEqual([3, 4, 5, 6, 0, 1, 2]);
	});
});
