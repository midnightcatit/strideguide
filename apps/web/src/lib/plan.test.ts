import { describe, expect, it } from 'vitest';
import {
	addDaysIso,
	collapseRests,
	expandSteps,
	monthGridStartIso,
	startOfWeekIso,
	weekColumn,
	weekDayInitials,
	type ClientStep,
} from './plan';

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

describe('today week strip follows the runner week', () => {
	it('reads a Thursday-started plan as Monday first for weekStart 0', () => {
		const planStart = '2026-01-08'; // a Thursday
		// The Monday-start week holding the plan's first day begins Monday the 5th.
		expect(startOfWeekIso(planStart, 0)).toBe('2026-01-05');
		// The plan week's own days land on columns 3,4,5,6 then 0,1,2, so the
		// leading Monday, Tuesday and Wednesday columns are before the plan began.
		const columns = [0, 1, 2, 3, 4, 5, 6].map((day) =>
			weekColumn(addDaysIso(planStart, day), 0),
		);
		expect(columns).toEqual([3, 4, 5, 6, 0, 1, 2]);
		// The strip's seven columns read Monday through Sunday in that order.
		const shown = [0, 1, 2, 3, 4, 5, 6].map((i) =>
			weekColumn(addDaysIso(startOfWeekIso(planStart, 0), i), 0),
		);
		expect(shown).toEqual([0, 1, 2, 3, 4, 5, 6]);
	});

	it('puts Sunday first only when the runner chose a Sunday week start', () => {
		const planStart = '2026-01-08'; // a Thursday
		expect(startOfWeekIso(planStart, 1)).toBe('2026-01-04');
		const columns = [0, 1, 2, 3, 4, 5, 6].map((day) =>
			weekColumn(addDaysIso(planStart, day), 1),
		);
		expect(columns).toEqual([4, 5, 6, 0, 1, 2, 3]);
	});

	it('gathers a calendar week that spans two plan weeks on the right dates', () => {
		// Plan week one starts Thursday the 8th, week two Thursday the 15th.
		const w1 = '2026-01-08';
		const w2 = '2026-01-15';
		const sessions = [
			{ start: w1, day: 3, id: 'a' }, // Sunday the 11th
			{ start: w1, day: 6, id: 'b' }, // Wednesday the 14th
			{ start: w2, day: 0, id: 'c' }, // Thursday the 15th
			{ start: w2, day: 2, id: 'd' }, // Saturday the 17th
		];
		// The Monday-start week Monday the 12th to Sunday the 18th holds the tail
		// of plan week one and the head of plan week two.
		const weekStart = startOfWeekIso('2026-01-15', 0);
		expect(weekStart).toBe('2026-01-12');
		const byColumn: Record<number, string[]> = {};
		for (const s of sessions) {
			const date = addDaysIso(s.start, s.day);
			if (date >= weekStart && date <= addDaysIso(weekStart, 6)) {
				(byColumn[weekColumn(date, 0)] ??= []).push(s.id);
			}
		}
		// Sunday the 11th is before this Monday-start week, so it is not in it.
		expect(byColumn).toEqual({ 2: ['b'], 3: ['c'], 5: ['d'] });
	});
});

describe('strength set expansion', () => {
	const work = (machine: string): ClientStep => ({ kind: 'work', label: machine, machine, sets: 1, reps: 10 });
	const rest = (sec: number): ClientStep => ({ kind: 'rest', label: 'Rest', durationSec: sec });

	it('numbers work sets across the rest cards between them', () => {
		const slots = expandSteps([
			work('Leg press'),
			rest(75),
			work('Leg press'),
			rest(75),
			work('Leg press'),
		]);
		// The rest cards are their own slots and take no set number, so the work
		// sets read 1/3, 2/3, 3/3 and each rest announces the right next set.
		expect(slots.map((s) => [s.step.kind, s.setNo, s.totalSets])).toEqual([
			['work', 1, 3],
			['rest', undefined, undefined],
			['work', 2, 3],
			['rest', undefined, undefined],
			['work', 3, 3],
		]);
	});

	it('multiplies a single work step that carries its own set count', () => {
		const slots = expandSteps([{ kind: 'work', label: 'Plank', machine: 'Plank', sets: 3, reps: 8 }]);
		expect(slots.map((s) => [s.setNo, s.totalSets])).toEqual([
			[1, 3],
			[2, 3],
			[3, 3],
		]);
	});

	it('leaves single sets of different moves unnumbered', () => {
		const slots = expandSteps([work('Leg press'), rest(75), work('Seated row')]);
		expect(slots.map((s) => s.setNo)).toEqual([undefined, undefined, undefined]);
	});
});

describe('collapseRests', () => {
	const work = (machine: string): ClientStep => ({ kind: 'work', label: machine, machine, sets: 1, reps: 10 });
	const rest = (): ClientStep => ({ kind: 'rest', label: 'Rest', durationSec: 75 });

	it('merges every set of a move into one row, across the rest cards', () => {
		const rows = collapseRests([
			work('Leg press'),
			rest(),
			work('Leg press'),
			rest(),
			work('Leg press'),
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0]!.label).toBe('Leg press');
		expect(rows[0]!.sets).toBe(3);
	});

	it('keeps different moves as separate rows and drops the rest cards', () => {
		const rows = collapseRests([
			work('Leg press'),
			rest(),
			work('Leg press'),
			rest(),
			work('Seated row'),
		]);
		expect(rows.map((r) => [r.label, r.sets])).toEqual([
			['Leg press', 2],
			['Seated row', 1],
		]);
	});

	it('passes a single step that carries its own set count through', () => {
		const rows = collapseRests([{ kind: 'work', label: 'Plank', machine: 'Plank', sets: 3, reps: 8 }]);
		expect(rows).toHaveLength(1);
		expect(rows[0]!.sets).toBe(3);
	});
});
