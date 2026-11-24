import { describe, expect, it } from 'vitest';
import { volumeComparisons } from './comparisons';

describe('volumeComparisons', () => {
	it('says nothing for no distance', () => {
		expect(volumeComparisons(0)).toEqual([]);
		expect(volumeComparisons(-5)).toEqual([]);
	});

	it('counts the biggest landmark that fits', () => {
		const out = volumeComparisons(15);
		expect(out[0]).toEqual({ id: 'tenk', text: 'That is about 2 10Ks.' });
		expect(out.map((c) => c.id)).toContain('parkrun');
	});

	it('uses "more than" when the multiple is under one and a half', () => {
		const out = volumeComparisons(43);
		expect(out[0]).toEqual({ id: 'marathon', text: 'That is more than a marathon.' });
	});

	it('multiplies a length landmark with "times"', () => {
		const out = volumeComparisons(1000);
		expect(out[0]).toEqual({
			id: 'thames',
			text: 'That is about 3 times the length of the River Thames.',
		});
	});

	it('never returns more than the limit', () => {
		expect(volumeComparisons(1_000_000, 3)).toHaveLength(3);
	});
});
