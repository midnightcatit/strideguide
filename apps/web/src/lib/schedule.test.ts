import { describe, expect, it } from 'vitest';
import {
	DEFAULT_GRID,
	GRID_END_MIN,
	GRID_START_MIN,
	ROWS,
	STEP_MIN,
	addBlock,
	addBulk,
	blockAt,
	bulkDayCount,
	bulkDays,
	daySummary,
	describeBulk,
	formatTime,
	formatWindow,
	gridBounds,
	minutesForRow,
	minutesToTime,
	removeBlockAt,
	rowForMinutes,
	shiftBlock,
	shiftWindow,
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

describe('snap to the quarter hour', () => {
	it('leaves a slot time alone', () => {
		expect(snapMinutes(300)).toBe(300);
		expect(snapMinutes(315)).toBe(315);
	});

	it('rounds to the nearest quarter hour', () => {
		expect(snapMinutes(307)).toBe(300);
		expect(snapMinutes(308)).toBe(315);
		expect(snapMinutes(322)).toBe(315);
		expect(snapMinutes(323)).toBe(330);
	});
});

describe('window from a tap or a drag', () => {
	it('gives a tapped slot one hour', () => {
		expect(windowForTap(360)).toEqual({ start: 360, end: 420 });
	});

	it('gives a tapped slot snapped to the quarter hour', () => {
		expect(windowForTap(367)).toEqual({ start: 360, end: 420 });
	});

	it('keeps a tap on the last slot inside the day range', () => {
		expect(windowForTap(GRID_END_MIN - STEP_MIN)).toEqual({
			start: GRID_END_MIN - STEP_MIN,
			end: GRID_END_MIN,
		});
	});

	it('covers both slots a drag touched', () => {
		expect(windowForDrag(360, 450)).toEqual({ start: 360, end: 465 });
	});

	it('reads a drag backwards, so the start end does not matter', () => {
		expect(windowForDrag(450, 360)).toEqual({ start: 360, end: 465 });
	});

	it('keeps a drag of one slot at one step', () => {
		expect(windowForDrag(360, 360)).toEqual({ start: 360, end: 375 });
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

describe('bulk add across a day range', () => {
	it('adds the same window on every day in the range', () => {
		const week = addBulk([], 0, 6, 300, 1320);
		expect(week).toHaveLength(7);
		expect(week[0]).toEqual({ day: 0, start: '05:00', end: '22:00' });
		expect(week[6]).toEqual({ day: 6, start: '05:00', end: '22:00' });
	});

	it('covers a partial range, inclusive of both ends', () => {
		expect(addBulk([], 1, 3, 300, 330)).toEqual([
			{ day: 1, start: '05:00', end: '05:30' },
			{ day: 2, start: '05:00', end: '05:30' },
			{ day: 3, start: '05:00', end: '05:30' },
		]);
	});

	it('reads the range in either order', () => {
		expect(addBulk([], 3, 0, 300, 330)).toEqual(addBulk([], 0, 3, 300, 330));
	});

	it('merges into a window already on a day in the range', () => {
		const existing: ScheduleBlock[] = [{ day: 2, start: '06:00', end: '07:00' }];
		expect(addBulk(existing, 2, 2, 360, 480)).toEqual([{ day: 2, start: '06:00', end: '08:00' }]);
	});

	it('leaves a day outside the range alone', () => {
		const existing: ScheduleBlock[] = [{ day: 5, start: '06:00', end: '07:00' }];
		expect(addBulk(existing, 0, 2, 300, 330)).toContainEqual({
			day: 5,
			start: '06:00',
			end: '07:00',
		});
	});

	it('counts the days in a range, inclusive', () => {
		expect(bulkDayCount(0, 6)).toBe(7);
		expect(bulkDayCount(2, 2)).toBe(1);
		expect(bulkDayCount(6, 0)).toBe(7);
	});

	it('clamps a range to the weekdays', () => {
		expect(bulkDays(-3, 9)).toEqual({ lo: 0, hi: 6 });
	});

	it('names what a bulk add will do before it does it', () => {
		expect(describeBulk(0, 6, 300, 1320)).toBe(
			'7 windows, 5:00 AM to 10:00 PM, on Monday to Sunday.',
		);
		expect(describeBulk(2, 2, 300, 1320)).toBe('1 window, 5:00 AM to 10:00 PM, on Wednesday.');
	});
});

describe('moving a window (nudge and drag)', () => {
	it('shifts a window later by one step and keeps its length', () => {
		expect(shiftWindow(360, 420, STEP_MIN)).toEqual({ start: 375, end: 435 });
	});

	it('shifts a window earlier by one step', () => {
		expect(shiftWindow(360, 420, -STEP_MIN)).toEqual({ start: 345, end: 405 });
	});

	it('clamps at the start of the day instead of rolling back a day', () => {
		expect(shiftWindow(240, 300, -STEP_MIN)).toEqual({ start: 240, end: 300 });
	});

	it('clamps at the end of the day instead of rolling to the next day', () => {
		expect(shiftWindow(1320, 1380, STEP_MIN)).toEqual({ start: 1320, end: 1380 });
	});

	it('applies only the room left when a large nudge would pass the end', () => {
		expect(shiftWindow(1320, 1350, 45)).toEqual({ start: 1350, end: 1380 });
	});

	it('moves a stored block by one step', () => {
		const blocks: ScheduleBlock[] = [{ day: 2, start: '06:00', end: '07:00' }];
		expect(shiftBlock(blocks, 2, 360, STEP_MIN)).toEqual([
			{ day: 2, start: '06:15', end: '07:15' },
		]);
	});

	it('leaves a block at the day edge unchanged', () => {
		const blocks: ScheduleBlock[] = [{ day: 2, start: '22:00', end: '23:00' }];
		expect(shiftBlock(blocks, 2, 1320, STEP_MIN)).toBe(blocks);
	});

	it('merges with a neighbour a move lands on', () => {
		const blocks: ScheduleBlock[] = [
			{ day: 2, start: '06:00', end: '07:00' },
			{ day: 2, start: '07:15', end: '08:00' },
		];
		expect(shiftBlock(blocks, 2, 360, STEP_MIN)).toEqual([
			{ day: 2, start: '06:15', end: '08:00' },
		]);
	});

	it('changes nothing when no block starts there', () => {
		const blocks: ScheduleBlock[] = [{ day: 2, start: '06:00', end: '07:00' }];
		expect(shiftBlock(blocks, 2, 900, STEP_MIN)).toBe(blocks);
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
	it('covers 04:00 to 23:00 in quarter-hour rows', () => {
		expect(GRID_START_MIN).toBe(240);
		expect(GRID_END_MIN).toBe(1380);
		expect(ROWS).toBe(76);
		expect(minutesForRow(0)).toBe(240);
		expect(minutesForRow(ROWS - 1)).toBe(1365);
	});

	it('lets an early 04:30 start be selected', () => {
		expect(rowForMinutes(270)).toBe(2);
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
