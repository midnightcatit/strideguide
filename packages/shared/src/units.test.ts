import { describe, expect, it } from 'vitest';
import {
	convertPace,
	formatDistance,
	formatPace,
	formatPaceBand,
	kmToMiles,
	milesToKm,
	pacePerKmToPerMile,
} from './units';

describe('units', () => {
	it('converts km <-> miles', () => {
		expect(kmToMiles(1.609344)).toBeCloseTo(1, 6);
		expect(milesToKm(1)).toBeCloseTo(1.609344, 6);
	});

	it('converts pace per km to pace per mile', () => {
		// 5:00 /km -> 8:03 /mi
		expect(formatPace(300, 'metric')).toBe('5:00 /km');
		expect(formatPace(300, 'imperial')).toBe('8:03 /mi');
		expect(pacePerKmToPerMile(300)).toBeCloseTo(482.8, 0);
		expect(convertPace(300, 'metric')).toBe(300);
	});

	it('formats distances in the user units', () => {
		expect(formatDistance(6, 'metric')).toBe('6 km');
		expect(formatDistance(10, 'imperial')).toBe('6.2 mi');
	});

	it('formats a pace band', () => {
		expect(formatPaceBand([295, 305], 'metric')).toBe('4:55–5:05 /km');
	});
});
