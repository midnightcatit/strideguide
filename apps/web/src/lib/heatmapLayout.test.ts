import { describe, expect, it } from 'vitest';
import { STREAK_CELL, STREAK_GAP, heatmapNeedsScroll, heatmapStripWidth } from './heatmapLayout';

describe('heatmap strip width', () => {
	it('is one cell wide for a single week, with no trailing gap', () => {
		expect(heatmapStripWidth(1, STREAK_CELL, STREAK_GAP)).toBe(STREAK_CELL);
	});

	it('counts one gap between neighbours, not after the last column', () => {
		expect(heatmapStripWidth(3, 10, 2)).toBe(10 * 3 + 2 * 2);
	});

	it('draws nothing for a zero or negative span', () => {
		expect(heatmapStripWidth(0, STREAK_CELL, STREAK_GAP)).toBe(0);
		expect(heatmapStripWidth(-4, STREAK_CELL, STREAK_GAP)).toBe(0);
	});

	it('keeps a year of weeks on one strip far wider than a phone', () => {
		const width = heatmapStripWidth(52, STREAK_CELL, STREAK_GAP);
		expect(width).toBe(52 * STREAK_CELL + 51 * STREAK_GAP);
		expect(width).toBeGreaterThan(320);
	});
});

describe('heatmap scroll decision', () => {
	it('scrolls only when the strip is wider than the space it has', () => {
		const eightWeeks = heatmapStripWidth(8, STREAK_CELL, STREAK_GAP);
		expect(heatmapNeedsScroll(8, STREAK_CELL, STREAK_GAP, eightWeeks + 1)).toBe(false);

		const year = heatmapStripWidth(52, STREAK_CELL, STREAK_GAP);
		expect(heatmapNeedsScroll(52, STREAK_CELL, STREAK_GAP, year + 1 + 14, 14)).toBe(false);
		expect(heatmapNeedsScroll(52, STREAK_CELL, STREAK_GAP, 360, 14)).toBe(true);
	});

	it('counts the leading weekday column in the space the strip needs', () => {
		const strip = heatmapStripWidth(10, 10, 2);
		expect(heatmapNeedsScroll(10, 10, 2, strip, 12)).toBe(true);
		expect(heatmapNeedsScroll(10, 10, 2, strip + 12, 12)).toBe(false);
	});
});
