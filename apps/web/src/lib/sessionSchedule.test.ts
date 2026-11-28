import { describe, expect, it } from 'vitest';
import type { ScheduleBlock } from '@strideguide/shared/units';
import { sessionScheduleLabel } from './sessionSchedule';

const schedule: ScheduleBlock[] = [
	{ day: 1, start: '06:00', end: '07:30' },
	{ day: 3, start: '12:00', end: '13:00' },
];

describe('sessionScheduleLabel', () => {
	it('reads the assigned start time with its day', () => {
		expect(sessionScheduleLabel(1, '06:00', schedule)).toBe('Tuesday, 6:00 AM');
		expect(sessionScheduleLabel(3, '12:00', schedule)).toBe('Thursday, 12:00 PM');
	});

	it('falls back to the saved window on the session day', () => {
		expect(sessionScheduleLabel(1, undefined, schedule)).toBe('Tuesday, 6:00 AM to 7:30 AM');
	});

	it('ignores a window saved on another day', () => {
		expect(sessionScheduleLabel(2, undefined, schedule)).toBeNull();
	});

	it('is null when there is no assigned time and no schedule', () => {
		expect(sessionScheduleLabel(1, undefined, undefined)).toBeNull();
		expect(sessionScheduleLabel(1, undefined, [])).toBeNull();
	});

	it('is null for a day outside the week', () => {
		expect(sessionScheduleLabel(7, '06:00', schedule)).toBeNull();
		expect(sessionScheduleLabel(-1, '06:00', schedule)).toBeNull();
	});
});
