import { describe, expect, it } from 'vitest';
import {
	clampCountdownSec,
	convertPace,
	countdownEnabledFor,
	countdownSeconds,
	formatDistance,
	formatPace,
	formatPaceBand,
	kmToMiles,
	localizeUnits,
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

	it('localizes metric prose distances and paces for imperial readers', () => {
		expect(localizeUnits('a 5 km time trial', 'imperial')).toBe('a 3.1 mi time trial');
		expect(localizeUnits('ran 16–24 km a week', 'imperial')).toBe('ran 9.9–14.9 mi a week');
		expect(localizeUnits('a 5-km race and 6 kilometres', 'imperial')).toBe(
			'a 3.1-mile race and 3.7 mi',
		);
		expect(localizeUnits('hold 5:00 /km on easy days', 'imperial')).toBe(
			'hold 8:03 /mi on easy days',
		);
	});

	it('leaves metric prose untouched', () => {
		const text = 'a 5 km time trial at 5:00 /km';
		expect(localizeUnits(text, 'metric')).toBe(text);
	});
});

describe('countdownSeconds', () => {
	it('is off when the countdown is disabled', () => {
		expect(countdownSeconds({ countdownEnabled: false, countdownSec: 5 })).toBe(0);
	});

	it('clamps the length to 3 to 10 seconds when it is on', () => {
		expect(countdownSeconds({ countdownEnabled: true, countdownSec: 0 })).toBe(3);
		expect(countdownSeconds({ countdownEnabled: true, countdownSec: 1 })).toBe(3);
		expect(countdownSeconds({ countdownEnabled: true, countdownSec: 7 })).toBe(7);
		expect(countdownSeconds({ countdownEnabled: true, countdownSec: 15 })).toBe(10);
		expect(countdownSeconds({ countdownEnabled: true })).toBe(5);
	});

	it('treats a legacy stored 0 as off, with no enabled flag', () => {
		expect(countdownSeconds({ countdownSec: 0 })).toBe(0);
	});
});

describe('countdownEnabledFor', () => {
	it('reads a legacy stored 0 as off and an explicit false as off', () => {
		expect(countdownEnabledFor({ countdownSec: 0 })).toBe(false);
		expect(countdownEnabledFor({ countdownEnabled: false })).toBe(false);
		expect(countdownEnabledFor({ countdownSec: 7 })).toBe(true);
		expect(countdownEnabledFor({})).toBe(true);
	});
});

describe('clampCountdownSec', () => {
	it('holds the 3 to 10 range', () => {
		expect(clampCountdownSec(2)).toBe(3);
		expect(clampCountdownSec(3)).toBe(3);
		expect(clampCountdownSec(10)).toBe(10);
		expect(clampCountdownSec(11)).toBe(10);
		expect(clampCountdownSec(6.6)).toBe(7);
	});
});
