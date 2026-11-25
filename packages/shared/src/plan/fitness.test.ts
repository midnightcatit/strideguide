import { describe, expect, it } from 'vitest';
import { fitnessState } from './fitness';

const NOW = Date.parse('2026-11-23T00:00:00Z');

describe('fitnessState', () => {
	it('reads a VDOT from a recent hard effort, not from easy runs', () => {
		const hard = {
			type: 'race-pace',
			date: '2026-11-20T00:00:00Z',
			distanceKm: 5,
			durationSec: 1500,
			rpe: 8,
		};
		const easy = {
			type: 'easy',
			date: '2026-11-19T00:00:00Z',
			distanceKm: 8,
			durationSec: 3000,
			rpe: 4,
		};
		expect(fitnessState([hard], { now: NOW }).effectiveVdot).toBeGreaterThan(30);
		// An easy run is not a fitness test, and neither is a short rep.
		expect(fitnessState([easy], { now: NOW }).effectiveVdot).toBeUndefined();
		expect(
			fitnessState([{ ...hard, type: 'interval', distanceKm: 2 }], { now: NOW }).effectiveVdot,
		).toBeUndefined();
	});

	it('averages running distance per week over the window, ignoring strength', () => {
		const s = fitnessState(
			[
				{ type: 'easy', date: '2026-11-20T00:00:00Z', distanceKm: 7 },
				{ type: 'long', date: '2026-11-18T00:00:00Z', distanceKm: 14 },
				{ type: 'strength', date: '2026-11-17T00:00:00Z', distanceKm: 0 },
			],
			{ now: NOW, windowDays: 28 },
		);
		expect(s.recentWeeklyKm).toBeCloseTo(5.3, 1);
	});

	it('spots effort drifting up or down', () => {
		const mk = (day: string, rpe: number) => ({
			type: 'easy',
			date: `2026-11-${day}T00:00:00Z`,
			distanceKm: 5,
			rpe,
		});
		expect(
			fitnessState([mk('01', 4), mk('02', 4), mk('03', 4), mk('10', 7), mk('11', 7), mk('12', 7)], {
				now: NOW,
			}).rpeTrend,
		).toBe('rising');
		expect(
			fitnessState([mk('01', 7), mk('02', 7), mk('03', 7), mk('10', 4), mk('11', 4), mk('12', 4)], {
				now: NOW,
			}).rpeTrend,
		).toBe('falling');
		expect(
			fitnessState([mk('01', 5), mk('02', 5), mk('03', 5), mk('10', 5), mk('11', 5), mk('12', 5)], {
				now: NOW,
			}).rpeTrend,
		).toBe('steady');
		// Too few samples to call a trend.
		expect(fitnessState([mk('10', 8), mk('11', 8)], { now: NOW }).rpeTrend).toBeUndefined();
	});

	it('turns thumbs feedback into liked and disliked types', () => {
		const f = (day: string, type: string, feedback: 'up' | 'down') => ({
			type,
			date: `2026-11-${day}T00:00:00Z`,
			feedback,
		});
		const s = fitnessState(
			[f('10', 'hills', 'up'), f('12', 'hills', 'up'), f('11', 'interval', 'down')],
			{ now: NOW },
		);
		expect(s.likedTypes).toEqual(['hills']);
		expect(s.dislikedTypes).toEqual(['interval']);
	});

	it('ignores entries older than the window', () => {
		const old = {
			type: 'race-pace',
			date: '2026-01-01T00:00:00Z',
			distanceKm: 5,
			durationSec: 1500,
			rpe: 9,
		};
		const s = fitnessState([old], { now: NOW });
		expect(s.samples).toBe(0);
		expect(s.effectiveVdot).toBeUndefined();
	});

	it('reads a numeric date as epoch seconds, not milliseconds', () => {
		// 2026-11-20T00:00:00Z in seconds. Read as milliseconds it falls in 1970,
		// outside the window, so the entry would drop and the volume would read 0.
		const seconds = Date.parse('2026-11-20T00:00:00Z') / 1000;
		const s = fitnessState([{ type: 'easy', date: seconds, distanceKm: 7 }], {
			now: NOW,
			windowDays: 28,
		});
		expect(s.samples).toBe(1);
		expect(s.recentWeeklyKm).toBeCloseTo(1.8, 1);
	});

	it('counts only running distance, never a cross-train or strength session', () => {
		const weekly = (entries: Parameters<typeof fitnessState>[0]) =>
			fitnessState(entries, { now: NOW, windowDays: 28 }).recentWeeklyKm;
		// A spin with a distance, named by type alone and then by modality.
		expect(weekly([{ type: 'cross-train', date: '2026-11-20T00:00:00Z', distanceKm: 20 }])).toBe(0);
		expect(
			weekly([
				{ type: 'cross-train', modality: 'recovery', date: '2026-11-20T00:00:00Z', distanceKm: 20 },
			]),
		).toBe(0);
		// A recovery jog is still a run, so its distance counts.
		expect(
			weekly([{ type: 'recovery', modality: 'running', date: '2026-11-20T00:00:00Z', distanceKm: 8 }]),
		).toBeCloseTo(2, 1);
	});
});
