import { describe, expect, it } from 'vitest';
import { HOLD_MS, holdComplete, holdProgress, holdSecondsLeft } from './holdToConfirm';

describe('holdProgress', () => {
	it('runs from 0 to 1 across the hold', () => {
		expect(holdProgress(0)).toBe(0);
		expect(holdProgress(HOLD_MS / 2)).toBeCloseTo(0.5, 5);
		expect(holdProgress(HOLD_MS)).toBe(1);
	});

	it('clamps past the end and guards a bad input', () => {
		expect(holdProgress(HOLD_MS * 3)).toBe(1);
		expect(holdProgress(-10)).toBe(0);
		expect(holdProgress(Number.NaN)).toBe(0);
		expect(holdProgress(10, 0)).toBe(1);
	});
});

describe('holdComplete', () => {
	it('is only true once the hold is full', () => {
		expect(holdComplete(HOLD_MS - 1)).toBe(false);
		expect(holdComplete(HOLD_MS)).toBe(true);
		expect(holdComplete(HOLD_MS + 1)).toBe(true);
	});
});

describe('holdSecondsLeft', () => {
	it('counts the seconds left, never below zero', () => {
		expect(holdSecondsLeft(0)).toBe(5);
		expect(holdSecondsLeft(HOLD_MS - 1)).toBe(1);
		expect(holdSecondsLeft(HOLD_MS)).toBe(0);
		expect(holdSecondsLeft(HOLD_MS * 2)).toBe(0);
	});
});
