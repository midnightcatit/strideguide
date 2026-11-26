import { describe, expect, it } from 'vitest';
import {
	LOAD_DEFAULTS,
	applyLoadToShapes,
	loadCurve,
	loadPoints,
	loadReadout,
	loadWeekShapes,
	loggedDailyLoads,
	readLoad,
	readinessScore,
	resolveLoadConfig,
	scoreSession,
	stricterIntent,
	thresholdPaceFromVdot,
	type DailyLoad,
	type LoadEntry,
	type LoadRead,
	type LoadWeek,
} from './load';
import { pacesFromVdot } from './vdot';

const ONE_HOUR = 3600;

describe('scoreSession', () => {
	it('scores a prescribed run on pace against the threshold pace', () => {
		// 12 km in an hour is 5:00/km, exactly threshold, so one hour is 100 points.
		const at = scoreSession({
			modality: 'running',
			distanceKm: 12,
			durationSec: ONE_HOUR,
			thresholdPaceSecPerKm: 300,
		});
		expect(at).toEqual({ load: 100, method: 'pace' });
		// Slower than threshold: 0.8 of the intensity, squared, so 64 points.
		const slow = scoreSession({
			modality: 'running',
			distanceKm: 9.6,
			durationSec: ONE_HOUR,
			thresholdPaceSecPerKm: 300,
		});
		expect(slow?.load).toBeCloseTo(64, 0);
		expect(slow?.method).toBe('pace');
	});

	it('refines a completed session with session-RPE when one is logged', () => {
		// RPE 6 for an hour sits at the threshold anchor, so 100 points, same scale.
		const easy = scoreSession({
			modality: 'running',
			distanceKm: 10,
			durationSec: ONE_HOUR,
			rpe: 6,
			completed: true,
			thresholdPaceSecPerKm: 300,
		});
		expect(easy).toEqual({ load: 100, method: 'srpe' });
		// RPE 8 for half an hour is harder than the anchor, above 100 points.
		const hard = scoreSession({
			modality: 'running',
			distanceKm: 6,
			durationSec: 1800,
			rpe: 8,
			completed: true,
			thresholdPaceSecPerKm: 300,
		});
		expect(hard?.method).toBe('srpe');
		expect(hard!.load).toBeCloseTo(88.9, 0);
	});

	it('falls back to pace for a completed run with no RPE', () => {
		const s = scoreSession({
			modality: 'running',
			distanceKm: 10,
			durationSec: ONE_HOUR,
			completed: true,
			thresholdPaceSecPerKm: 300,
		});
		expect(s?.method).toBe('pace');
	});

	it('estimates an hr load only when an average heart rate, age and rest are present', () => {
		const s = scoreSession({
			modality: 'running',
			durationSec: ONE_HOUR,
			avgHr: 160,
			age: 40,
			restHr: 50,
		});
		expect(s?.method).toBe('hr');
		expect(s!.load).toBeGreaterThan(50);
		expect(scoreSession({ modality: 'running', durationSec: ONE_HOUR, avgHr: 160 })).toBeNull();
	});

	it('scores nothing for a non-run, or a run with no usable input', () => {
		expect(scoreSession({ modality: 'strength', distanceKm: 5, durationSec: ONE_HOUR })).toBeNull();
		expect(scoreSession({ modality: 'running' })).toBeNull();
		// A run with a distance but no threshold pace and no hr can score nothing.
		expect(
			scoreSession({ modality: 'running', distanceKm: 10, durationSec: ONE_HOUR, completed: true }),
		).toBeNull();
	});
});

describe('loadPoints', () => {
	it('makes an hour at threshold effort 100 points', () => {
		expect(loadPoints(1, ONE_HOUR)).toBe(100);
		expect(loadPoints(0.5, 2 * ONE_HOUR)).toBe(50);
	});
});

describe('loadCurve', () => {
	it('matches a hand-computed EWMA for a constant load', () => {
		// Tau 2 and 1 give clean numbers. Load 100 each day, from a zero seed:
		// day 1 fitness 50, fatigue 100; day 2 fitness 75; day 3 fitness 87.5.
		const daily: DailyLoad[] = [
			{ date: '2026-01-01', load: 100 },
			{ date: '2026-01-02', load: 100 },
			{ date: '2026-01-03', load: 100 },
		];
		const curve = loadCurve(daily, { fitnessDays: 2, fatigueDays: 1 });
		expect(curve.map((p) => p.fitness)).toEqual([50, 75, 87.5]);
		expect(curve.map((p) => p.fatigue)).toEqual([100, 100, 100]);
		expect(curve.map((p) => p.form)).toEqual([-50, -25, -12.5]);
	});

	it('uses the conventional 42 and 7 day constants by default', () => {
		const curve = loadCurve([{ date: '2026-01-01', load: 42 }]);
		// fitness = 0 + (42 - 0)/42 = 1; fatigue = 0 + (42 - 0)/7 = 6; form = -5.
		expect(curve[0]).toMatchObject({ fitness: 1, fatigue: 6, form: -5 });
	});

	it('fills gaps with zero so the averages advance every day', () => {
		const curve = loadCurve(
			[
				{ date: '2026-01-01', load: 100 },
				{ date: '2026-01-04', load: 100 },
			],
			{ fitnessDays: 2, fatigueDays: 1 },
		);
		expect(curve).toHaveLength(4);
		// Day 2 and 3 are rest: fatigue decays from 100 straight toward zero.
		expect(curve[1]!.load).toBe(0);
		expect(curve[1]!.fatigue).toBe(0);
		// Day 4's load lifts it again.
		expect(curve[3]!.fatigue).toBe(100);
	});

	it('sums two sessions logged on the same day', () => {
		const curve = loadCurve(
			[
				{ date: '2026-01-01', load: 40 },
				{ date: '2026-01-01', load: 60 },
			],
			{ fitnessDays: 2, fatigueDays: 1 },
		);
		expect(curve[0]!.load).toBe(100);
	});
});

describe('thresholdPaceFromVdot', () => {
	it('matches the VDOT module threshold pace and refuses a missing VDOT', () => {
		expect(thresholdPaceFromVdot(45)!).toBeCloseTo(pacesFromVdot(45).threshold, 6);
		expect(thresholdPaceFromVdot(undefined)).toBeUndefined();
		expect(thresholdPaceFromVdot(0)).toBeUndefined();
	});
});

describe('readinessScore', () => {
	it('reads fully ready with no signal, and lowers for each flag, only downward', () => {
		expect(readinessScore(null).score).toBe(1);
		const strained = readinessScore({
			days: 7,
			restingHrElevated: true,
			hrvSuppressed: true,
			shortSleep: false,
			lowSpo2: false,
			respiratoryRateElevated: false,
			sleepTempElevated: false,
			strained: true,
		});
		expect(strained.score).toBeCloseTo(0.55, 2);
		expect(strained.factors).toContain('HRV is down');
		// The score can never exceed 1.
		expect(readinessScore({ days: 7, strained: false } as never).score).toBeLessThanOrEqual(1);
	});
});

describe('resolveLoadConfig', () => {
	it('defaults to off with the conventional constants', () => {
		const c = resolveLoadConfig(null);
		expect(c.mode).toBe('off');
		expect(c.tunables).toEqual({ fitnessDays: 42, fatigueDays: 7 });
		expect(c.formFloor).toBeUndefined();
	});

	it('reads a stored switch and tunables, and rejects a bad mode', () => {
		const c = resolveLoadConfig({
			loadModel: { mode: 'shadow', fitnessDays: 30, fatigueDays: 5, formFloor: -20 },
		});
		expect(c.mode).toBe('shadow');
		expect(c.tunables).toEqual({ fitnessDays: 30, fatigueDays: 5 });
		expect(c.formFloor).toBe(-20);
		expect(resolveLoadConfig({ loadModel: { mode: 'nonsense' as never } }).mode).toBe('off');
	});
});

describe('loadWeekShapes', () => {
	it('applies only in apply mode and only ever eases or holds', () => {
		const read = {
			mode: 'apply',
			weekIntents: [{ weekNumber: 3, intent: 'ease', reason: 'r', form: -30, targetFitness: 10 }],
		} as unknown as LoadRead;
		expect(loadWeekShapes(read).get(3)?.volumeIntent).toBe('ease');
		expect(loadWeekShapes({ ...read, mode: 'shadow' } as LoadRead).size).toBe(0);
		expect(loadWeekShapes({ ...read, mode: 'advisory' } as LoadRead).size).toBe(0);
		expect(loadWeekShapes(undefined).size).toBe(0);
	});
});

describe('stricterIntent', () => {
	it('always returns the lower intent, so a build cannot survive an ease', () => {
		expect(stricterIntent('build', 'ease')).toBe('ease');
		expect(stricterIntent('build', 'hold')).toBe('hold');
		expect(stricterIntent('hold', 'ease')).toBe('ease');
		expect(stricterIntent('ease', 'hold')).toBe('ease');
		expect(stricterIntent(undefined, 'hold')).toBe('hold');
	});
});

describe('applyLoadToShapes', () => {
	it('lowers an AI build to the model ease, and never raises a week', () => {
		const shapes = [{ volumeIntent: 'build' as const }, undefined, { volumeIntent: 'ease' as const }];
		const read = {
			mode: 'apply',
			weekIntents: [
				{ weekNumber: 1, intent: 'ease', reason: 'form low', form: -30, targetFitness: 5 },
				{ weekNumber: 2, intent: 'hold', reason: 'near floor', form: -20, targetFitness: 5 },
				{ weekNumber: 3, intent: 'hold', reason: 'near floor', form: -20, targetFitness: 5 },
			],
		} as unknown as LoadRead;
		const out = applyLoadToShapes(shapes, read, [1, 2, 3]);
		expect(out[0]).toMatchObject({ volumeIntent: 'ease', loadNote: 'form low' });
		expect(out[1]).toMatchObject({ volumeIntent: 'hold' });
		// Week 3 already eased, so the model's hold cannot raise it back.
		expect(out[2]!.volumeIntent).toBe('ease');
	});

	it('is a no-op unless the mode is apply', () => {
		const shapes = [{ volumeIntent: 'build' as const }];
		const read = { mode: 'shadow', weekIntents: [] } as unknown as LoadRead;
		expect(applyLoadToShapes(shapes, read, [1])).toBe(shapes);
	});
});

/* ------------------------- the whole read, on a synthetic history ------------------------- */

const THRESHOLD = 300; // 5:00/km

/** Four weeks of running, four runs a week, as logged sessions. */
function fourWeekHistory(): LoadEntry[] {
	const out: LoadEntry[] = [];
	const start = Date.parse('2026-01-05T00:00:00Z');
	// Runs on Mon, Tue, Thu, Sun each week, roughly 8, 10, 6 and 16 km, easy.
	const plan = [
		[8, 10, 6, 16],
		[9, 10, 6, 18],
		[8, 9, 6, 14],
		[10, 11, 7, 18],
	];
	plan.forEach((week, w) => {
		[0, 1, 3, 6].forEach((day, i) => {
			const km = week[i]!;
			out.push({
				date: new Date(start + (w * 7 + day) * 86400000).toISOString(),
				modality: 'running',
				distanceKm: km,
				durationSec: Math.round(km * (THRESHOLD + 30)),
				avgPaceSecPerKm: THRESHOLD + 30,
				rpe: i === 2 ? 6 : 4,
			});
		});
	});
	return out;
}

/** A plan whose future weeks carry a rising long run, for the model to read. */
function planWeeks(): LoadWeek[] {
	const make = (weekNumber: number, startDate: string, longKm: number, easyKm: number[]): LoadWeek => ({
		weekNumber,
		startDate,
		endDate: new Date(Date.parse(`${startDate}T00:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10),
		sessions: [
			{ day: 0, modality: 'running', durationMin: Math.round((easyKm[0]! / 10) * 60), prescription: { targetDistanceKm: easyKm[0] } },
			{ day: 2, modality: 'running', durationMin: Math.round((easyKm[1]! / 10) * 60), prescription: { targetDistanceKm: easyKm[1] } },
			{ day: 6, modality: 'running', durationMin: Math.round((longKm / 10) * 60), prescription: { targetDistanceKm: longKm } },
		],
	});
	return [
		make(5, '2026-02-02', 20, [8, 6]),
		make(6, '2026-02-09', 24, [9, 7]),
		make(7, '2026-02-16', 26, [9, 8]),
	];
}

function readWith(overrides: Partial<Parameters<typeof readLoad>[0]> = {}): LoadRead {
	return readLoad({
		weeks: planWeeks(),
		today: '2026-02-01',
		logged: fourWeekHistory(),
		thresholdPaceSecPerKm: THRESHOLD,
		experience: 'intermediate',
		config: { ...LOAD_DEFAULTS, mode: 'shadow' },
		...overrides,
	});
}

describe('readLoad', () => {
	it('stays silent when the model is off', () => {
		const read = readWith({ config: { ...LOAD_DEFAULTS, mode: 'off' } });
		expect(read.available).toBe(false);
		expect(read.weekIntents).toHaveLength(0);
	});

	it('stays silent with no threshold pace or a thin history', () => {
		expect(readWith({ thresholdPaceSecPerKm: undefined }).available).toBe(false);
		expect(readWith({ logged: fourWeekHistory().slice(0, 3) }).available).toBe(false);
	});

	it('reads a fitness, fatigue and form from the four-week history, and never builds', () => {
		const read = readWith();
		expect(read.available).toBe(true);
		// A runner who has been training has fitness above zero and a form near zero.
		expect(read.fitness).toBeGreaterThan(0);
		expect(read.fatigue).toBeGreaterThan(0);
		expect(read.form).toBeCloseTo(read.fitness - read.fatigue, 1);
		expect(loadReadout(read)?.status).toBeTruthy();
		// Every intent is an ease or a hold: never a build.
		for (const w of read.weekIntents) expect(['ease', 'hold']).toContain(w.intent);
	});

	it('records what it would change in shadow, and changes nothing', () => {
		// A high form floor forces the model to want to ease every week ahead.
		const read = readWith({ config: { ...LOAD_DEFAULTS, mode: 'shadow', formFloor: 100 } });
		expect(read.weekIntents.length).toBeGreaterThan(0);
		expect(read.shadow.length).toBe(read.weekIntents.length);
		for (const change of read.shadow) {
			expect(change.toVolumeKm).toBeLessThanOrEqual(change.fromVolumeKm);
		}
		// Shadow never applies: the shapes it would hand the engine are empty.
		expect(loadWeekShapes(read).size).toBe(0);
	});

	it('produces intents the engine may apply only in apply mode', () => {
		const read = readWith({ config: { ...LOAD_DEFAULTS, mode: 'apply', formFloor: 100 } });
		expect(loadWeekShapes(read).size).toBe(read.weekIntents.length);
	});

	it('lets readiness lower the nearest week but never raise load', () => {
		const strained = {
			days: 7,
			restingHrElevated: true,
			hrvSuppressed: true,
			shortSleep: true,
			lowSpo2: false,
			respiratoryRateElevated: false,
			sleepTempElevated: false,
			strained: true,
		};
		// No floor trigger; readiness alone should ease the first week ahead.
		const read = readWith({
			recovery: strained,
			config: { ...LOAD_DEFAULTS, mode: 'apply', formFloor: -1000 },
		});
		expect(read.weekIntents[0]?.intent).toBe('ease');
		expect(read.weekIntents[0]?.weekNumber).toBe(5);
		expect(read.readiness.score).toBeLessThan(0.6);
	});

	it('loggedDailyLoads scores an sRPE session on rpe, not pace', () => {
		const daily = loggedDailyLoads(
			[{ date: '2026-01-01T00:00:00Z', modality: 'running', distanceKm: 10, durationSec: 3600, rpe: 6 }],
			{ thresholdPaceSecPerKm: THRESHOLD },
		);
		expect(daily[0]!.load).toBe(100);
	});
});
