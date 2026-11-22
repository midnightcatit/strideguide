import { describe, expect, it } from 'vitest';
import { formatPace, pacesFromVdot, parseTime, vdotFromBaseline, vdotFromRace } from './vdot';

describe('vdot', () => {
	it('computes a sane VDOT for a 20:00 5K (~49-50)', () => {
		const v = vdotFromRace(5000, 20 * 60);
		expect(v).toBeGreaterThan(47);
		expect(v).toBeLessThan(52);
	});

	it('orders training paces easy > marathon > threshold > interval > rep (sec/km)', () => {
		const p = pacesFromVdot(50);
		expect(p.easy[0]).toBeGreaterThan(p.marathon);
		expect(p.marathon).toBeGreaterThan(p.threshold);
		expect(p.threshold).toBeGreaterThan(p.interval);
		expect(p.interval).toBeGreaterThan(p.repetition);
	});

	it('parses times and formats paces', () => {
		expect(parseTime('1:45:00')).toBe(6300);
		expect(parseTime('24:30')).toBe(1470);
		expect(formatPace(245)).toBe('4:05');
	});

	it('derives a VDOT from baseline times', () => {
		expect(vdotFromBaseline({ '10k': '45:00' })).toBeGreaterThan(40);
	});
});
