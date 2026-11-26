import { describe, expect, it } from 'vitest';
import { mergeSessionWhy, sessionWhyLine } from './sessionWhy';

describe('mergeSessionWhy', () => {
	it('prefers the model wording part by part and keeps the deterministic rest', () => {
		const merged = mergeSessionWhy({
			whyStructured: {
				role: 'Easy role',
				dayReason: 'Deterministic day',
				planContext: 'Deterministic plan',
			},
			whyText: { role: 'Model role', dayReason: 'Model day' },
		});
		expect(merged).toEqual({
			role: 'Model role',
			dayReason: 'Model day',
			planContext: 'Deterministic plan',
		});
	});

	it('returns only the model wording when there is no deterministic reason', () => {
		const merged = mergeSessionWhy({ whyText: { role: 'Model role' } });
		expect(merged).toEqual({ role: 'Model role' });
	});

	it('returns only the deterministic reason when no model wording passed the gate', () => {
		const merged = mergeSessionWhy({
			whyStructured: { role: 'Deterministic role', dayReason: 'Deterministic day' },
		});
		expect(merged).toEqual({ role: 'Deterministic role', dayReason: 'Deterministic day' });
	});

	it('returns null when the session carries no reason', () => {
		expect(mergeSessionWhy({})).toBeNull();
		expect(mergeSessionWhy({ why: 'A static amount note' })).toBeNull();
		expect(mergeSessionWhy(null)).toBeNull();
		expect(mergeSessionWhy(undefined)).toBeNull();
	});
});

describe('sessionWhyLine', () => {
	it('takes the first structured part, model wording first', () => {
		expect(
			sessionWhyLine({
				whyStructured: { dayReason: 'Deterministic day' },
				whyText: { role: 'Model role' },
			}),
		).toBe('Model role');
	});

	it('falls back to the day reason, then the static amount note', () => {
		expect(
			sessionWhyLine({ whyStructured: { dayReason: 'Deterministic day' }, why: 'Static' }),
		).toBe('Deterministic day');
		expect(sessionWhyLine({ why: 'Static' })).toBe('Static');
	});

	it('is empty when the session carries no reason at all', () => {
		expect(sessionWhyLine({})).toBe('');
		expect(sessionWhyLine(null)).toBe('');
	});
});
