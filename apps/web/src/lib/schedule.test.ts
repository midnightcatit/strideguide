import { describe, expect, it } from 'vitest';
import {
	DEFAULT_GRID,
	GRID_END_MIN,
	GRID_START_MIN,
	ROWS,
	STEP_MIN,
	addBlock,
	blockAt,
	daySummary,
	formatTime,
	formatWindow,
	gridBounds,
	minutesForRow,
	minutesToTime,
	removeBlockAt,
	rowForMinutes,
	snapMinutes,
	timeToMinutes,
	windowForDrag,
	windowForTap,
} from './schedule';
import type { ScheduleBlock } from '@strideguide/shared/units';

describe('grid time conversion', () => {
	it('reads a stored time as minutes from midnight', () => {
		expect(timeToMinutes('06:30')).toBe(390);
		expect(timeToMinutes('00:00')).toBe(0);
		expect(timeToMinutes('23:30')).toBe(1410);
	});

	it('writes minutes back as a padded 24-hour time', () => {
		expect(minutesToTime(390)).toBe('06:30');
		expect(minutesToTime(0)).toBe('00:00');
		expect(minutesToTime(1410)).toBe('23:30');
	});

	it('round trips a stored time', () => {
		for (const t of ['05:00', '07:30', '12:00', '22:00']) {
			expect(minutesToTime(timeToMinutes(t))).toBe(t);
		}
	});

	it('maps a grid row to a time and back', () => {
		expect(minutesForRow(0)).toBe(GRID_START_MIN);
		expect(minutesForRow(1)).toBe(GRID_START_MIN + STEP_MIN);
		expect(rowForMinutes(GRID_START_MIN)).toBe(0);
		expect(rowForMinutes(GRID_START_MIN + STEP_MIN)).toBe(1);
	});
});

describe('snap to the half hour', () => {
	it('leaves a slot time alone', () => {
		expect(snapMinutes(300)).toBe(300);
		expect(snapMinutes(330)).toBe(330);
	});

	it('rounds to the nearest half hour', () => {
		expect(snapMinutes(314)).toBe(300);
		expect(snapMinutes(315)).toBe(330);
		expect(snapMinutes(317)).toBe(330);
	});
});

describe('window from a tap or a drag', () => {
	it('gives a tapped slot one hour', () => {
		expect(windowForTap(360)).toEqual({ start: 360, end: 420 });
	});

	it('keeps a tap on the last slot inside the day range', () => {
		expect(windowForTap(GRID_END_MIN - STEP_MIN)).toEqual({
			start: GRID_END_MIN - STEP_MIN,
			end: GRID_END_MIN,
		});
	});

	it('covers both slots a drag touched', () => {
		expect(windowForDrag(360, 450)).toEqual({ start: 360, end: 480 });
	});

	it('reads a drag backwards, so the start end does not matter', () => {
		expect(windowForDrag(450, 360)).toEqual({ start: 360, end: 480 });
	});

	it('keeps a drag of one slot at one step', () => {
		expect(windowForDrag(360, 360)).toEqual({ start: 360, end: 390 });
	});
});

describe('adding a window', () => {
	it('appends a window on a day with nothing blocked', () => {
		expect(addBlock([], 2, 360, 450)).toEqual([{ day: 2, start: '06:00', end: '07:30' }]);
	});

	it('merges a window that overlaps an existing one', () => {
		const existing: ScheduleBlock[] = [{ day: 2, start: '06:00', end: '07:00' }];
		expect(addBlock(existing, 2, 390, 480)).toEqual([{ day: 2, start: '06:00', end: '08:00' }]);
	});

	it('merges a window that only touches an existing one', () => {
		const existing: ScheduleBlock[] = [{ day: 2, start: '06:00', end: '07:00' }];
		expect(addBlock(existing, 2, 420, 480)).toEqual([{ day: 2, start: '06:00', end: '08:00' }]);
	});

	it('merges a chain of windows that meet through the new one', () => {
		const existing: ScheduleBlock[] = [
			{ day: 2, start: '08:00', end: '09:00' },
			{ day: 2, start: '05:00', end: '06:00' },
		];
		expect(addBlock(existing, 2, 360, 480)).toEqual([{ day: 2, start: '05:00', end: '09:00' }]);
	});

	it('keeps a window that does not meet an existing one', () => {
		const existing: ScheduleBlock[] = [{ day: 2, start: '06:00', end: '07:00' }];
		expect(addBlock(existing, 2, 540, 600)).toEqual([
			{ day: 2, start: '06:00', end: '07:00' },
			{ day: 2, start: '09:00', end: '10:00' },
		]);
	});

	it('leaves other days alone and returns the days in order', () => {
		const existing: ScheduleBlock[] = [{ day: 4, start: '06:00', end: '07:00' }];
		expect(addBlock(existing, 1, 360, 420)).toEqual([
			{ day: 1, start: '06:00', end: '07:00' },
			{ day: 4, start: '06:00', end: '07:00' },
		]);
	});

	it('ignores an empty window', () => {
		expect(addBlock([], 2, 360, 360)).toEqual([]);
	});
});

describe('removing and finding a window', () => {
	const blocks: ScheduleBlock[] = [
		{ day: 2, start: '06:00', end: '07:30' },
		{ day: 4, start: '17:00', end: '18:00' },
	];

	it('finds the block a time sits inside', () => {
		expect(blockAt(blocks, 2, 360)).toEqual({ day: 2, start: '06:00', end: '07:30' });
		expect(blockAt(blocks, 2, 450)).toBeNull();
		expect(blockAt(blocks, 3, 360)).toBeNull();
	});

	it('removes the whole block a tap landed in', () => {
		expect(removeBlockAt(blocks, 2, 400)).toEqual([{ day: 4, start: '17:00', end: '18:00' }]);
	});

	it('changes nothing when a tap misses every block', () => {
		expect(removeBlockAt(blocks, 2, 480)).toEqual(blocks);
	});
});

describe('window formatting', () => {
	it('writes a time of day as a 12-hour clock', () => {
		expect(formatTime(360)).toBe('6:00 AM');
		expect(formatTime(0)).toBe('12:00 AM');
		expect(formatTime(720)).toBe('12:00 PM');
		expect(formatTime(810)).toBe('1:30 PM');
	});

	it('reads a window as a plain range', () => {
		expect(formatWindow(360, 450)).toBe('6:00 AM to 7:30 AM');
		expect(formatWindow(690, 780)).toBe('11:30 AM to 1:00 PM');
	});
});

describe('day summary', () => {
	it('groups windows by day in weekday order', () => {
		const blocks: ScheduleBlock[] = [
			{ day: 4, start: '17:00', end: '18:00' },
			{ day: 1, start: '06:00', end: '07:30' },
			{ day: 1, start: '18:00', end: '19:00' },
		];
		expect(daySummary(blocks)).toEqual([
			{ day: 1, label: 'Tuesday', windows: '6:00 AM to 7:30 AM, 6:00 PM to 7:00 PM' },
			{ day: 4, label: 'Friday', windows: '5:00 PM to 6:00 PM' },
		]);
	});

	it('is empty when nothing is blocked', () => {
		expect(daySummary([])).toEqual([]);
	});
});

describe('grid range and honest clamping', () => {
	it('covers 04:00 to 23:00 in half-hour rows', () => {
		expect(GRID_START_MIN).toBe(240);
		expect(GRID_END_MIN).toBe(1380);
		expect(ROWS).toBe(38);
		expect(minutesForRow(0)).toBe(240);
		expect(minutesForRow(ROWS - 1)).toBe(1350);
	});

	it('lets an early 04:30 start be selected', () => {
		expect(rowForMinutes(270)).toBe(1);
		expect(windowForTap(270)).toEqual({ start: 270, end: 330 });
	});

	it('widens the grid to include a stored window outside the default range', () => {
		const stored: ScheduleBlock[] = [{ day: 0, start: '02:00', end: '02:30' }];
		const wide = gridBounds(stored);
		expect(wide.start).toBe(120);
		// Inside the widened grid, 03:00 is drawn and selectable, not moved to 04:00.
		expect(windowForTap(180, wide)).toEqual({ start: 180, end: 240 });
	});

	it('leaves a stored window exactly as it was when another is added', () => {
		const stored: ScheduleBlock[] = [{ day: 0, start: '03:00', end: '03:30' }];
		expect(addBlock(stored, 2, 360, 420)).toContainEqual({
			day: 0,
			start: '03:00',
			end: '03:30',
		});
	});

	it('widens the grid to include a late window as well', () => {
		const stored: ScheduleBlock[] = [{ day: 6, start: '23:30', end: '23:59' }];
		expect(gridBounds(stored).end).toBe(1440);
	});

	it('keeps the default range when every window is inside it', () => {
		const inside: ScheduleBlock[] = [{ day: 2, start: '06:00', end: '07:30' }];
		expect(gridBounds(inside)).toEqual(DEFAULT_GRID);
	});
});
