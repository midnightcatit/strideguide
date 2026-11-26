import { describe, expect, it } from 'vitest';
import { composeSessionWhy, composeWeekWhy, sessionRole } from './why';
import type { PlannedSession } from './types';
import type { SessionWeekContext } from '../types';

/** A minimal planned session, so the tests read as the plan's own shape. */
function session(
	partial: Omit<Partial<PlannedSession>, 'type'> & { type: string; day: number },
): PlannedSession {
	return {
		slot: 'AM',
		modality: 'running',
		title: partial.type,
		purpose: '',
		prescription: { summary: '' },
		durationMin: 45,
		...partial,
	} as PlannedSession;
}

const buildWeek: SessionWeekContext = {
	weekNumber: 5,
	totalWeeks: 12,
	phase: 'build',
	focus: 'Build: add quality',
	volumeKm: 50,
	prevVolumeKm: 46,
	longKm: 18,
	peakLongKm: 18,
};

describe('sessionRole', () => {
	it('reads the role from the session type', () => {
		expect(sessionRole('long')).toBe('long');
		expect(sessionRole('tempo')).toBe('quality');
		expect(sessionRole('race-pace')).toBe('quality');
		expect(sessionRole('easy')).toBe('easy');
		expect(sessionRole('recovery')).toBe('recovery');
		expect(sessionRole('machine-circuit')).toBe('strength');
		expect(sessionRole('mobility')).toBe('mobility');
		expect(sessionRole('cross-train')).toBe('cross');
		expect(sessionRole('race')).toBe('race');
		expect(sessionRole('mystery')).toBe('other');
	});
});

describe('composeSessionWhy', () => {
	it('a quality day explains the easy days around it', () => {
		const weekSessions = [
			session({ type: 'tempo', day: 2 }),
			session({ type: 'easy', day: 3 }),
			session({ type: 'race-pace', day: 5 }),
		];
		const why = composeSessionWhy({ session: weekSessions[0]!, weekSessions });
		expect(why?.role).toContain('hard session');
		expect(why?.dayReason).toBe('There are 2 easy days between this and your next hard session.');
	});

	it('a long run explains where the week sits on the arc', () => {
		const long = session({ type: 'long', day: 6 });
		const why = composeSessionWhy({ session: long, weekSessions: [long], week: buildWeek });
		expect(why?.planContext).toContain('Week 5 of 12');
		expect(why?.planContext).toContain('longest long run of the plan');
	});

	it('a long run that steps back says so, not that it is the peak', () => {
		const long = session({ type: 'long', day: 6 });
		const why = composeSessionWhy({
			session: long,
			weekSessions: [long],
			week: { ...buildWeek, longKm: 15, longRunDips: true },
		});
		expect(why?.planContext).toContain('eases back this week');
		expect(why?.planContext).not.toContain('longest long run');
	});

	it('a recovery day explains the day after a long run', () => {
		const long = session({ type: 'long', day: 4 });
		const recovery = session({ type: 'recovery', day: 5, modality: 'recovery' });
		const why = composeSessionWhy({ session: recovery, weekSessions: [long, recovery] });
		expect(why?.dayReason).toContain('the day after the long run');
	});

	it('a session with no context yields no invented reason', () => {
		const unknown = composeSessionWhy({ session: session({ type: 'mystery', day: 0 }) });
		expect(unknown).toBeUndefined();

		const plain = composeSessionWhy({ session: session({ type: 'easy', day: 3 }) });
		expect(plain?.role).toBeTruthy();
		expect(plain?.dayReason).toBeUndefined();
		expect(plain?.planContext).toBeUndefined();
	});

	it('names the goal and how far the race is', () => {
		const easy = session({ type: 'easy', day: 1 });
		const why = composeSessionWhy({
			session: easy,
			weekSessions: [easy],
			week: buildWeek,
			goal: { name: 'Half Marathon', weeksToRace: 7 },
		});
		expect(why?.planContext).toContain('Your Half Marathon is 7 weeks away.');
	});

	it('says a start time came from the runner, when one was set', () => {
		const long = session({
			type: 'long',
			day: 6,
			prescription: { summary: '', timeStart: '08:00' },
		});
		const why = composeSessionWhy({ session: long, weekSessions: [long], week: buildWeek });
		expect(why?.dayReason).toContain('08:00');
		expect(why?.dayReason).toContain('window you saved');
		expect(why?.planContext).toContain('Week 5 of 12');
	});
});

describe('composeWeekWhy', () => {
	it('a base week explains what the phase is for', () => {
		const why = composeWeekWhy({
			phase: 'base',
			volumeKm: 30,
			prevVolumeKm: 28,
			longKm: 8,
			peakLongKm: 19,
		});
		expect(why).toContain('Base weeks build your easy running');
		// A base week with a long run still building says where that run sits.
		expect(why).toContain('the long run is building toward its peak');
	});

	it('a peak week says what the phase sharpens', () => {
		const why = composeWeekWhy({ phase: 'peak', longKm: 0 });
		expect(why).toContain('Peak weeks sharpen you and rehearse your goal pace');
	});

	it('a taper week explains its shape, not a stepback', () => {
		const why = composeWeekWhy({
			phase: 'taper',
			volumeKm: 20,
			prevVolumeKm: 40,
			longKm: 12,
			peakLongKm: 19,
		})!.toLowerCase();
		expect(why).toContain('the taper cuts your volume');
		expect(why).toContain('the long run comes down with the taper');
		expect(why).not.toContain('stepback');
	});

	it('a stepback week explains the dip, not a climb', () => {
		const why = composeWeekWhy({
			phase: 'build',
			volumeKm: 40,
			prevVolumeKm: 46,
			longKm: 15,
			peakLongKm: 19,
			longRunDips: true,
		})!.toLowerCase();
		expect(why).toContain('this week is a deliberate stepback');
		expect(why).toContain('the long run eases back before building again');
		expect(why).not.toContain('builds on the last one');
	});

	it('announces the next phase on the week before it turns', () => {
		const why = composeWeekWhy({
			phase: 'build',
			volumeKm: 50,
			prevVolumeKm: 46,
			longKm: 18,
			peakLongKm: 18,
			nextPhase: 'taper',
		})!.toLowerCase();
		expect(why).toContain('your longest run of the plan is this week');
		expect(why).toContain('the taper block starts next week');
	});

	it('names the final week of the plan', () => {
		const why = composeWeekWhy({ phase: 'recovery', isLast: true })!.toLowerCase();
		expect(why).toContain('the weeks after the race stay easy');
		expect(why).toContain('this is the final week of the plan');
	});

	it('yields nothing invented when there is nothing true to say', () => {
		expect(composeWeekWhy({})).toBeUndefined();
		expect(composeWeekWhy({ phase: 'mystery' })).toBeUndefined();
		// A first week with no week to compare against, no long run and no next.
		expect(composeWeekWhy({ phase: 'mystery', longKm: 0, peakLongKm: 0 })).toBeUndefined();
	});

	it('never prints a distance', () => {
		const why = composeWeekWhy({
			phase: 'build',
			volumeKm: 50,
			prevVolumeKm: 40,
			longKm: 18,
			peakLongKm: 18,
		});
		expect(why).not.toMatch(/\d+\s*(km|mi|kilometres?|kilometers?|miles?)/i);
	});
});
