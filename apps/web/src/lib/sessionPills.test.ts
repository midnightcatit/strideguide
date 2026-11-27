import { describe, expect, it } from 'vitest';
import { strengthPills } from './sessionPills';

const block = (machine: string, reps: number, sets: number) => ({
	machine,
	sets: Array.from({ length: sets }, () => ({ reps, weightKg: 0 })),
});

describe('strengthPills', () => {
	it('reads the set count from the prescription, not a fixed three', () => {
		// A build-phase session: the engine cut a set, so the card must say two.
		expect(strengthPills([block('Leg press', 8, 2)])).toContain('2 × 8');
	});

	it('reads the full base dose', () => {
		expect(strengthPills([block('Leg press', 10, 3)])).toContain('3 × 10');
	});

	it('counts the moves and drops the scheme when a block carries none', () => {
		expect(strengthPills([block('A', 0, 0), block('B', 0, 0)])).toEqual(['2 moves']);
		expect(strengthPills(undefined)).toEqual([]);
	});
});
