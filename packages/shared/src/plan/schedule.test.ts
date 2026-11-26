import { describe, expect, it } from 'vitest';
import { placeSessions, scheduleWarnings } from './schedule';
import type { PlannedSession } from './types';

const session = (over: Partial<PlannedSession> = {}): PlannedSession => ({
	day: 0,
	slot: 'AM',
	modality: 'running',
	type: 'easy',
	title: 'Easy run',
	purpose: 'Aerobic base.',
	durationMin: 40,
	prescription: { summary: 'Easy run, conversational.' },
	...over,
});

describe('placeSessions', () => {
	it('leaves the sessions untouched when there is no schedule', () => {
		const sessions = [session()];
		const result = placeSessions(sessions, undefined, [0, 2, 4]);
		expect(result.sessions).toBe(sessions);
		expect(result.unplaced).toEqual([]);
		expect(result.noWindowsOnTrainingDays).toBe(false);
	});

	it('gives a session a start time inside a window on its own day', () => {
		const result = placeSessions([session({ day: 2 })], [{ day: 2, start: '06:00', end: '07:30' }], [
			0, 2, 4,
		]);
		expect(result.unplaced).toEqual([]);
		expect(result.sessions[0]!.day).toBe(2);
		expect(result.sessions[0]!.prescription.timeStart).toBe('06:00');
	});

	it('spreads a day’s sessions across its windows instead of stacking them', () => {
		const strength = session({ day: 2, modality: 'strength', type: 'machine-circuit', durationMin: 45 });
		const mobility = session({ day: 2, modality: 'mobility', type: 'mobility', durationMin: 12 });
		const result = placeSessions(
			[strength, mobility],
			[
				{ day: 2, start: '06:00', end: '07:00' },
				{ day: 2, start: '18:00', end: '19:00' },
			],
			[0, 2, 4],
		);
		const times = result.sessions.map((s) => s.prescription.timeStart);
		expect(new Set(times).size).toBe(2);
		expect(times).toContain('06:00');
		expect(times).toContain('18:00');
	});

	it('moves a session to another of the runner’s days when its own day is too short', () => {
		const long = session({ day: 4, durationMin: 60, title: 'Long run', type: 'long' });
		const result = placeSessions(
			[long],
			[
				{ day: 4, start: '18:00', end: '18:30' },
				{ day: 0, start: '06:00', end: '07:30' },
			],
			[0, 2, 4],
		);
		expect(result.unplaced).toEqual([]);
		expect(result.sessions[0]!.day).toBe(0);
		expect(result.sessions[0]!.prescription.timeStart).toBe('06:00');
	});

	it('leaves a session with no time when its own day has no window', () => {
		const result = placeSessions([session({ day: 0 })], [{ day: 2, start: '06:00', end: '07:30' }], [
			0, 2, 4,
		]);
		expect(result.unplaced).toEqual([]);
		expect(result.sessions[0]!.prescription.timeStart).toBeUndefined();
	});

	it('keeps a race off the schedule and a cross-training session on its sport day', () => {
		const race = session({ day: 6, durationMin: 120, title: 'Race', type: 'race' });
		const sport = session({ day: 5, modality: 'recovery', type: 'cross-train', title: 'Soccer' });
		const result = placeSessions(
			[race, sport],
			[{ day: 4, start: '18:00', end: '20:00' }],
			[4, 5, 6],
		);
		expect(result.unplaced).toEqual([]);
		expect(result.sessions.find((s) => s.type === 'race')!.prescription.timeStart).toBeUndefined();
		const cross = result.sessions.find((s) => s.type === 'cross-train')!;
		expect(cross.day).toBe(5);
		expect(cross.prescription.timeStart).toBeUndefined();
	});

	it('does not place a session when every window is on a day the runner does not train', () => {
		const result = placeSessions([session({ day: 0 })], [{ day: 1, start: '06:00', end: '07:00' }], [
			0, 2, 4,
		]);
		expect(result.noWindowsOnTrainingDays).toBe(true);
		expect(result.sessions[0]!.prescription.timeStart).toBeUndefined();
	});

	it('is deterministic', () => {
		const make = () => [
			session({ day: 2, durationMin: 30 }),
			session({ day: 4, durationMin: 50, title: 'Long run', type: 'long' }),
		];
		const windows = [
			{ day: 2, start: '06:00', end: '07:00' },
			{ day: 4, start: '18:00', end: '19:00' },
		];
		const a = placeSessions(make(), windows, [0, 2, 4]);
		const b = placeSessions(make(), windows, [0, 2, 4]);
		expect(a.sessions.map((s) => [s.day, s.prescription.timeStart])).toEqual(
			b.sessions.map((s) => [s.day, s.prescription.timeStart]),
		);
	});
});

describe('scheduleWarnings', () => {
	it('names the session, the length it needs and the day it affects', () => {
		const warnings = scheduleWarnings([{ title: 'Long run', day: 4, needMin: 90 }], false);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('long run');
		expect(warnings[0]).toContain('Friday');
		expect(warnings[0]).toContain('1 hour 30 minutes');
		expect(warnings[0]).toContain('cannot fit it in');
	});

	it('says a repeated problem once, at its longest need', () => {
		const warnings = scheduleWarnings(
			[
				{ title: 'Long run', day: 4, needMin: 50 },
				{ title: 'Long run', day: 4, needMin: 70 },
			],
			false,
		);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('1 hour 10 minutes');
	});

	it('warns once when every window is on a non-training day', () => {
		const warnings = scheduleWarnings([], true);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('none of them fall on the days you can train');
	});
});
