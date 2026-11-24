import { describe, expect, it } from 'vitest';
import type { GoogleDataPoint, GoogleRollupDataPoint } from './google-health';
import {
	activeEnergyByDate,
	activeMinutesByDate,
	activeZoneMinutesByDate,
	altitudeGainByDate,
	civilDateFromInstant,
	combineDailyPatches,
	dateFromGoogleDate,
	distanceByDate,
	floorsByDate,
	healthRowValues,
	heartRateRollupByDate,
	mapBloodGlucose,
	mapBodyFat,
	mapCoreBodyTemperature,
	mapDailyHeartRateVariability,
	mapDailyOxygenSaturation,
	mapDailyRespiratoryRate,
	mapDailyRestingHeartRate,
	mapDailySleepTemperature,
	mapDailyVo2Max,
	mapExercise,
	mapHeight,
	mapSleep,
	mapWeight,
	mergeDailyPatch,
	modalityForExerciseType,
	parseDurationSeconds,
	parseUtcOffsetSeconds,
	sedentaryMinutesByDate,
	stepsByDate,
	syncSince,
	totalCaloriesRollupByDate,
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
	it('keys minutes asleep and the stage minutes by the civil day the session ended', () => {
		const patch = mapSleep({
			name: 'users/1/dataTypes/sleep/dataPoints/s1',
			sleep: {
				interval: {
					startTime: '2026-04-20T22:30:00Z',
					startUtcOffset: '-14400s',
					endTime: '2026-04-21T06:30:00Z',
					endUtcOffset: '-14400s',
				},
				summary: {
					minutesAsleep: '455',
					stagesSummary: [
						{ type: 'DEEP', minutes: '60', count: '4' },
						{ type: 'REM', minutes: '90', count: '5' },
						{ type: 'LIGHT', minutes: '280', count: '20' },
						{ type: 'AWAKE', minutes: '25', count: '7' },
					],
				},
			},
		});
		expect(patch).toEqual({
			date: '2026-04-21',
			metrics: {
				sleep_min: 455,
				sleep_deep_min: 60,
				sleep_rem_min: 90,
				sleep_light_min: 280,
				sleep_awake_min: 25,
			},
			raw: { sleep: expect.any(Object) },
		});
	});

	it('skips a session with no usable end time', () => {
		expect(mapSleep({ sleep: { interval: { startTime: '', endTime: '' } } })).toBeNull();
	});
});

describe('daily vitals', () => {
	it('maps resting heart rate and HRV keeping the decimal', () => {
		expect(
			mapDailyRestingHeartRate({
				dailyRestingHeartRate: { date: { year: 2026, month: 4, day: 20 }, beatsPerMinute: '52' },
			}),
		).toMatchObject({ date: '2026-04-20', metrics: { resting_hr: 52 } });

		expect(
			mapDailyHeartRateVariability({
				dailyHeartRateVariability: {
					date: { year: 2026, month: 4, day: 20 },
					averageHeartRateVariabilityMilliseconds: 45.6,
				},
			}),
		).toMatchObject({ date: '2026-04-20', metrics: { hrv_ms: 45.6 } });
	});

	it('maps the SpO2 average with its confidence band as low and high', () => {
		const patch = mapDailyOxygenSaturation({
			dailyOxygenSaturation: {
				date: { year: 2026, month: 4, day: 20 },
				averagePercentage: 96.2,
				lowerBoundPercentage: 94.4,
				upperBoundPercentage: 97.9,
			},
		});
		expect(patch).toMatchObject({
			date: '2026-04-20',
			metrics: { spo2_avg: 96.2, spo2_low: 94.4, spo2_high: 97.9 },
		});
	});

	it('maps respiratory rate, VO2 max and nightly temperature', () => {
		expect(
			mapDailyRespiratoryRate({
				dailyRespiratoryRate: { date: { year: 2026, month: 4, day: 20 }, breathsPerMinute: 14.5 },
			}),
		).toMatchObject({ metrics: { respiratory_rate: 14.5 } });

		expect(
			mapDailyVo2Max({ dailyVo2Max: { date: { year: 2026, month: 4, day: 20 }, vo2Max: 52.3 } }),
		).toMatchObject({ metrics: { vo2_max: 52.3 } });

		expect(
			mapDailySleepTemperature({
				dailySleepTemperatureDerivations: {
					date: { year: 2026, month: 4, day: 20 },
					nightlyTemperatureCelsius: 33.4,
				},
			}),
		).toMatchObject({ metrics: { sleep_temp_c: 33.4 } });
	});

	it('drops a daily point with no value instead of storing zero', () => {
		expect(mapDailyOxygenSaturation({ dailyOxygenSaturation: { date: { year: 2026, month: 4, day: 20 } } })).toBeNull();
		expect(mapDailyRestingHeartRate({ dailyRestingHeartRate: { date: { year: 2026, month: 4, day: 20 } } })).toBeNull();
	});
});

describe('interval sums', () => {
	it('sums minutely step intervals into daily totals', () => {
		const points: GoogleDataPoint[] = [
			{ steps: { interval: { startTime: '2026-04-20T23:00:00Z', startUtcOffset: '0s', endTime: '2026-04-20T23:01:00Z' }, count: '100' } },
			{ steps: { interval: { startTime: '2026-04-20T23:01:00Z', startUtcOffset: '0s', endTime: '2026-04-20T23:02:00Z' }, count: '250' } },
			{ steps: { interval: { startTime: '2026-04-21T08:00:00Z', startUtcOffset: '0s', endTime: '2026-04-21T08:01:00Z' }, count: '50' } },
		];
		const patches = stepsByDate(points);
		expect(patches).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ date: '2026-04-20', metrics: { steps: 350 } }),
				expect.objectContaining({ date: '2026-04-21', metrics: { steps: 50 } }),
			]),
		);
		expect(patches).toHaveLength(2);
	});

	it('converts distance millimetres to metres and energy to kilocalories', () => {
		expect(
			distanceByDate([
				{ distance: { interval: { startTime: '2026-04-20T08:00:00Z', endTime: '2026-04-20T08:30:00Z' }, millimeters: '1500000' } },
				{ distance: { interval: { startTime: '2026-04-20T09:00:00Z', endTime: '2026-04-20T09:30:00Z' }, millimeters: '500000' } },
			]),
		).toEqual([{ date: '2026-04-20', metrics: { distance_m: 2000 }, raw: { distance_m: expect.any(Array) } }]);

		expect(
			activeEnergyByDate([
				{ activeEnergyBurned: { interval: { startTime: '2026-04-20T08:00:00Z', endTime: '2026-04-20T08:30:00Z' }, kcal: 320.5 } },
			]),
		).toEqual([{ date: '2026-04-20', metrics: { active_energy_kcal: 320.5 }, raw: { active_energy_kcal: expect.any(Array) } }]);
	});

	it('sums floors, active zone minutes and active minutes per day', () => {
		expect(
			floorsByDate([{ floors: { interval: { startTime: '2026-04-20T08:00:00Z', endTime: '2026-04-20T08:30:00Z' }, count: '7' } }]),
		).toMatchObject([{ metrics: { floors: 7 } }]);

		expect(
			activeZoneMinutesByDate([
				{
					activeZoneMinutes: {
						interval: { startTime: '2026-04-20T08:00:00Z', endTime: '2026-04-20T08:30:00Z' },
						activeZoneMinutes: '30',
					},
				},
			]),
		).toMatchObject([{ metrics: { active_zone_min: 30 } }]);

		expect(
			activeMinutesByDate([
				{
					activeMinutes: {
						interval: { startTime: '2026-04-20T08:00:00Z', endTime: '2026-04-20T08:30:00Z' },
						activeMinutesByActivityLevel: [
							{ activityLevel: 'LIGHT', activeMinutes: '20' },
							{ activityLevel: 'MODERATE', activeMinutes: '15' },
						],
					},
				},
			]),
		).toMatchObject([{ metrics: { active_min: 35 } }]);
	});

	it('keeps altitude gain signed and sums sedentary durations in minutes', () => {
		expect(
			altitudeGainByDate([
				{ altitude: { interval: { startTime: '2026-04-20T08:00:00Z', endTime: '2026-04-20T08:30:00Z' }, gainMillimeters: '120000' } },
				{ altitude: { interval: { startTime: '2026-04-20T09:00:00Z', endTime: '2026-04-20T09:30:00Z' }, gainMillimeters: '-20000' } },
			]),
		).toMatchObject([{ metrics: { altitude_gain_m: 100 } }]);

		expect(
			sedentaryMinutesByDate([
				{
					sedentaryPeriod: {
						interval: { startTime: '2026-04-20T08:00:00Z', endTime: '2026-04-20T08:30:00Z' },
					},
				},
			]),
		).toMatchObject([{ metrics: { sedentary_min: 30 } }]);
	});
});

describe('rollup mappers', () => {
	it('reads the daily heart rate minimum, average and maximum', () => {
		const points: GoogleRollupDataPoint[] = [
			{
				startTime: '2026-04-20T00:00:00Z',
				heartRate: { beatsPerMinuteMin: 48.4, beatsPerMinuteAvg: 72.6, beatsPerMinuteMax: 168.2 },
			},
		];
		expect(heartRateRollupByDate(points)).toEqual([
			{
				date: '2026-04-20',
				metrics: { hr_min: 48, hr_avg: 73, hr_max: 168 },
				raw: { heartRateRollup: expect.any(Object) },
			},
		]);
	});

	it('reads the daily total calories sum', () => {
		const points: GoogleRollupDataPoint[] = [
			{ startTime: '2026-04-20T00:00:00Z', totalCalories: { kcalSum: 2410.7 } },
		];
		expect(totalCaloriesRollupByDate(points)).toEqual([
			{ date: '2026-04-20', metrics: { total_calories_kcal: 2410.7 }, raw: { totalCaloriesRollup: expect.any(Object) } },
		]);
	});

	it('skips a window with no value', () => {
		expect(heartRateRollupByDate([{ startTime: '2026-04-20T00:00:00Z' }])).toEqual([]);
	});
});

describe('sample mappers', () => {
	it('converts weight grams to kilograms and keeps the sample instant', () => {
		const row = mapWeight({
			weight: { sampleTime: { physicalTime: '2026-04-20T07:00:00Z', utcOffset: '-14400s' }, weightGrams: 72400 },
		});
		expect(row).toMatchObject({ metric: 'weight_kg', value: 72.4, unit: 'kg' });
		expect(row!.sampleTime.toISOString()).toBe('2026-04-20T07:00:00.000Z');
	});

	it('maps body fat, height, core temperature and blood glucose with units', () => {
		expect(
			mapBodyFat({ bodyFat: { sampleTime: { physicalTime: '2026-04-20T07:00:00Z' }, percentage: 18.2 } }),
		).toMatchObject({ metric: 'body_fat_pct', value: 18.2, unit: '%' });

		expect(
			mapHeight({ height: { sampleTime: { physicalTime: '2026-04-20T07:00:00Z' }, heightMillimeters: '1800000' } }),
		).toMatchObject({ metric: 'height_mm', value: 1800000, unit: 'mm' });

		expect(
			mapCoreBodyTemperature({
				coreBodyTemperature: { sampleTime: { physicalTime: '2026-04-20T07:00:00Z' }, temperatureCelsius: 37.1 },
			}),
		).toMatchObject({ metric: 'core_temp_c', value: 37.1, unit: 'C' });

		expect(
			mapBloodGlucose({
				bloodGlucose: { sampleTime: { physicalTime: '2026-04-20T07:00:00Z' }, bloodGlucoseMilligramsPerDeciliter: 95 },
			}),
		).toMatchObject({ metric: 'blood_glucose_mgdl', value: 95, unit: 'mg/dL' });
	});

	it('returns null when the value or its time is missing, so nothing is stored', () => {
		expect(mapWeight({ weight: { weightGrams: 72400 } })).toBeNull();
		expect(mapWeight({ weight: { sampleTime: { physicalTime: '2026-04-20T07:00:00Z' } } })).toBeNull();
		expect(mapBodyFat({ bodyFat: { sampleTime: { physicalTime: '2026-04-20T07:00:00Z' } } })).toBeNull();
	});
});

describe('daily merge and projection', () => {
	it('folds several data types on one day into a single metrics map', () => {
		const combined = combineDailyPatches([
			{ date: '2026-04-20', metrics: { sleep_min: 455 } },
			{ date: '2026-04-20', metrics: { resting_hr: 52, steps: 8000 } },
			{ date: '2026-04-20', metrics: { hrv_ms: 45.6, spo2_avg: 96 } },
		]);
		expect(combined).toHaveLength(1);
		expect(combined[0]!.metrics).toEqual({
			sleep_min: 455,
			resting_hr: 52,
			steps: 8000,
			hrv_ms: 45.6,
			spo2_avg: 96,
		});
	});

	it('keeps a stored metric when the incoming patch omits it', () => {
		const stored = { date: '2026-04-20', metrics: { resting_hr: 52, sleep_min: 455 } };
		const merged = mergeDailyPatch(stored, { date: '2026-04-20', metrics: { steps: 400 } });
		expect(merged.metrics).toEqual({ resting_hr: 52, sleep_min: 455, steps: 400 });
	});

	it('projects only the four legacy columns into a health_daily row', () => {
		expect(
			healthRowValues({
				date: '2026-04-21',
				metrics: { steps: 50, resting_hr: 51, hrv_ms: 60, sleep_min: 430, spo2_avg: 97, distance_m: 5000 },
			}),
		).toEqual({ restingHr: 51, hrvMs: 60, sleepMin: 430, steps: 50 });

		expect(healthRowValues({ date: '2026-04-21', metrics: { spo2_avg: 97 } })).toEqual({
			restingHr: null,
			hrvMs: null,
			sleepMin: null,
			steps: null,
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
