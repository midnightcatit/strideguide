import { describe, expect, it } from 'vitest';
import type { GoogleDataPoint } from './google-health';
import {
	civilDateFromInstant,
	combineDailyPatches,
	dateFromGoogleDate,
	mapDailyHeartRateVariability,
	mapDailyRestingHeartRate,
	mapExercise,
	mapSleep,
	mergeDailyRow,
	modalityForExerciseType,
	parseDurationSeconds,
	parseUtcOffsetSeconds,
	stepsByDate,
	syncSince,
	DEFAULT_SYNC_WINDOW_DAYS,
} from './google-health-map';

const runningExercise: GoogleDataPoint = {
	name: 'users/123/dataTypes/exercise/dataPoints/3054085373369111216',
	dataSource: { platform: 'FITBIT' },
	exercise: {
		interval: {
			startTime: '2026-04-20T08:00:00Z',
			startUtcOffset: '0s',
			endTime: '2026-04-20T08:35:00Z',
			endUtcOffset: '0s',
		},
		exerciseType: 'RUNNING',
		activeDuration: '1800s',
		metricsSummary: {
			caloriesKcal: 380,
			distanceMillimeters: 5000000,
			steps: '6200',
			averageHeartRateBeatsPerMinute: '148',
			// Deliberately different from distance/time so we can prove which wins.
			averagePaceSecondsPerMeter: 0.36,
		},
	},
};

describe('exercise type to modality', () => {
	it('maps the running and strength families', () => {
		expect(modalityForExerciseType('RUNNING')).toBe('running');
		expect(modalityForExerciseType('TRAIL_RUN')).toBe('running');
		expect(modalityForExerciseType('WALKING')).toBe('walking');
		expect(modalityForExerciseType('STRENGTH_TRAINING')).toBe('strength');
		expect(modalityForExerciseType('YOGA')).toBe('mobility');
		expect(modalityForExerciseType('MEDITATE')).toBe('recovery');
	});

	it('falls back to cross-train for anything unknown or missing', () => {
		expect(modalityForExerciseType('BIKING')).toBe('cross-train');
		expect(modalityForExerciseType('SOME_FUTURE_TYPE')).toBe('cross-train');
		expect(modalityForExerciseType(undefined)).toBe('cross-train');
	});
});

describe('duration and offset parsing', () => {
	it('reads Google durations', () => {
		expect(parseDurationSeconds('1800s')).toBe(1800);
		expect(parseDurationSeconds('1800.6s')).toBe(1801);
		expect(parseDurationSeconds('bad')).toBeNull();
		expect(parseDurationSeconds(undefined)).toBeNull();
	});

	it('reads Google UTC offsets', () => {
		expect(parseUtcOffsetSeconds('-14400s')).toBe(-14400);
		expect(parseUtcOffsetSeconds('0s')).toBe(0);
		expect(parseUtcOffsetSeconds(undefined)).toBe(0);
		expect(parseUtcOffsetSeconds('nonsense')).toBe(0);
	});
});

describe('civil dates', () => {
	it('shifts an instant into the user clock before taking the date', () => {
		// 06:30Z at -04:00 is 02:30 local, still the 21st.
		expect(civilDateFromInstant('2026-04-21T06:30:00Z', -14400)).toBe('2026-04-21');
		// 02:00Z at -05:00 is 21:00 the previous day.
		expect(civilDateFromInstant('2026-04-21T02:00:00Z', -18000)).toBe('2026-04-20');
		expect(civilDateFromInstant(undefined, 0)).toBeNull();
	});

	it('formats the daily types date object', () => {
		expect(dateFromGoogleDate({ year: 2026, month: 4, day: 9 })).toBe('2026-04-09');
		expect(dateFromGoogleDate({ year: '2026', month: '4', day: '9' })).toBe('2026-04-09');
		expect(dateFromGoogleDate(undefined)).toBeNull();
		expect(dateFromGoogleDate({ year: 2026, month: 4 })).toBeNull();
	});
});

describe('mapExercise', () => {
	it('turns a running session into an activities row', () => {
		const row = mapExercise(runningExercise);
		expect(row).not.toBeNull();
		expect(row!.externalId).toBe('3054085373369111216');
		expect(row!.modality).toBe('running');
		expect(row!.type).toBe('RUNNING');
		expect(row!.startedAt.toISOString()).toBe('2026-04-20T08:00:00.000Z');
		expect(row!.durationSec).toBe(1800);
		expect(row!.distanceM).toBe(5000);
		// 1800s over 5000m is 360 s/km, not the 0.36 s/m the payload also carries.
		expect(row!.avgPaceSecPerKm).toBeCloseTo(360);
		expect(row!.avgHr).toBe(148);
		expect(row!.calories).toBe(380);
		expect(row!.source).toBe('FITBIT');
		// The summary carries no max heart rate, and routes live behind the TCX export.
		expect(row!.maxHr).toBeNull();
		expect(row!.route).toBeNull();
	});

	it('falls back to the provided pace when there is no distance', () => {
		const row = mapExercise({
			name: 'users/1/dataTypes/exercise/dataPoints/abc',
			exercise: {
				interval: { startTime: '2026-04-20T08:00:00Z', endTime: '2026-04-20T08:30:00Z' },
				exerciseType: 'AEROBIC_WORKOUT',
				metricsSummary: { averagePaceSecondsPerMeter: 0.4 },
			},
		});
		expect(row!.modality).toBe('cross-train');
		expect(row!.distanceM).toBeNull();
		expect(row!.avgPaceSecPerKm).toBeCloseTo(400);
		// No activeDuration, so the interval bounds stand in.
		expect(row!.durationSec).toBe(1800);
	});

	it('skips a point with no exercise payload or no id', () => {
		expect(mapExercise({ name: 'users/1/dataTypes/steps/dataPoints/abc' })).toBeNull();
		expect(
			mapExercise({ exercise: { interval: { startTime: '2026-04-20T08:00:00Z', endTime: '' } } }),
		).toBeNull();
	});
});

describe('mapSleep', () => {
	it('keys minutes asleep by the civil day the session ended', () => {
		const patch = mapSleep({
			name: 'users/1/dataTypes/sleep/dataPoints/s1',
			sleep: {
				interval: {
					startTime: '2026-04-20T22:30:00Z',
					startUtcOffset: '-14400s',
					endTime: '2026-04-21T06:30:00Z',
					endUtcOffset: '-14400s',
				},
				summary: { minutesAsleep: '455' },
			},
		});
		expect(patch).toEqual({
			date: '2026-04-21',
			sleepMin: 455,
			raw: { sleep: expect.any(Object) },
		});
	});

	it('skips a session with no usable end time', () => {
		expect(mapSleep({ sleep: { interval: { startTime: '', endTime: '' } } })).toBeNull();
	});
});

describe('daily vitals', () => {
	it('maps resting heart rate', () => {
		const patch = mapDailyRestingHeartRate({
			dailyRestingHeartRate: { date: { year: 2026, month: 4, day: 20 }, beatsPerMinute: '52' },
		});
		expect(patch).toEqual({
			date: '2026-04-20',
			restingHr: 52,
			raw: { dailyRestingHeartRate: expect.any(Object) },
		});
	});

	it('maps heart rate variability, keeping the decimal', () => {
		const patch = mapDailyHeartRateVariability({
			dailyHeartRateVariability: {
				date: { year: 2026, month: 4, day: 20 },
				averageHeartRateVariabilityMilliseconds: 45.6,
			},
		});
		expect(patch).toEqual({
			date: '2026-04-20',
			hrvMs: 45.6,
			raw: { dailyHeartRateVariability: expect.any(Object) },
		});
	});
});

describe('stepsByDate', () => {
	it('sums minutely step intervals into daily totals', () => {
		const points: GoogleDataPoint[] = [
			{ steps: { interval: { startTime: '2026-04-20T23:00:00Z', startUtcOffset: '0s', endTime: '2026-04-20T23:01:00Z' }, count: '100' } },
			{ steps: { interval: { startTime: '2026-04-20T23:01:00Z', startUtcOffset: '0s', endTime: '2026-04-20T23:02:00Z' }, count: '250' } },
			{ steps: { interval: { startTime: '2026-04-21T08:00:00Z', startUtcOffset: '0s', endTime: '2026-04-21T08:01:00Z' }, count: '50' } },
		];
		const patches = stepsByDate(points);
		expect(patches).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ date: '2026-04-20', steps: 350 }),
				expect.objectContaining({ date: '2026-04-21', steps: 50 }),
			]),
		);
		expect(patches).toHaveLength(2);
	});
});

describe('daily merge (the since-last-sync upsert)', () => {
	it('folds several data types on one day into a single row', () => {
		const combined = combineDailyPatches([
			{ date: '2026-04-20', sleepMin: 455, raw: { sleep: 1 } },
			{ date: '2026-04-20', restingHr: 52, raw: { dailyRestingHeartRate: 2 } },
			{ date: '2026-04-20', hrvMs: 45.6, steps: 8000, raw: { steps: 3 } },
		]);
		expect(combined).toHaveLength(1);
		expect(combined[0]).toMatchObject({
			date: '2026-04-20',
			sleepMin: 455,
			restingHr: 52,
			hrvMs: 45.6,
			steps: 8000,
		});
		expect(combined[0]!.raw).toEqual({ sleep: 1, dailyRestingHeartRate: 2, steps: 3 });
	});

	it('keeps a stored field when the incoming patch is missing it', () => {
		const stored = {
			date: '2026-04-20',
			restingHr: 52,
			hrvMs: 45.6,
			sleepMin: 455,
			steps: 350,
			raw: { sleep: 1 } as Record<string, unknown>,
		};
		const merged = mergeDailyRow(stored, { date: '2026-04-20', steps: 400, raw: { steps: 2 } });
		expect(merged).toMatchObject({ restingHr: 52, hrvMs: 45.6, sleepMin: 455, steps: 400 });
		expect(merged.raw).toEqual({ sleep: 1, steps: 2 });
	});

	it('fills a fresh day from an empty stored row', () => {
		const merged = mergeDailyRow(undefined, { date: '2026-04-21', steps: 50 });
		expect(merged).toEqual({
			date: '2026-04-21',
			restingHr: null,
			hrvMs: null,
			sleepMin: null,
			steps: 50,
			raw: {},
		});
	});
});

describe('sync window', () => {
	it('resumes from the last sync time', () => {
		const last = new Date('2026-04-19T10:00:00Z');
		expect(syncSince(last, new Date('2026-04-20T10:00:00Z'))).toEqual(last);
	});

	it('looks back a bounded window on a first sync', () => {
		const now = new Date('2026-04-20T10:00:00Z');
		const since = syncSince(null, now);
		const days = (now.getTime() - since.getTime()) / (24 * 60 * 60 * 1000);
		expect(days).toBe(DEFAULT_SYNC_WINDOW_DAYS);
	});
});
