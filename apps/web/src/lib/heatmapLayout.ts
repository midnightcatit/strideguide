/**
 * Pure layout math for the activity heatmap strip. Kept out of the component so
 * the widths and the scroll decision can be reasoned about and tested without a
 * DOM. Cells hold one fixed size at every range; the strip scrolls sideways
 * instead of shrinking the squares to fit.
 */

/**
 * The cell size for the full-size streak heatmap, in CSS pixels. Every range
 * uses this same size. 28px is above the WCAG 2.5.8 minimum target of 24px and
 * several times the old fluid cells at long ranges, so a day stays a comfortable
 * tap target; the strip scrolls rather than compressing the squares.
 */
export const STREAK_CELL = 28;

/** The gap between neighbouring cells and columns, matching the heatmap. */
export const STREAK_GAP = 4;

/**
 * The width of the week columns: one cell per column with a single gap between
 * neighbours. There is no trailing gap after the last column, so the width the
 * month labels rely on stays exact, and a single column is one cell wide.
 */
export function heatmapStripWidth(weeks: number, cell: number, gap: number): number {
	if (weeks <= 0) return 0;
	return weeks * cell + (weeks - 1) * gap;
}

/**
 * Whether a strip of `weeks` columns, plus an optional leading column for the
 * weekday labels, is wider than the space it has. When it is, the heatmap
 * scrolls sideways rather than shrinking the cells below their fixed size.
 */
export function heatmapNeedsScroll(
	weeks: number,
	cell: number,
	gap: number,
	available: number,
	leading = 0,
): boolean {
	return leading + heatmapStripWidth(weeks, cell, gap) > available;
}
