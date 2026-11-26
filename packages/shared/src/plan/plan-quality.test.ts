import { describe, expect, it } from 'vitest';
import { GOAL_PROFILES } from '../goal-profiles';
import { generatePlan } from './engine';
import type { PlanDraft } from './types';
import type { ScheduleBlock } from '../units';

/**
 * Plan-quality backtest.
 *
 * The engine's own tests pin a handful of specific plans. This one generates a
 * realistic matrix (every goal, every level, a low and a high weekly volume,
 * three to seven training days, with and without a race date, with and without
 * saved schedule windows) and asserts the hard invariants from
 * research/wave-6/plan-quality-rubric.md on every plan. A broken invariant fails
 * with the exact inputs and the week, so the case can be triaged on its own.
 *
 * It tests the core, not the surface: the volume shape, the long-run ceiling,
 * the quality count and spacing, rest days, token runs, the taper, the post-race
 * recovery weeks and the phase order. It never snapshots markup or pins a
 * specific distance, so the engine can still be tuned as long as the invariants
 * hold.
 */

/** The session archetypes that count as a hard quality session. */
const HARD_TYPES = new Set([
	'tempo',
	'interval',
	'hills',
	'race-pace',
	'threshold',
	'strides',
	'fartlek',
]);

/** The phases a plan builds through, before the taper and the post-race weeks. */
const BUILD_PHASES = new Set(['base', 'build', 'peak']);

/** Race distance in km per goal profile, for the goal's long-run peak. */
const RACE_KM: Record<string, number> = {
	marathon: 42.2,
	'half-marathon': 21.1,
	'10k': 10,
	'5k': 5,
};

const EXPERIENCES = ['beginner', 'intermediate', 'advanced'] as const;
type Experience = (typeof EXPERIENCES)[number];

/** Three to seven available days, 0 = Monday. */
const DAY_SETS: number[][] = [
	[0, 2, 4],
	[1, 3, 5],
	[0, 2, 4, 6],
	[0, 1, 3, 4, 6],
	[0, 1, 2, 3, 4, 5],
	[0, 1, 2, 3, 4, 5, 6],
];

/** A light week and a heavy one, in km. */
const WEEKLY_KM = [18, 85];

/** A Monday start, so a week's day offsets are weekdays. */
const START = '2026-11-30';
/** About eighteen weeks out, a realistic build for every race goal. */
const TARGET = '2027-04-12';

interface Case {
	slug: string;
	experience: Experience;
	weeklyKm: number;
	days: number[];
	targetDate?: string;
	schedule?: ScheduleBlock[];
}

function toHHMM(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * A window on every training day. Three hours is generous for an easy or a
 * quality session and tight for the longest runs, which is the realistic case
 * the placement logic is built for.
 */
function windowsFor(days: number[]): ScheduleBlock[] {
	return days.map((day) => ({ day, start: '06:00', end: toHHMM(6 * 60 + 180) }));
}

function label(c: Case): string {
	return [
		c.slug,
		c.experience,
		`${c.weeklyKm}km`,
		`days[${c.days.join(',')}]`,
		c.targetDate ? `target ${c.targetDate}` : 'no target',
		c.schedule ? 'schedule' : 'no schedule',
	].join(' / ');
}

/** Every case in the matrix. */
function matrix(): Case[] {
	const cases: Case[] = [];
	for (const profile of GOAL_PROFILES) {
		for (const experience of EXPERIENCES) {
			for (const weeklyKm of WEEKLY_KM) {
				for (const days of DAY_SETS) {
					for (const withTarget of [true, false]) {
						for (const withSchedule of [true, false]) {
							cases.push({
								slug: profile.slug,
								experience,
								weeklyKm,
								days,
								targetDate: withTarget ? TARGET : undefined,
								schedule: withSchedule ? windowsFor(days) : undefined,
							});
						}
					}
				}
			}
		}
	}
	return cases;
}

function build(c: Case): PlanDraft {
	const profile = GOAL_PROFILES.find((p) => p.slug === c.slug)!;
	return generatePlan({
		profile,
		baseline: { experience: c.experience, weeklyKm: c.weeklyKm },
		availableDays: c.days,
		startDate: START,
		targetDate: c.targetDate,
		schedule: c.schedule,
	});
}

/** The hard invariants, one key each. */
type Invariant =
	| 'progression'
	| 'longShare'
	| 'longCeiling'
	| 'qualityCount'
	| 'spacing'
	| 'rest'
	| 'token'
	| 'taper'
	| 'recovery'
	| 'phase';

/**
 * Every hard invariant from the rubric, checked against one plan. Returns the
 * violations grouped by invariant, each a readable line naming the week.
 */
function checkPlan(c: Case, plan: PlanDraft): Record<Invariant, string[]> {
	const out: Record<Invariant, string[]> = {
		progression: [],
		longShare: [],
		longCeiling: [],
		qualityCount: [],
		spacing: [],
		rest: [],
		token: [],
		taper: [],
		recovery: [],
		phase: [],
	};
	const profile = GOAL_PROFILES.find((p) => p.slug === c.slug)!;
	const minRest = c.experience === 'beginner' ? 2 : 1;
	const hardCap = c.experience === 'beginner' ? 1 : 2;

	const weeks = plan.weeks;
	const buildVolumes = weeks
		.filter((w) => BUILD_PHASES.has(w.phase))
		.map((w) => w.targetVolumeKm);
	const peak = buildVolumes.length ? Math.max(...buildVolumes) : 0;
	const firstTaper = weeks.findIndex((w) => w.phase === 'taper');

	// Phase order: base, build, peak, taper, then the post-race recovery weeks.
	const RANK: Record<string, number> = { base: 0, build: 1, peak: 2, taper: 3, recovery: 4 };
	for (let i = 1; i < weeks.length; i++) {
		const before = RANK[weeks[i - 1]!.phase] ?? 0;
		const after = RANK[weeks[i]!.phase] ?? 0;
		if (after < before) {
			out.phase.push(
				`week ${weeks[i]!.weekNumber} runs the phase backwards: ${weeks[i - 1]!.phase} then ${weeks[i]!.phase}`,
			);
		}
	}

	for (const week of weeks) {
		const runs = week.sessions.filter((s) => s.modality === 'running' && s.type !== 'race');
		const long = week.sessions.find((s) => s.type === 'long');
		const hard = week.sessions.filter((s) => HARD_TYPES.has(s.type));

		// Rest days: at least one, two for a beginner.
		const rest = [0, 1, 2, 3, 4, 5, 6].filter(
			(d) => !week.sessions.some((s) => s.day === d && s.modality !== 'mobility'),
		);
		if (rest.length < minRest) {
			out.rest.push(
				`week ${week.weekNumber} (${week.phase}) has ${rest.length} rest days, needs at least ${minRest}`,
			);
		}

		// Quality count: two a week at most, one for a beginner, none in recovery.
		if (hard.length > hardCap) {
			out.qualityCount.push(
				`week ${week.weekNumber} (${week.phase}) has ${hard.length} hard sessions, cap is ${hardCap}`,
			);
		}
		if (week.phase === 'recovery' && hard.length > 0) {
			out.qualityCount.push(
				`week ${week.weekNumber} (recovery) carries ${hard.length} hard sessions`,
			);
		}

		// Spacing: at least three days (two easy days) between hard sessions.
		const hardDays = hard.map((s) => s.day).sort((a, b) => a - b);
		for (let i = 1; i < hardDays.length; i++) {
			const gap = hardDays[i]! - hardDays[i - 1]!;
			if (gap < 3) {
				out.spacing.push(
					`week ${week.weekNumber} hard sessions on day ${hardDays[i - 1]} and day ${hardDays[i]} are ${gap} days apart, need at least 3`,
				);
			}
		}

		// No token runs: no running session under fifteen minutes.
		for (const s of runs) {
			if (s.durationMin < 15) {
				out.token.push(
					`week ${week.weekNumber} ${s.type} run is ${s.durationMin} min (${s.prescription.targetDistanceKm ?? '?'} km), a token run`,
				);
			}
		}

		// The long run: under the goal's own ceiling and under half the week.
		if (long) {
			const km = long.prescription.targetDistanceKm ?? 0;
			if (km > profile.longRun.maxKm + 0.05) {
				out.longCeiling.push(
					`week ${week.weekNumber} long run is ${km} km, over the goal ceiling of ${profile.longRun.maxKm} km`,
				);
			}
			if (week.targetVolumeKm > 0 && km > week.targetVolumeKm * 0.5 + 0.05) {
				out.longShare.push(
					`week ${week.weekNumber} long run ${km} km is ${Math.round((km / week.targetVolumeKm) * 100)}% of the week's ${week.targetVolumeKm} km, over 50%`,
				);
			}
		}

		// Recovery weeks: easy only, no long run, no strength, under the peak.
		if (week.phase === 'recovery') {
			if (long) out.recovery.push(`week ${week.weekNumber} (recovery) carries a long run`);
			if (week.sessions.some((s) => s.modality === 'strength')) {
				out.recovery.push(`week ${week.weekNumber} (recovery) carries strength work`);
			}
			if (week.targetVolumeKm > peak + 0.05) {
				out.recovery.push(
					`week ${week.weekNumber} (recovery) is ${week.targetVolumeKm} km, over the peak of ${peak} km`,
				);
			}
		}
	}

	// Weekly progression: no two-week rise in a build week exceeds thirty percent
	// over the week two before. A deload steps down, so a one-week rebound from it
	// is expected and is caught by this two-week window, not a single step.
	for (let i = 2; i < weeks.length; i++) {
		const base = weeks[i - 2]!;
		const cur = weeks[i]!;
		if (!BUILD_PHASES.has(base.phase) || !BUILD_PHASES.has(cur.phase)) continue;
		if (cur.targetVolumeKm > base.targetVolumeKm * 1.3 + 0.5) {
			out.progression.push(
				`week ${cur.weekNumber} volume ${cur.targetVolumeKm} km is over thirty percent above week ${base.weekNumber} ${base.targetVolumeKm} km`,
			);
		}
	}

	// Taper: volume falls off the peak and never rises across the taper weeks.
	const taper = weeks.filter((w) => w.phase === 'taper');
	for (let i = 0; i < taper.length; i++) {
		if (taper[i]!.targetVolumeKm > peak + 0.05) {
			out.taper.push(
				`taper week ${taper[i]!.weekNumber} is ${taper[i]!.targetVolumeKm} km, over the peak of ${peak} km`,
			);
		}
		if (i > 0 && taper[i]!.targetVolumeKm > taper[i - 1]!.targetVolumeKm + 0.05) {
			out.taper.push(
				`taper week ${taper[i]!.weekNumber} (${taper[i]!.targetVolumeKm} km) rises above taper week ${taper[i - 1]!.weekNumber} (${taper[i - 1]!.targetVolumeKm} km)`,
			);
		}
	}
	if (taper.length && taper[taper.length - 1]!.targetVolumeKm >= peak) {
		out.taper.push(
			`the taper does not reduce volume: the last taper week is ${taper[taper.length - 1]!.targetVolumeKm} km against a peak of ${peak} km`,
		);
	}

	// Phase shape: the heaviest build week lands before the taper starts.
	if (firstTaper > 0) {
		let peakIdx = 0;
		for (let i = 1; i < firstTaper; i++) {
			if (weeks[i]!.targetVolumeKm > weeks[peakIdx]!.targetVolumeKm) peakIdx = i;
		}
		if (weeks[peakIdx]!.targetVolumeKm <= weeks[firstTaper]!.targetVolumeKm) {
			out.phase.push(
				`the heaviest build week (${weeks[peakIdx]!.weekNumber}, ${weeks[peakIdx]!.targetVolumeKm} km) is not heavier than the first taper week (${weeks[firstTaper]!.weekNumber})`,
			);
		}
	}

	// A race goal with a race date: one race session, in a taper week.
	if (c.targetDate && profile.sessionTypes.includes('race')) {
		const raceWeek = weeks.find((w) => w.sessions.some((s) => s.type === 'race'));
		if (!raceWeek) {
			out.phase.push('a race goal with a race date has no race session');
		} else if (raceWeek.phase !== 'taper') {
			out.phase.push(`the race lands in a ${raceWeek.phase} week, not a taper week`);
		}
	}

	// The long-run arc: reach the goal peak where the weeks allow, or warn.
	if (c.targetDate && profile.longRun.peakFractionOfRace !== undefined) {
		const raceKm = RACE_KM[c.slug];
		const goalPeak = raceKm
			? Math.min(profile.longRun.maxKm, profile.longRun.peakFractionOfRace * raceKm)
			: 0;
		const buildWeeks = firstTaper >= 0 ? weeks.slice(0, firstTaper) : weeks;
		const built = Math.max(
			0,
			...buildWeeks.map(
				(w) => w.sessions.find((s) => s.type === 'long')?.prescription.targetDistanceKm ?? 0,
			),
		);
		if (goalPeak > 0 && built < goalPeak * 0.9) {
			const warned = (plan.meta.warnings ?? []).some((t) => t.includes('close the gap'));
			if (!warned) {
				out.phase.push(
					`the long run reaches ${built.toFixed(1)} km of the goal peak ${goalPeak.toFixed(1)} km with no warning`,
				);
			}
		}
	}

	return out;
}

const CASES = matrix();
const PLANS = CASES.map((c) => ({ c, plan: build(c) }));

/** All violations of one invariant across the matrix, each naming its case. */
function violationsFor(key: Invariant): string[] {
	const out: string[] = [];
	for (const { c, plan } of PLANS) {
		for (const message of checkPlan(c, plan)[key]) out.push(`${label(c)}: ${message}`);
	}
	return out;
}

/** Assert an invariant holds on every plan, naming the first cases that break it. */
function assertHolds(key: Invariant, title: string): void {
	const failures = violationsFor(key);
	const shown = failures.slice(0, 6);
	const more = failures.length > shown.length ? `\n...and ${failures.length - shown.length} more` : '';
	expect(
		failures.length,
		`${title}: ${failures.length} violating weeks across ${PLANS.length} plans\n${shown.join('\n')}${more}`,
	).toBe(0);
}

describe('plan-quality backtest (research/wave-6 rubric)', () => {
	it('covers the full realistic matrix', () => {
		// Every goal, three levels, two volumes, six day sets, target on and off,
		// schedule on and off.
		expect(PLANS.length).toBe(
			GOAL_PROFILES.length * EXPERIENCES.length * WEEKLY_KM.length * DAY_SETS.length * 4,
		);
	});

	it('keeps every build week under the two-week progression ceiling', () => {
		assertHolds('progression', 'weekly volume progression');
	});

	it('keeps the long run under half the week', () => {
		assertHolds('longShare', 'long-run share ceiling');
	});

	it('keeps the long run under the goal ceiling', () => {
		assertHolds('longCeiling', 'long-run absolute ceiling');
	});

	it('keeps the hard-session count within the cap', () => {
		assertHolds('qualityCount', 'quality session count');
	});

	it('leaves at least two easy days between hard sessions', () => {
		assertHolds('spacing', 'hard-session spacing');
	});

	it('never schedules a zero-rest week', () => {
		assertHolds('rest', 'rest days');
	});

	it('never schedules a token run', () => {
		assertHolds('token', 'no token runs');
	});

	it('tapers the volume down off the peak', () => {
		assertHolds('taper', 'taper reduction');
	});

	it('keeps the post-race recovery weeks easy and under the peak', () => {
		assertHolds('recovery', 'recovery weeks');
	});

	it('holds the phase shape and lands the race in the taper', () => {
		assertHolds('phase', 'phase shape');
	});
});
