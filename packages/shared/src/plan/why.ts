/**
 * Composing a session's reason from the plan's own data.
 *
 * A session should be able to say why it is this workout, why it sits on this
 * day, and how it fits the runner's plan and goal. Every sentence here follows
 * from something the engine actually decided: the phase and week focus, the goal
 * and how far the race is, the session's role in the week, where the week sits
 * on the long-run arc, the week's volume intent, the sessions on the days either
 * side, and the runner's saved windows when one set a start time. Nothing is
 * invented. A part with nothing true to say is left out, so the interface can
 * fall back to the plain one-line purpose instead.
 *
 * The day reasoning is grounded in research/wave-6/plan-structure.md: hard
 * sessions want two or three easy days between them, the long run is the week's
 * anchor and normally sits off the hardest quality day, the day after a long run
 * is rest or a very easy run, and a week's volume is weighted toward the long
 * run rather than spread evenly. No distance is ever printed here: the engine
 * works in km and the interface converts. Time is fine, since windows and
 * durations are time.
 */
import type { PlannedSession } from './types';
import type { SessionWhy, SessionWeekContext, SessionGoalContext } from '../types';

/** The role a session plays in the week, from its type alone. */
export type SessionRole =
	| 'long'
	| 'quality'
	| 'easy'
	| 'recovery'
	| 'strength'
	| 'mobility'
	| 'cross'
	| 'race'
	| 'other';

const QUALITY_TYPES = new Set([
	'tempo',
	'threshold',
	'interval',
	'race-pace',
	'strides',
	'hills',
	'fartlek',
]);

/** The session's role in the week, read from its type. */
export function sessionRole(type: string): SessionRole {
	switch (type) {
		case 'long':
			return 'long';
		case 'easy':
			return 'easy';
		case 'recovery':
			return 'recovery';
		case 'machine-circuit':
		case 'full-body-strength':
			return 'strength';
		case 'mobility':
			return 'mobility';
		case 'cross-train':
			return 'cross';
		case 'race':
			return 'race';
		default:
			return QUALITY_TYPES.has(type) ? 'quality' : 'other';
	}
}

/** A plain noun for a role, so one session can name another. */
const ROLE_NOUN: Record<SessionRole, string> = {
	long: 'long run',
	quality: 'hard session',
	easy: 'easy run',
	recovery: 'recovery run',
	strength: 'strength session',
	mobility: 'mobility work',
	cross: 'cross-training',
	race: 'race',
	other: 'session',
};

export interface SessionWhyInput {
	session: PlannedSession;
	/** The week's final sessions, so the days either side are known. */
	weekSessions?: PlannedSession[];
	/** The week's shape, phase and long-run arc. Omit when there is none. */
	week?: SessionWeekContext;
	/** The goal and how far the race is. Omit for a goal with no race. */
	goal?: SessionGoalContext;
}

/* ------------------------------- role line -------------------------------- */

function roleText(role: SessionRole, weekSessions?: PlannedSession[]): string | undefined {
	switch (role) {
		case 'long':
			return "This is the week's anchor run, the longest run of the week.";
		case 'quality': {
			const n = weekSessions?.filter((s) => sessionRole(s.type) === 'quality').length ?? 0;
			return n >= 2 ? `This is one of the week's ${n} hard sessions.` : "This is the week's hard session.";
		}
		case 'easy':
			return "This is an easy run, the bulk of the week's running.";
		case 'recovery':
			return 'This is an easy day to help you recover.';
		case 'strength':
			return 'This is strength work that supports your running.';
		case 'mobility':
			return 'This is mobility work to keep your stride healthy.';
		case 'cross':
			return 'This is low-impact work that spares your running legs.';
		case 'race':
			return 'This is race day, the goal the plan points at.';
		default:
			return undefined;
	}
}

/* ------------------------------- day line --------------------------------- */

function rolesOnDay(
	sessions: PlannedSession[],
	day: number,
	exclude: PlannedSession,
): SessionRole[] {
	return sessions.filter((s) => s.day === day && s !== exclude).map((s) => sessionRole(s.type));
}

function longDayReason(session: PlannedSession, sessions: PlannedSession[]): string | undefined {
	const before = rolesOnDay(sessions, session.day - 1, session);
	const after = rolesOnDay(sessions, session.day + 1, session);
	const isLast = !sessions.some((s) => s.day > session.day);
	const clauses: string[] = [];
	if (isLast) clauses.push('It sits at the end of your training week.');
	else if (!after.length) clauses.push('The day after is left free.');
	if (!before.length) clauses.push('The day before is a rest day.');
	else if (before.includes('easy')) clauses.push('The day before is kept easy.');
	return clauses.length ? clauses.join(' ') : undefined;
}

function qualityDayReason(session: PlannedSession, sessions: PlannedSession[]): string | undefined {
	const others = sessions.filter((s) => s !== session && sessionRole(s.type) === 'quality');
	if (!others.length) return undefined;
	const nearest = Math.min(...others.map((s) => Math.abs(s.day - session.day)));
	const gap = nearest - 1;
	if (gap >= 2) {
		return others.length === 1
			? `There are ${gap} easy days between this and your next hard session.`
			: `There are ${gap} easy days between your hard sessions.`;
	}
	if (gap === 1) return 'An easy day separates your hard sessions.';
	return undefined;
}

function easyDayReason(session: PlannedSession, sessions: PlannedSession[]): string | undefined {
	const before = rolesOnDay(sessions, session.day - 1, session);
	const after = rolesOnDay(sessions, session.day + 1, session);
	if (before.includes('long'))
		return 'It comes the day after the long run, to add easy blood flow without more hard work.';
	if (before.includes('quality'))
		return 'It comes the day after a hard session, to add easy volume without more load.';
	if (after.includes('long')) return 'It is the easy day before the long run.';
	if (after.includes('quality'))
		return 'It is the easy day before a hard session, keeping the hard work spaced out.';
	return undefined;
}

function recoveryDayReason(
	session: PlannedSession,
	sessions: PlannedSession[],
): string | undefined {
	const before = rolesOnDay(sessions, session.day - 1, session);
	const after = rolesOnDay(sessions, session.day + 1, session);
	if (before.includes('long'))
		return 'It comes the day after the long run, to help you recover without more hard work.';
	if (before.includes('quality')) return 'It comes the day after a hard session, to help you recover.';
	if (after.includes('long')) return 'It is the easy day before the long run, kept light.';
	return undefined;
}

function strengthDayReason(
	session: PlannedSession,
	sessions: PlannedSession[],
): string | undefined {
	const sameDay = rolesOnDay(sessions, session.day, session);
	if (sameDay.includes('mobility'))
		return 'It shares the day with your mobility work, so the week stays compact.';
	if (sameDay.some((r) => r === 'easy' || r === 'quality' || r === 'long' || r === 'recovery'))
		return 'It shares the day with your running.';
	return 'It is on its own day, so it does not stack with a run.';
}

function mobilityDayReason(
	session: PlannedSession,
	sessions: PlannedSession[],
): string | undefined {
	const sameDay = rolesOnDay(sessions, session.day, session).filter((r) => r !== 'mobility');
	const other = sameDay[0];
	if (other) return `It pairs with the ${ROLE_NOUN[other]} you already have that day.`;
	return 'It sits on a day with no other session.';
}

function dayReasonFor(
	role: SessionRole,
	session: PlannedSession,
	weekSessions?: PlannedSession[],
): string | undefined {
	if (!weekSessions?.length) return undefined;
	switch (role) {
		case 'long':
			return longDayReason(session, weekSessions);
		case 'quality':
			return qualityDayReason(session, weekSessions);
		case 'easy':
			return easyDayReason(session, weekSessions);
		case 'recovery':
			return recoveryDayReason(session, weekSessions);
		case 'strength':
			return strengthDayReason(session, weekSessions);
		case 'mobility':
			return mobilityDayReason(session, weekSessions);
		case 'cross':
			return `It is on your ${session.title} day, and the running is kept off it.`;
		default:
			return undefined;
	}
}

/* ------------------------------ plan context ------------------------------ */

function weekShapeText(week: SessionWeekContext): string | undefined {
	if (week.phase === 'taper')
		return 'The taper cuts the volume while keeping the hard work, so you arrive fresh.';
	if (week.volumeIntent === 'ease') return 'This week eases the volume back.';
	if (week.volumeIntent === 'hold') return 'This week holds about the same volume as last week.';
	if (week.volumeIntent === 'build') return 'This week builds on last week.';
	if (
		week.phase !== 'recovery' &&
		week.prevVolumeKm !== undefined &&
		week.volumeKm < week.prevVolumeKm - 0.05
	)
		return 'This is a lighter stepback week, on purpose.';
	return undefined;
}

function raceText(goal: SessionGoalContext): string | undefined {
	if (goal.weeksToRace === undefined) return undefined;
	if (goal.weeksToRace === 0) return 'This is race week.';
	if (goal.weeksToRace > 0)
		return `Your ${goal.name} is ${goal.weeksToRace} week${goal.weeksToRace === 1 ? '' : 's'} away.`;
	return `Your ${goal.name} is behind you, so this week is easy.`;
}

/**
 * Where the week's long run sits on the plan's arc. It is always said for the
 * long run itself, and only when notable for the other running sessions, so a
 * plain easy day is not padded with a line that says nothing new.
 */
function longRunArcText(session: PlannedSession, week: SessionWeekContext): string | undefined {
	const isLong = session.type === 'long';
	if (week.phase === 'recovery' || week.longKm <= 0) {
		return isLong ? 'There is no long run this week, so you recover.' : undefined;
	}
	if (week.phase === 'taper') return 'The long run comes down with the taper.';
	if (week.longKm >= week.peakLongKm - 0.05) return 'This is the longest long run of the plan.';
	if (week.longRunDips) return 'The long run eases back this week before building again.';
	return isLong ? 'The long run is building toward its peak.' : undefined;
}

function planContext(
	session: PlannedSession,
	week?: SessionWeekContext,
	goal?: SessionGoalContext,
): string | undefined {
	const parts: string[] = [];
	if (week) {
		const focus = week.focus ? ` ${week.focus}.` : '';
		parts.push(`Week ${week.weekNumber} of ${week.totalWeeks}.${focus}`);
	}
	if (goal) {
		const race = raceText(goal);
		if (race) parts.push(race);
	}
	if (week) {
		const shape = weekShapeText(week);
		if (shape) parts.push(shape);
		if (session.modality === 'running' && session.type !== 'race') {
			const arc = longRunArcText(session, week);
			if (arc) parts.push(arc);
		}
	}
	return parts.length ? parts.join(' ') : undefined;
}

/* ------------------------------ composition ------------------------------- */

/**
 * Build the structured reason for a session. Returns undefined when there is
 * nothing true to say, so the caller keeps its plain fallback.
 */
export function composeSessionWhy(input: SessionWhyInput): SessionWhy | undefined {
	const role = sessionRole(input.session.type);
	const roleLine = roleText(role, input.weekSessions);
	const dayBase = dayReasonFor(role, input.session, input.weekSessions);
	// A saved window sets a start time, so say the session sits in it. The detail
	// view shows the time itself; here it belongs to why the day works.
	const start = input.session.prescription.timeStart;
	const dayLine = start
		? [dayBase, `It starts at ${start}, inside the window you saved.`].filter(Boolean).join(' ')
		: dayBase;
	const planLine = planContext(input.session, input.week, input.goal);
	const out: SessionWhy = {};
	if (roleLine) out.role = roleLine;
	if (dayLine) out.dayReason = dayLine;
	if (planLine) out.planContext = planLine;
	return Object.keys(out).length ? out : undefined;
}
