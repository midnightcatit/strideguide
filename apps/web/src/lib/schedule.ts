/**
 * Pure helpers for the weekly training-window grid.
 *
 * The grid maps a quarter-hour cell to a weekday and a time of day, and back. All
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

/**
 * The default day range the grid covers, from 04:00 to 23:00, wide enough for
 * the early starts runners actually use. A stored window that falls outside it
 * is not moved: see `gridBounds`, which widens the drawn range to include it.
 */
export const GRID_START_MIN = 4 * 60;
export const GRID_END_MIN = 23 * 60;
/** Quarter-hour cells. */
export const STEP_MIN = 15;
/** Rows in the default grid: 76 quarter-hour slots across the day range. */
export const ROWS = (GRID_END_MIN - GRID_START_MIN) / STEP_MIN;
/** A tap adds a window of this length; a drag adds the range it covers. */
export const DEFAULT_WINDOW_MIN = 60;

export interface MinuteWindow {
	start: number;
	end: number;
}

/** The rows the grid draws: a start, an end and how many slots sit between them. */
export interface GridBounds {
	start: number;
	end: number;
	rows: number;
}

/** The default bounds, matching the constants above. */
export const DEFAULT_GRID: GridBounds = {
	start: GRID_START_MIN,
	end: GRID_END_MIN,
	rows: ROWS,
};

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

/** Snap minutes to the nearest quarter hour. */
export function snapMinutes(min: number): number {
	return Math.round(min / STEP_MIN) * STEP_MIN;
}

/** Keep minutes inside a range, the default grid range unless given another. */
export function clampMinutes(min: number, bounds: GridBounds = DEFAULT_GRID): number {
	return Math.max(bounds.start, Math.min(bounds.end, min));
}

/** The grid row a time falls on, measured from the grid's own start. */
export function rowForMinutes(min: number, start: number = GRID_START_MIN): number {
	return Math.round((min - start) / STEP_MIN);
}

/** The time a grid row starts at. */
export function minutesForRow(row: number, start: number = GRID_START_MIN): number {
	return start + row * STEP_MIN;
}

/**
 * The visible range of the grid. It is the default day range, widened to whole
 * quarter-hour rows to include any stored window that falls outside it, so a
 * window set somewhere else (a later feature, or the raw API) is drawn where it
 * is rather than hidden. This never rewrites a stored value.
 */
export function gridBounds(blocks: ScheduleBlock[]): GridBounds {
	let start = GRID_START_MIN;
	let end = GRID_END_MIN;
	for (const block of blocks) {
		const { start: s, end: e } = blockMinutes(block);
		if (s < start) start = s;
		if (e > end) end = e;
	}
	start = Math.floor(start / STEP_MIN) * STEP_MIN;
	end = Math.ceil(end / STEP_MIN) * STEP_MIN;
	return { start, end, rows: (end - start) / STEP_MIN };
}

/** The window a single tap adds: one hour, bounded to the grid range. */
export function windowForTap(startMin: number, bounds: GridBounds = DEFAULT_GRID): MinuteWindow {
	const start = snapMinutes(clampMinutes(startMin, bounds));
	return { start, end: Math.min(bounds.end, start + DEFAULT_WINDOW_MIN) };
}

/** The window a drag adds, covering both slots it touched, snapped and ordered. */
export function windowForDrag(
	anchorMin: number,
	focusMin: number,
	bounds: GridBounds = DEFAULT_GRID,
): MinuteWindow {
	const lo = snapMinutes(clampMinutes(Math.min(anchorMin, focusMin), bounds));
	const hi = snapMinutes(clampMinutes(Math.max(anchorMin, focusMin), bounds)) + STEP_MIN;
	const start = clampMinutes(lo, bounds);
	const end = clampMinutes(Math.max(start + STEP_MIN, hi), bounds);
	return { start, end };
}

/** A block's start and end in minutes. */
export function blockMinutes(block: ScheduleBlock): MinuteWindow {
	return { start: timeToMinutes(block.start), end: timeToMinutes(block.end) };
}

/**
 * A window moved by `deltaMin`, keeping its length. The move is clamped to the
 * grid range: a nudge that would push the window past either edge applies only
 * as much as fits, and a window already at the edge does not move at all (it
 * never rolls to the next day). The length is preserved, so a short window is
 * never quietly stretched to reach the edge.
 */
export function shiftWindow(
	startMin: number,
	endMin: number,
	deltaMin: number,
	bounds: GridBounds = DEFAULT_GRID,
): MinuteWindow {
	const duration = endMin - startMin;
	if (duration <= 0) return { start: startMin, end: endMin };
	const start = Math.max(bounds.start, Math.min(bounds.end - duration, startMin + deltaMin));
	return { start, end: start + duration };
}

/**
 * Move the block that starts at `startMin` on `day` by `deltaMin`. A move that
 * lands on a neighbour merges into it, the same way adding a window does, so a
 * day still never holds two blocks that meet. A move clamped back to the same
 * place, or a day with no block at that start, changes nothing.
 */
export function shiftBlock(
	blocks: ScheduleBlock[],
	day: number,
	startMin: number,
	deltaMin: number,
	bounds: GridBounds = DEFAULT_GRID,
): ScheduleBlock[] {
	const block = blocks.find((b) => b.day === day && timeToMinutes(b.start) === startMin);
	if (!block) return blocks;
	const { start, end } = blockMinutes(block);
	const moved = shiftWindow(start, end, deltaMin, bounds);
	if (moved.start === start && moved.end === end) return blocks;
	const others = blocks.filter((b) => b !== block);
	return addBlock(others, day, moved.start, moved.end);
}

/**
 * The window with its start moved to `targetMin`, the end untouched. The new
 * start is snapped and clamped to the day range, and never crosses the end: a
 * window always keeps at least one step. Growing upward and shrinking from the
 * top are the same move, so dragging the top edge changes only the start.
 */
export function resizeWindowStart(
	startMin: number,
	endMin: number,
	targetMin: number,
	bounds: GridBounds = DEFAULT_GRID,
): MinuteWindow {
	const start = clampMinutes(snapMinutes(targetMin), bounds);
	return { start: Math.min(start, endMin - STEP_MIN), end: endMin };
}

/**
 * The window with its end moved to `targetMin`, the start untouched. The new end
 * is snapped and clamped to the day range, and never crosses the start: a window
 * always keeps at least one step. Dragging the bottom edge changes only the end.
 */
export function resizeWindowEnd(
	startMin: number,
	endMin: number,
	targetMin: number,
	bounds: GridBounds = DEFAULT_GRID,
): MinuteWindow {
	const end = clampMinutes(snapMinutes(targetMin), bounds);
	return { start: startMin, end: Math.max(end, startMin + STEP_MIN) };
}

/**
 * Resize the block that starts at `startMin` on `day` from its top edge to
 * `targetMin`. The end stays exactly where it was. A resize that grows onto a
 * neighbour merges into it, the same way a move or an add does, so a day still
 * never holds two blocks that meet.
 */
export function resizeBlockStart(
	blocks: ScheduleBlock[],
	day: number,
	startMin: number,
	targetMin: number,
	bounds: GridBounds = DEFAULT_GRID,
): ScheduleBlock[] {
	const block = blocks.find((b) => b.day === day && timeToMinutes(b.start) === startMin);
	if (!block) return blocks;
	const { start, end } = blockMinutes(block);
	const resized = resizeWindowStart(start, end, targetMin, bounds);
	if (resized.start === start) return blocks;
	const others = blocks.filter((b) => b !== block);
	return addBlock(others, day, resized.start, resized.end);
}

/**
 * Resize the block that starts at `startMin` on `day` from its bottom edge to
 * `targetMin`. The start stays exactly where it was. A resize that grows onto a
 * neighbour merges into it.
 */
export function resizeBlockEnd(
	blocks: ScheduleBlock[],
	day: number,
	startMin: number,
	targetMin: number,
	bounds: GridBounds = DEFAULT_GRID,
): ScheduleBlock[] {
	const block = blocks.find((b) => b.day === day && timeToMinutes(b.start) === startMin);
	if (!block) return blocks;
	const { start, end } = blockMinutes(block);
	const resized = resizeWindowEnd(start, end, targetMin, bounds);
	if (resized.end === end) return blocks;
	const others = blocks.filter((b) => b !== block);
	return addBlock(others, day, resized.start, resized.end);
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

/** The day range a bulk add covers, clamped to the seven weekdays, in order. */
export function bulkDays(dayFrom: number, dayTo: number): { lo: number; hi: number } {
	return {
		lo: Math.max(0, Math.min(dayFrom, dayTo)),
		hi: Math.min(6, Math.max(dayFrom, dayTo)),
	};
}

/** How many days a bulk add spans, inclusive. */
export function bulkDayCount(dayFrom: number, dayTo: number): number {
	const { lo, hi } = bulkDays(dayFrom, dayTo);
	return hi - lo + 1;
}

/**
 * Add the same window on every day from `dayFrom` to `dayTo`, inclusive, so a
 * person can block a whole week or a working stretch in one go. Each day merges
 * with what is already there, exactly as a single add does, so a day still never
 * holds two windows that meet. The day range is tolerated in either order.
 */
export function addBulk(
	blocks: ScheduleBlock[],
	dayFrom: number,
	dayTo: number,
	startMin: number,
	endMin: number,
): ScheduleBlock[] {
	const { lo, hi } = bulkDays(dayFrom, dayTo);
	let next = blocks;
	for (let day = lo; day <= hi; day += 1) {
		next = addBlock(next, day, startMin, endMin);
	}
	return next;
}

/**
 * The preview line for a bulk add, so what is about to be added is shown before
 * it is: how many windows, the time range and the day range.
 */
export function describeBulk(
	dayFrom: number,
	dayTo: number,
	startMin: number,
	endMin: number,
): string {
	const { lo, hi } = bulkDays(dayFrom, dayTo);
	const days = hi - lo + 1;
	const windows = days === 1 ? '1 window' : `${days} windows`;
	const dayRange =
		lo === hi ? (DAY_LABELS[lo] ?? '') : `${DAY_LABELS[lo] ?? ''} to ${DAY_LABELS[hi] ?? ''}`;
	return `${windows}, ${formatWindow(startMin, endMin)}, on ${dayRange}.`;
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
