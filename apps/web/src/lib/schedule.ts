/**
 * Pure helpers for the weekly training-window grid.
 *
 * The grid maps a half-hour cell to a weekday and a time of day, and back. All
 * maths runs in minutes from midnight; a window is stored as a `ScheduleBlock`
 * with `"HH:MM"` local times (the prefs shape the plan engine will read). Every
 * function here is pure, so the snapping, merging and formatting are tested
 * directly. The engine never imports this; it only reads the stored strings.
 */
import type { ScheduleBlock } from '@strideguide/shared/units';

/** Monday first, matching the app's weekday convention (0 = Monday). */
export const DAY_LABELS = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
] as const;

/** The day range the grid covers, from 05:00 to 22:00. */
export const GRID_START_MIN = 5 * 60;
export const GRID_END_MIN = 22 * 60;
/** Half-hour cells. */
export const STEP_MIN = 30;
/** Rows in the grid: 34 half-hour slots across the day range. */
export const ROWS = (GRID_END_MIN - GRID_START_MIN) / STEP_MIN;
/** A tap adds a window of this length; a drag adds the range it covers. */
export const DEFAULT_WINDOW_MIN = 60;

export interface MinuteWindow {
	start: number;
	end: number;
}

/** Minutes from midnight for a stored "HH:MM" time. */
export function timeToMinutes(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return (h || 0) * 60 + (m || 0);
}

/** A stored "HH:MM" time (24-hour) for minutes from midnight. */
export function minutesToTime(min: number): string {
	const h = Math.floor(min / 60);
	const m = min % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Snap minutes to the nearest half hour. */
export function snapMinutes(min: number): number {
	return Math.round(min / STEP_MIN) * STEP_MIN;
}

/** Keep minutes inside the grid's day range. */
export function clampMinutes(min: number): number {
	return Math.max(GRID_START_MIN, Math.min(GRID_END_MIN, min));
}

/** The grid row a time falls on. */
export function rowForMinutes(min: number): number {
	return Math.round((min - GRID_START_MIN) / STEP_MIN);
}

/** The time a grid row starts at. */
export function minutesForRow(row: number): number {
	return GRID_START_MIN + row * STEP_MIN;
}

/** The window a single tap adds: one hour, clamped to the day range. */
export function windowForTap(startMin: number): MinuteWindow {
	const start = snapMinutes(clampMinutes(startMin));
	return { start, end: Math.min(GRID_END_MIN, start + DEFAULT_WINDOW_MIN) };
}

/** The window a drag adds, covering both slots it touched, snapped and ordered. */
export function windowForDrag(anchorMin: number, focusMin: number): MinuteWindow {
	const lo = snapMinutes(clampMinutes(Math.min(anchorMin, focusMin)));
	const hi = snapMinutes(clampMinutes(Math.max(anchorMin, focusMin))) + STEP_MIN;
	const start = clampMinutes(lo);
	const end = clampMinutes(Math.max(start + STEP_MIN, hi));
	return { start, end };
}

/** A block's start and end in minutes. */
export function blockMinutes(block: ScheduleBlock): MinuteWindow {
	return { start: timeToMinutes(block.start), end: timeToMinutes(block.end) };
}

/** Blocks ordered by day, then start time. */
export function sortBlocks(blocks: ScheduleBlock[]): ScheduleBlock[] {
	return [...blocks].sort(
		(a, b) => a.day - b.day || timeToMinutes(a.start) - timeToMinutes(b.start),
	);
}

/**
 * Add a window to a day. A window that overlaps or touches an existing one on
 * the same day is merged into it, so a day never holds two blocks that meet.
 * Days are independent, and the result is always sorted.
 */
export function addBlock(
	blocks: ScheduleBlock[],
	day: number,
	startMin: number,
	endMin: number,
): ScheduleBlock[] {
	const s = Math.min(startMin, endMin);
	const e = Math.max(startMin, endMin);
	if (e <= s) return sortBlocks(blocks);
	const others = blocks.filter((b) => b.day !== day);
	const spans: MinuteWindow[] = [
		...blocks.filter((b) => b.day === day).map(blockMinutes),
		{ start: s, end: e },
	].sort((a, b) => a.start - b.start);
	const merged: MinuteWindow[] = [];
	for (const span of spans) {
		const last = merged[merged.length - 1];
		if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
		else merged.push({ start: span.start, end: span.end });
	}
	return sortBlocks([
		...others,
		...merged.map((w) => ({
			day,
			start: minutesToTime(w.start),
			end: minutesToTime(w.end),
		})),
	]);
}

/** The block on a day that contains a time, or null when none does. */
export function blockAt(blocks: ScheduleBlock[], day: number, min: number): ScheduleBlock | null {
	return (
		blocks.find((b) => {
			if (b.day !== day) return false;
			const { start, end } = blockMinutes(b);
			return min >= start && min < end;
		}) ?? null
	);
}

/** Remove the whole block on a day that contains a time. A miss changes nothing. */
export function removeBlockAt(blocks: ScheduleBlock[], day: number, min: number): ScheduleBlock[] {
	return blocks.filter((b) => {
		if (b.day !== day) return true;
		const { start, end } = blockMinutes(b);
		return !(min >= start && min < end);
	});
}

/** A local time of day as "6:00 AM" (12-hour, since the default is imperial). */
export function formatTime(min: number): string {
	const total = ((min % 1440) + 1440) % 1440;
	const h24 = Math.floor(total / 60);
	const m = total % 60;
	const period = h24 < 12 ? 'AM' : 'PM';
	const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
	return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** A compact hour label for the time gutter, e.g. "6 AM" or "12 PM". */
export function formatHourLabel(min: number): string {
	const total = ((min % 1440) + 1440) % 1440;
	const h24 = Math.floor(total / 60);
	const period = h24 < 12 ? 'AM' : 'PM';
	const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
	return `${h12} ${period}`;
}

/** A window as plain text, e.g. "6:00 AM to 7:30 AM". */
export function formatWindow(startMin: number, endMin: number): string {
	return `${formatTime(startMin)} to ${formatTime(endMin)}`;
}

/** One day's windows, ready to show as a summary line. */
export interface DaySummary {
	day: number;
	label: string;
	windows: string;
}

/**
 * Group the blocks into one line per day that has windows, in weekday order.
 * Days with nothing blocked are left out, so the summary stays short.
 */
export function daySummary(blocks: ScheduleBlock[]): DaySummary[] {
	const sorted = sortBlocks(blocks);
	const days = [...new Set(sorted.map((b) => b.day))].sort((a, b) => a - b);
	return days.map((day) => {
		const windows = sorted
			.filter((b) => b.day === day)
			.map((b) => {
				const { start, end } = blockMinutes(b);
				return formatWindow(start, end);
			})
			.join(', ');
		return { day, label: DAY_LABELS[day] ?? `Day ${day}`, windows };
	});
}
