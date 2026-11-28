import type { ScheduleBlock } from '@strideguide/shared/units';
import { DAY_NAMES } from './plan';
import { formatTime, formatWindow, timeToMinutes } from './schedule';

/**
 * The day and time a session is planned for, as one plain line.
 *
 * The engine's own placement ("HH:MM" on the prescription) is the exact time it
 * put the session at inside a window the runner blocked out, so it leads. When a
 * session carries no placement, the window the runner saved for that day is what
 * their preferences set, so the whole window is shown. With neither, there is no
 * day-and-time preference to read, so the label is null and the card leaves the
 * line as it was.
 */
export function sessionScheduleLabel(
	day: number,
	timeStart: string | undefined,
	schedule: ScheduleBlock[] | undefined,
): string | null {
	const dayName = DAY_NAMES[day];
	if (dayName === undefined) return null;
	if (timeStart) return `${dayName}, ${formatTime(timeToMinutes(timeStart))}`;
	const window = schedule?.find((b) => b.day === day);
	if (!window) return null;
	return `${dayName}, ${formatWindow(timeToMinutes(window.start), timeToMinutes(window.end))}`;
}
