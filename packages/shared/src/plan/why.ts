/**
 * Composing a session's reason, and a week's, from the plan's own data.
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
 * The week's own reason (composeWeekWhy) works the same way: what its phase is
 * for, how its volume moves, where its long run sits on the arc, and what comes
 * next, each said only when the plan carries the fact.
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

/**
 * The area a mobility session works, read from its own title. The focused
 * routines name their area ("Hips and glutes", "Hamstrings and calves"), so a
 * mobility session can say what it works on without leaning on a run. The
 * general routine names no area, so this returns undefined and the caller keeps
 * a plain line. Nothing is invented: the area is the one the plan already names.
 */
const MOBILITY_AREAS = [
	'hips and glutes',
	'hamstrings and calves',
	'ankles and feet',
	'upper back and shoulders',
];

function mobilityArea(session: PlannedSession): string | undefined {
	const title = session.title.toLowerCase();
	return MOBILITY_AREAS.find((area) => title.startsWith(area));
}

function roleText(
	role: SessionRole,
	session: PlannedSession,
	weekSessions?: PlannedSession[],
): string | undefined {
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
		case 'mobility': {
			const area = mobilityArea(session);
			return area
				? `This is mobility work for your ${area}.`
				: 'This is mobility work to keep you moving well.';
		}
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
	// Paired with a run or a strength session, the day line says so, which is true
	// whenever one really sits on the same day. On its own day there is no run to
	// name, so the line says what the mobility work is for instead.
	if (other) return `It pairs with the ${ROLE_NOUN[other]} you already have that day.`;
	const area = mobilityArea(session);
	return area
		? `It sits on its own day, focused on your ${area}.`
		: 'It sits on a day with no other session.';
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
		// The load model's own reason, when it eased or held the week. It is always
		// true: it names the modelled form and the floor, never a distance.
		if (week.loadNote) parts.push(week.loadNote);
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
	const roleLine = roleText(role, input.session, input.weekSessions);
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

/* ------------------------------ week reason ------------------------------- */

/**
 * What each phase is for, in one plain sentence. The wording stays broad enough
 * to be true for any profile that names the phase: whole-fitness, for instance,
 * has base and build weeks but no hard sessions, so the build line names the
 * climb, not the quality. Unit-free and beginner-readable on purpose.
 */
const PHASE_PURPOSE: Record<string, string> = {
	base: 'Base weeks build your easy running, the aerobic foundation everything later rests on.',
	build: 'Build weeks push on from the base.',
	peak: 'Peak weeks sharpen you and rehearse your goal pace.',
	taper: 'The taper cuts your volume so you arrive at the race fresh, with short efforts to keep your legs sharp.',
	recovery: 'The weeks after the race stay easy, to let the effort settle in.',
};

/**
 * The week-level facts a week's own reason is composed from. Beyond the phase,
 * every field is optional, so a week with nothing true to say yields nothing.
 * Distances are km and are never printed: the interface converts, and this text
 * stays unit-free.
 */
export interface WeekWhyInput {
	/** The week's phase: base, build, peak, taper or recovery. */
	phase?: string;
	/** This week's running volume target, in km. Engine-internal; never printed. */
	volumeKm?: number;
	/** Last week's running volume target, in km, when there is one. */
	prevVolumeKm?: number;
	/** The model's volume intent for this week, when it set one. */
	volumeIntent?: 'ease' | 'hold' | 'build';
	/** This week's long-run target in km; 0 or absent when the week has none. */
	longKm?: number;
	/** The plan's biggest long run, in km. */
	peakLongKm?: number;
	/** True when this week's long run steps back from last week's. */
	longRunDips?: boolean;
	/** The phase that follows this week, when the plan has a later week. */
	nextPhase?: string;
	/** True when this is the plan's last week. */
	isLast?: boolean;
}

/** One plain sentence on what the week's phase is for. */
function phasePurpose(phase?: string): string | undefined {
	return phase ? PHASE_PURPOSE[phase] : undefined;
}

/** How the week's volume moves, said only when there is something to compare. */
function volumeMoveText(input: WeekWhyInput): string | undefined {
	const { phase, volumeKm, prevVolumeKm, volumeIntent } = input;
	// A taper or recovery week's shape is its phase, already said above.
	if (phase === 'taper' || phase === 'recovery') return undefined;
	if (volumeIntent === 'build') return 'this week builds on the last one';
	if (volumeIntent === 'ease') return 'this week eases the volume back';
	if (volumeIntent === 'hold') return 'this week holds about the same volume as last week';
	if (volumeKm === undefined || prevVolumeKm === undefined) return undefined;
	if (volumeKm < prevVolumeKm - 0.05)
		return 'this week is a deliberate stepback so you absorb the training';
	if (volumeKm > prevVolumeKm + 0.05) return 'this week builds on the last one';
	return 'this week holds about the same volume as last week';
}

/** Where the week's long run sits on the plan's arc. */
function weekLongRunArcText(input: WeekWhyInput): string | undefined {
	const { phase, longKm, peakLongKm, longRunDips } = input;
	const long = longKm ?? 0;
	const peak = peakLongKm ?? 0;
	// A recovery week has no long run, and its phase line already says so.
	if (phase === 'recovery') return undefined;
	if (phase === 'taper') return 'the long run comes down with the taper';
	if (long <= 0) return undefined;
	if (peak > 0 && long >= peak - 0.05) return 'your longest run of the plan is this week';
	if (longRunDips) return 'the long run eases back before building again';
	if (peak > 0 && peak > long + 0.05) return 'the long run is building toward its peak';
	return undefined;
}

/** What the plan moves to after this week. */
function weekNextText(input: WeekWhyInput): string | undefined {
	const { phase, nextPhase, isLast } = input;
	if (nextPhase && nextPhase !== phase) return `the ${nextPhase} block starts next week`;
	if (isLast) return 'this is the final week of the plan';
	return undefined;
}

/** Capitalise the first letter and close the sentence with a full stop. */
function asSentence(text: string): string {
	const t = text.trim();
	return t.charAt(0).toUpperCase() + t.slice(1) + (t.endsWith('.') ? '' : '.');
}

/**
 * The reason a week is shaped as it is, for the plan overview: what its phase is
 * for, how its volume moves, where its long run sits on the plan's arc, and what
 * comes next. At most two sentences, so a week list stays readable, and unit-free
 * so a mile reader sees the same wording as a kilometre reader. Every sentence
 * follows from a fact the plan carries; a part with nothing true to say is left
 * out, and a week with no true fact at all returns undefined. A turn in the plan
 * (a new phase, the final week) is always kept, paired with the most telling of
 * the week's own facts.
 */
export function composeWeekWhy(input: WeekWhyInput): string | undefined {
	const sentences: string[] = [];
	const purpose = phasePurpose(input.phase);
	if (purpose) sentences.push(purpose);
	const move = volumeMoveText(input);
	const arc = weekLongRunArcText(input);
	const next = weekNextText(input);
	const clauses = next
		? [arc ?? move, next].filter((c): c is string => !!c)
		: [move, arc].filter((c): c is string => !!c).slice(0, 2);
	if (clauses.length) sentences.push(asSentence(clauses.join(', and ')));
	return sentences.length ? sentences.join(' ') : undefined;
}
