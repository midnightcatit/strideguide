import { describe, expect, it } from 'vitest';
import { barRects, sparklineGeometry } from './miniChart';

describe('sparkline geometry', () => {
	it('draws nothing with fewer than two readings', () => {
		expect(sparklineGeometry([], 100, 20)).toBeNull();
		expect(sparklineGeometry([5], 100, 20)).toBeNull();
	});

	it('draws a level line through the middle of a flat series', () => {
		const geo = sparklineGeometry([7, 7, 7], 100, 20);
		expect(geo).not.toBeNull();
		expect(geo?.d).not.toContain('NaN');
		const ys = [...(geo?.d.matchAll(/[ML]\d+(?:\.\d+)?,(\d+(?:\.\d+)?)/g) ?? [])].map((m) =>
			Number(m[1]),
		);
		expect(ys).toHaveLength(3);
		expect(new Set(ys).size).toBe(1);
	});

	it('spans the full box, high readings high on the chart', () => {
		const geo = sparklineGeometry([0, 10], 100, 20, 2);
		expect(geo?.d).toBe('M2,18 L98,2');
	});
});

describe('mini bar geometry', () => {
	it('is empty with no readings', () => {
		expect(barRects([], 100, 20)).toEqual([]);
	});

	it('never divides by zero when every reading is zero', () => {
		const bars = barRects([0, 0, 0], 100, 20);
		expect(bars).toHaveLength(3);
		for (const bar of bars) {
			expect(Number.isFinite(bar.h)).toBe(true);
			expect(bar.h).toBe(0);
		}
	});

	it('grows the tallest reading to the full height', () => {
		const bars = barRects([1, 3], 100, 20);
		expect(bars[0].h).toBeCloseTo(20 / 3, 1);
		expect(bars[1].h).toBe(20);
		expect(bars[1].y).toBe(0);
	});

	it('scales a low-volume series to its own tallest reading', () => {
		const bars = barRects([0.5, 0.25], 100, 20);
		expect(bars[0].h).toBe(20);
		expect(bars[1].h).toBeCloseTo(10, 0);
	});

	it('draws a light reading at a minimum visible height when asked', () => {
		const bars = barRects([0.1, 10], 100, 20, 1, 1, 0.1);
		expect(bars[0].h).toBe(2);
		expect(bars[1].h).toBe(20);
	});
});
