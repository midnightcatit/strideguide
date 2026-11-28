import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { D1Database } from '@cloudflare/workers-types';
import { asc, and, desc, eq, gte, inArray, isNotNull, isNull, or } from 'drizzle-orm';
import {
	GOAL_PROFILES,
	customWorkoutArchetype,
	customWorkoutNotes,
	customWorkoutToStructured,
	generatePlan,
} from '@strideguide/shared';
import {
	WORKOUT_LIBRARY,
	adaptPlan,
	applyLoadToShapes,
	deriveHistory,
	fitnessState,
	loadReadout,
	machinesForPreset,
	planSeed,
	readLoad,
	rebuildFromWeekOne,
	resolveLoadConfig,
	summarizePreviousWeeks,
	thresholdPaceFromVdot,
	weekChangeNote,
	weekOnePattern,
	recoverySignal,
	REST_CARD_NOTE,
} from '@strideguide/shared/plan';
import { compareDaySessions } from '../lib/session-order';
import { reconcileSessions } from '../lib/plan-reconcile';
import { buildPlanChange, MAX_AI_WEEKS } from '../lib/plan-change';
import type { AdaptLog, AdaptWeek, PlanChangeContext } from '@strideguide/shared/plan';
import type { LoadEntry, LoadRead, LoadWeek } from '@strideguide/shared/plan';
import type { RecoverySignal } from '@strideguide/shared/plan';
import type {
	Baseline,
	Modality,
	PlanDraft,
	PlannedWeek,
	PlanInput,
	QualityKind,
	SessionArchetype,
	SessionPrescription,
	StepBlock,
	WeekShape,
	WorkoutStep,
} from '@strideguide/shared';
import { DEFAULT_PREFS, ageFromBirthYear, type Prefs } from '@strideguide/shared/units';
import { schema } from '../db';
import type { Db } from '../db';
import { narrateAndStore, reviewPlan, templateWeekSummary } from '../lib/narration';
import { rephraseAndStore, type StoredWhyInput } from '../lib/session-why';
import { shapePlan } from '../lib/plan-shape';
import { equipmentPrefsPatchSchema } from '../lib/prefs-schema';
import { changeStoredPrefs, d1PrefsStore, type PrefsChange } from '../lib/prefs-store';
import { readCustomWorkouts } from '../lib/custom-workouts';
import { availableDaysSchema, goalSlugSchema, targetDateSchema } from '../lib/goal-schema';
import { syncGoalProfiles } from '../lib/goal-profiles';
import { prescriptionSchema } from '../lib/prescription-schema';
import { checkRateLimit } from '../lib/rate-limit';
import { loadHealthDaysFromMetrics } from '../lib/health-metrics';
import type { AppBindings } from '../types';

const plans = new Hono<AppBindings>();

export function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

/**
 * The week columns the table stores: drop the row-only fields the insert does
 * not carry. New columns flow through automatically, so a persisted field like
 * `phase` is never silently dropped here.
 */
export function weekRowValues<T extends { sessionRows: unknown; targetVolumeKm: number }>(
	rows: T[],
): Omit<T, 'sessionRows' | 'targetVolumeKm'>[] {
	return rows.map(({ sessionRows: _s, targetVolumeKm: _t, ...rest }) => rest);
}

/** A session a rebuild wants stored, as the route hands it to the reconcile. */
interface DesiredSessionRow {
	day: number;
	slot: string;
	modality: Modality;
	type: string;
	title: string;
	purpose: string;
	prescription: SessionPrescription;
	durationMin: number;
}

/** A stored week and the session identities the reconcile matches on. */
export interface StoredWeek {
	id: string;
	weekNumber: number;
	sessions: { id: string; day: number; slot: string | null; type: string }[];
}

/** A rebuilt week to store, with its sessions. */
export interface DesiredWeek {
	weekNumber: number;
	phase: string;
	focus: string;
	summaryText: string;
	startDate: string;
	endDate: string;
	sessions: DesiredSessionRow[];
}

function sessionValues(session: DesiredSessionRow, planWeekId: string) {
	return {
		planWeekId,
		day: session.day,
		slot: session.slot,
		modality: session.modality,
		type: session.type,
		title: session.title,
		purpose: session.purpose,
		prescription: session.prescription,
		durationMin: session.durationMin,
	};
}

/**
 * Store a plan's rebuilt weeks without churning session ids. A week keyed by
 * week number is updated in place, so its id (and the sessions' ids) survive; a
 * session whose day, slot and type are unchanged keeps its id too, so its log,
 * session state and confirmed activity stay attached. Only a genuinely new
 * session is inserted, and only a session the rebuild dropped is removed. The
 * runner's own note on a session is never overwritten, since the rebuild does
 * not carry notes.
 */
export async function replaceWeeks(
	db: Db,
	planId: string,
	stored: StoredWeek[],
	desired: DesiredWeek[],
): Promise<Map<number, string>> {
	const byNumber = new Map(stored.map((w) => [w.weekNumber, w]));
	const weekIdByNumber = new Map<number, string>();
	for (const week of desired) {
		const existing = byNumber.get(week.weekNumber);
		const weekId = existing?.id ?? crypto.randomUUID();
		weekIdByNumber.set(week.weekNumber, weekId);
		if (existing) {
			await db
				.update(schema.planWeeks)
				.set({
					phase: week.phase,
					focus: week.focus,
					summaryText: week.summaryText,
					startDate: week.startDate,
					endDate: week.endDate,
				})
				.where(eq(schema.planWeeks.id, weekId));
		} else {
			await db.insert(schema.planWeeks).values({
				id: weekId,
				planId,
				weekNumber: week.weekNumber,
				phase: week.phase,
				focus: week.focus,
				summaryText: week.summaryText,
				startDate: week.startDate,
				endDate: week.endDate,
			});
		}

		const { updates, inserts, deletes } = reconcileSessions(existing?.sessions ?? [], week.sessions);
		for (const { id, session } of updates) {
			await db
				.update(schema.sessionsPlan)
				.set(sessionValues(session, weekId))
				.where(eq(schema.sessionsPlan.id, id));
		}
		for (const session of inserts) {
			await db
				.insert(schema.sessionsPlan)
				.values({ id: crypto.randomUUID(), ...sessionValues(session, weekId) });
		}
		for (const id of deletes) {
			await db.delete(schema.sessionsPlan).where(eq(schema.sessionsPlan.id, id));
		}
	}

	// A rebuilt plan can be shorter than the stored one, so drop any week from the
	// rebuilt range the engine no longer carries, with its sessions.
	const fromWeek = desired.reduce((min, w) => Math.min(min, w.weekNumber), Number.POSITIVE_INFINITY);
	if (!Number.isFinite(fromWeek)) return weekIdByNumber;
	const keep = new Set(desired.map((w) => w.weekNumber));
	for (const w of stored) {
		if (w.weekNumber >= fromWeek && !keep.has(w.weekNumber)) {
			await db.delete(schema.planWeeks).where(eq(schema.planWeeks.id, w.id));
		}
	}
	return weekIdByNumber;
}

/** The runner's app preferences, with defaults merged. */
export async function loadPrefs(db: Db, userId: string): Promise<Prefs> {
	const rows = await db
		.select()
		.from(schema.settings)
		.where(eq(schema.settings.userId, userId))
		.limit(1);
	return { ...DEFAULT_PREFS, ...(rows[0]?.prefs ?? {}) };
}

/** Merge a partial prefs patch into the runner's settings, guarded so a prefs write landing at the same time (a workout save, say) is never clobbered. */
async function upsertPrefs(
	db: D1Database,
	userId: string,
	patch: Partial<Prefs>,
): Promise<PrefsChange> {
	return changeStoredPrefs(d1PrefsStore(db), userId, (prefs) => ({
		ok: true,
		prefs: { ...prefs, ...patch },
	}));
}

/** The machines to build a circuit from: an explicit override, else the gym preset. */
export function resolveMachines(prefs: Prefs): string[] | undefined {
	if (prefs.machineItems?.length) return prefs.machineItems;
	return machinesForPreset(prefs.gymPreset);
}

/** A logged session as the load model scores it, with its plan modality resolved. */
function loadEntriesFrom(
	logs: { sessionId: string | null; runStats: unknown; rpe: number | null; startedAt: Date | string | null }[],
	modalityById: Map<string, string>,
): LoadEntry[] {
	return logs.map((l) => {
		const stats = (l.runStats ?? {}) as {
			distanceKm?: number;
			durationSec?: number;
			avgPaceSecPerKm?: number;
			avgHr?: number;
		};
		return {
			date: l.startedAt instanceof Date ? l.startedAt.toISOString() : l.startedAt,
			modality: l.sessionId ? (modalityById.get(l.sessionId) ?? null) : null,
			distanceKm: stats.distanceKm ?? null,
			durationSec: stats.durationSec ?? null,
			avgPaceSecPerKm: stats.avgPaceSecPerKm ?? null,
			rpe: l.rpe ?? null,
			avgHr: stats.avgHr ?? null,
		};
	});
}

/**
 * Build the load model's read for a runner: score their logs, extend with the
 * plan's own planned load, and decide where it would ease or hold. Best-effort:
 * a missing threshold pace or a thin history returns a silent read, so the plan
 * is exactly as the engine built it.
 */
async function buildLoadRead(args: {
	d1: AppBindings['Bindings']['DB'];
	userId: string;
	weeks: LoadWeek[];
	today: string;
	logs: LoadEntry[];
	thresholdPaceSecPerKm?: number;
	experience?: string;
	prefs: Prefs;
}): Promise<LoadRead> {
	const config = resolveLoadConfig(args.prefs);
	if (config.mode === 'off') {
		return readLoad({ weeks: [], today: args.today, logged: [], config });
	}
	let recovery: RecoverySignal | null = null;
	try {
		const health = await loadHealthDaysFromMetrics(args.d1, args.userId, 21);
		if (health?.days.length) recovery = recoverySignal(health.days);
	} catch {
		// No health data: the model runs on the runner's training alone.
	}
	return readLoad({
		weeks: args.weeks,
		today: args.today,
		logged: args.logs,
		thresholdPaceSecPerKm: args.thresholdPaceSecPerKm,
		experience: args.experience,
		recovery,
		config,
		restHr: args.prefs.restingHr,
		age: ageFromBirthYear(args.prefs.birthYear),
	});
}

/**
 * The load model's state to store on the plan's params (existing JSON, no schema
 * change). In shadow and advisory it records what it would have changed and
 * applies nothing; in apply it records what it did. Absent when the model is
 * silent or off.
 */
function loadModelState(read?: LoadRead) {
	if (!read?.available) return undefined;
	const out = loadReadout(read);
	return {
		mode: read.mode,
		fitness: read.fitness,
		fatigue: read.fatigue,
		form: read.form,
		readiness: read.readiness.score,
		at: new Date().toISOString(),
		shadow: read.shadow,
		applied: read.mode === 'apply' && read.weekIntents.length > 0,
		...(out ? { status: out.status } : {}),
	};
}

/**
 * The params JSON stored on a new plan: the engine's numbers, the review text
 * and the load model's read, plus the engine's own warnings when it left any.
 * Existing JSON column, so no schema change. The warnings ride back with the
 * plan on GET /current and the plan overview reads them there.
 */
export function planParams(draft: PlanDraft, review: { text: string }, loadRead?: LoadRead) {
	return {
		vdot: draft.meta.vdot ?? null,
		baseWeeklyKm: draft.meta.baseWeeklyKm,
		totalWeeks: draft.meta.totalWeeks,
		// The plan review shown in the review step. Unit-free, so it reads the
		// same whatever units the runner later picks.
		review: review.text,
		// The engine's own notes about how the plan was shaped, when it left any.
		...(draft.meta.warnings?.length ? { warnings: draft.meta.warnings } : {}),
		// The load model's read, when it ran. Shadow records without applying.
		...(loadModelState(loadRead) ? { loadModel: loadModelState(loadRead) } : {}),
	};
}

/**
 * The preview response body: the plan exactly as GET /current returns it, plus
 * the rebuild's warnings when it left any, so the client can say what the
 * rebuild did with the edited week one. No key when there is nothing to say.
 */
export function previewResponse<T extends object>(
	current: T,
	rebuildWarnings: string[],
): T & { warnings?: string[] } {
	return rebuildWarnings.length ? { ...current, warnings: rebuildWarnings } : current;
}

/**
 * The user's active plan as the client reads it: goal, plan, sessions, states
 * and logs. Shared by GET /current and the preview rebuild, so both return the
 * same shape. `plan` is null when the runner has no goal or no plan yet.
 */
async function currentPlanJson(db: Db, userId: string) {
	const goalRows = await db
		.select()
		.from(schema.userGoals)
		.where(eq(schema.userGoals.userId, userId))
		.orderBy(desc(schema.userGoals.createdAt))
		.limit(1);
	const goal = goalRows[0] ?? null;
	if (!goal) return { goal: null, plan: null };

	const planRows = await db
		.select()
		.from(schema.plans)
		.where(eq(schema.plans.userGoalId, goal.id))
		.orderBy(desc(schema.plans.version))
		.limit(1);
	const plan = planRows[0] ?? null;
	if (!plan) return { goal, plan: null };

	const weeks = await db
		.select()
		.from(schema.planWeeks)
		.where(eq(schema.planWeeks.planId, plan.id))
		.orderBy(asc(schema.planWeeks.weekNumber));

	const weekIds = weeks.map((w) => w.id);
	// Chunk IN(...) queries: D1 caps bound parameters per statement (100).
	const sessions = (
		await Promise.all(
			chunk(weekIds, 90).map((part) =>
				db.select().from(schema.sessionsPlan).where(inArray(schema.sessionsPlan.planWeekId, part)),
			),
		)
	).flat();

	const sessionIds = sessions.map((s) => s.id);
	const logs = (
		await Promise.all(
			chunk(sessionIds, 90).map((part) =>
				db
					.select()
					.from(schema.logs)
					.where(and(eq(schema.logs.userId, userId), inArray(schema.logs.sessionId, part))),
			),
		)
	).flat();

	// Logs with no session: imported activities and any run the runner logged on
	// its own. They count in Progress and the streak without belonging to a plan.
	// Bounded to the last year so the payload cannot grow with the import history;
	// a log with no start time is kept, since it cannot be placed on the timeline.
	const standaloneSince = new Date(Date.now() - 365 * 86400000);
	const standaloneLogs = await db
		.select()
		.from(schema.logs)
		.where(
			and(
				eq(schema.logs.userId, userId),
				isNull(schema.logs.sessionId),
				or(isNull(schema.logs.startedAt), gte(schema.logs.startedAt, standaloneSince)),
			),
		);

	const states = await db
		.select()
		.from(schema.sessionStates)
		.where(eq(schema.sessionStates.userId, userId));

	return {
		goal,
		plan,
		sessionStates: states.map((s) => ({
			sessionId: s.sessionId,
			state: s.state,
			progress: s.progress ?? null,
		})),
		weeks: weeks.map((w) => ({
			...w,
			sessions: sessions
				.filter((s) => s.planWeekId === w.id)
				.sort(compareDaySessions),
		})),
		logs: [...logs, ...standaloneLogs],
	};
}

/** GET current active plan for the user's most recent goal (weeks + sessions). */
plans.get('/current', async (c) => {
	const user = c.get('user')!;
	const json = await currentPlanJson(c.get('db'), user.id);
	// Preserve the original response: `{ plan: null }` when there is no goal.
	if (!json.plan) return c.json(json.goal ? { goal: json.goal, plan: null } : { plan: null });
	return c.json(json);
});

/** Day index (0 = Monday) for an ISO date inside a week starting on weekStart. */
function dayIndex(weekStart: string, iso: string): number {
	const days = Math.round(
		(Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${weekStart}T00:00:00Z`)) / 86400000,
	);
	return ((days % 7) + 7) % 7;
}

/** The user's current plan plus its weeks, or null. */
export async function currentPlanWithWeeks(db: AppBindings['Variables']['db'], userId: string) {
	const goal = (
		await db
			.select()
			.from(schema.userGoals)
			.where(eq(schema.userGoals.userId, userId))
			.orderBy(desc(schema.userGoals.createdAt))
			.limit(1)
	)[0];
	if (!goal) return null;
	const plan = (
		await db
			.select()
			.from(schema.plans)
			.where(eq(schema.plans.userGoalId, goal.id))
			.orderBy(desc(schema.plans.version))
			.limit(1)
	)[0];
	if (!plan) return null;
	const weeks = await db
		.select()
		.from(schema.planWeeks)
		.where(eq(schema.planWeeks.planId, plan.id))
		.orderBy(asc(schema.planWeeks.weekNumber));
	return { goal, plan, weeks };
}

/** A workout the runner typed in themselves, instead of one from the library. */
const customWorkoutSchema = z.object({
	modality: z.enum(['running', 'strength', 'recovery']),
	type: z.string().min(1).max(40),
	title: z.string().min(1).max(120),
	durationMin: z.number().int().min(1).max(600),
	summary: z.string().min(1).max(300),
	blocks: z
		.array(
			z.object({
				machine: z.string().min(1).max(80),
				sets: z
					.array(
						z.object({
							reps: z.number().int().min(1).max(500),
							weightKg: z.number().min(0).max(1500),
						}),
					)
					.min(1)
					.max(20),
			}),
		)
		.min(1)
		.max(20)
		.optional(),
	distanceKm: z.number().min(0.1).max(500).optional(),
	notes: z.string().max(500).optional(),
});

type CustomWorkout = z.infer<typeof customWorkoutSchema>;

/** The most steps one workout block may hold, as prescriptionSchema enforces it. */
const MAX_BLOCK_STEPS = 200;

/**
 * Pack a circuit's moves into blocks that each stay inside prescriptionSchema's
 * 200-step block cap. A move holds at most 20 sets (the route schema), so its
 * cards never exceed 39 steps and whole moves always fit somewhere; a long
 * circuit continues into a second block instead of failing the week-one save.
 */
export function circuitBlocks(perMove: WorkoutStep[][]): StepBlock[] {
	const blocks: StepBlock[] = [];
	let current: WorkoutStep[] = [];
	for (const steps of perMove) {
		if (current.length && current.length + steps.length > MAX_BLOCK_STEPS) {
			blocks.push({ repeat: 1, label: 'Your circuit', steps: current });
			current = [];
		}
		current = [...current, ...steps];
	}
	if (current.length) blocks.push({ repeat: 1, label: 'Your circuit', steps: current });
	return blocks;
}

/** A guided workout shape for a custom session, so the player and detail views render it. */
export function customStructuredWorkout(custom: CustomWorkout) {
	if (custom.modality === 'strength') {
		const moves = custom.blocks ?? [];
		// One move's cards, kept per move so the packer can split the circuit
		// between moves and never between a set and its rest card.
		const perMove: WorkoutStep[][] = moves.map((b, mi) => {
			const steps: WorkoutStep[] = [];
			b.sets.forEach((s, i) => {
				steps.push({
					kind: 'work' as const,
					label: b.machine,
					machine: b.machine,
					sets: 1,
					reps: s.reps,
					targetRpe: [7, 8] as [number, number],
				});
				// A rest card after every set; the last set of the last move runs
				// straight into the finish, so it takes no rest card.
				const last = mi === moves.length - 1 && i === b.sets.length - 1;
				if (!last) {
					steps.push({
						kind: 'rest' as const,
						label: 'Rest',
						durationSec: 75,
						note: REST_CARD_NOTE,
					});
				}
			});
			return steps;
		});
		return {
			blocks: circuitBlocks(perMove),
			estimatedDurationMin: custom.durationMin,
		};
	}
	if (custom.modality === 'running') {
		const distanceKm = custom.distanceKm ?? 0;
		return {
			blocks: [
				{
					repeat: 1,
					steps: [
						{
							kind: 'work' as const,
							label: custom.title,
							distanceM: Math.round(distanceKm * 1000),
							durationSec: custom.durationMin * 60,
							targetRpe: [4, 6] as [number, number],
						},
					],
				},
			],
			totalDistanceKm: distanceKm,
			estimatedDurationMin: custom.durationMin,
		};
	}
	return {
		blocks: [
			{
				repeat: 1,
				steps: [
					{
						kind: 'work' as const,
						label: custom.title,
						durationSec: custom.durationMin * 60,
					},
				],
			},
		],
		estimatedDurationMin: custom.durationMin,
	};
}

/** POST /sessions: add a library workout, or a custom one, to a day in the user's plan. */
plans.post(
	'/sessions',
	zValidator(
		'json',
		z
			.object({
				date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				workoutId: z.string().min(1).max(60).optional(),
				custom: customWorkoutSchema.optional(),
				/** A workout the runner built in the composer, stored on their profile. */
				customWorkoutId: z.string().min(1).max(60).optional(),
			})
			.refine(
				(b) => (!!b.workoutId ? 1 : 0) + (!!b.custom ? 1 : 0) + (!!b.customWorkoutId ? 1 : 0) === 1,
				{ message: 'Send a workoutId, a custom workout, or a stored custom workout.' },
			),
	),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const { date, workoutId, custom, customWorkoutId } = c.req.valid('json');

		if (custom) {
			if (custom.modality === 'strength' && !custom.blocks?.length) {
				return c.json({ error: 'A strength workout needs at least one move.' }, 400);
			}
			if (custom.modality === 'running' && custom.distanceKm == null) {
				return c.json({ error: 'A run needs a distance.' }, 400);
			}
		} else if (!customWorkoutId) {
			const workout = WORKOUT_LIBRARY.find((w) => w.id === workoutId);
			if (!workout) return c.json({ error: 'Unknown workout.' }, 400);
		}

		const current = await currentPlanWithWeeks(db, user.id);
		if (!current) return c.json({ error: 'You need a plan first.' }, 400);

		const week = current.weeks.find(
			(w) => w.startDate && w.endDate && date >= w.startDate && date <= w.endDate,
		);
		if (!week || !week.startDate) {
			return c.json({ error: 'That day is outside your plan.' }, 400);
		}

		let session: typeof schema.sessionsPlan.$inferInsert;
		if (customWorkoutId) {
			const prefs = await loadPrefs(db, user.id);
			const workout = readCustomWorkouts(prefs).find((w) => w.id === customWorkoutId);
			if (!workout) return c.json({ error: 'Unknown workout.' }, 400);
			// A stored custom workout is sections of items, not steps, so it is
			// turned into the guided sequence the player runs here.
			const structured = customWorkoutToStructured(workout);
			const notes = customWorkoutNotes(workout);
			session = {
				id: crypto.randomUUID(),
				planWeekId: week.id,
				day: dayIndex(week.startDate, date),
				slot: 'AM',
				modality: workout.category,
				type: customWorkoutArchetype(workout),
				title: workout.name,
				purpose: 'You added this one yourself.',
				prescription: {
					summary: 'A workout you built yourself.',
					intensity: workout.category === 'strength' ? 'steady' : 'easy',
					workout: structured,
					added: true,
					custom: true,
					...(notes ? { notes } : {}),
				},
				durationMin: structured.estimatedDurationMin ?? 45,
			};
		} else if (custom) {
			session = {
				id: crypto.randomUUID(),
				planWeekId: week.id,
				day: dayIndex(week.startDate, date),
				slot: 'AM',
				modality: custom.modality,
				type: custom.type,
				title: custom.title,
				purpose: 'You added this one yourself.',
				prescription: {
					summary: custom.summary,
					intensity: custom.modality === 'strength' ? 'steady' : 'easy',
					...(custom.blocks ? { blocks: custom.blocks } : {}),
					...(custom.distanceKm != null ? { targetDistanceKm: custom.distanceKm } : {}),
					...(custom.notes ? { notes: custom.notes } : {}),
					workout: customStructuredWorkout(custom),
					added: true,
					custom: true,
				},
				durationMin: custom.durationMin,
			};
		} else {
			const workout = WORKOUT_LIBRARY.find((w) => w.id === workoutId)!;
			session = {
				id: crypto.randomUUID(),
				planWeekId: week.id,
				day: dayIndex(week.startDate, date),
				slot: 'AM',
				modality: workout.modality,
				type: workout.type,
				title: workout.title,
				purpose: workout.purpose,
				prescription: {
					summary: workout.summary,
					intensity: workout.intensity,
					targetRpe: workout.targetRpe,
					workout: workout.workout,
					added: true,
					libraryId: workout.id,
				},
				durationMin: workout.durationMin,
			};
		}
		await db.insert(schema.sessionsPlan).values(session);
		return c.json({ session }, 201);
	},
);

/** True when the session belongs to a plan owned by this user. */
async function sessionOwnedBy(
	db: AppBindings['Variables']['db'],
	userId: string,
	sessionId: string,
): Promise<boolean> {
	const session = (
		await db
			.select()
			.from(schema.sessionsPlan)
			.where(eq(schema.sessionsPlan.id, sessionId))
			.limit(1)
	)[0];
	if (!session) return false;
	const week = (
		await db
			.select()
			.from(schema.planWeeks)
			.where(eq(schema.planWeeks.id, session.planWeekId))
			.limit(1)
	)[0];
	if (!week) return false;
	const plan = (
		await db.select().from(schema.plans).where(eq(schema.plans.id, week.planId)).limit(1)
	)[0];
	if (!plan) return false;
	const goal = (
		await db
			.select()
			.from(schema.userGoals)
			.where(and(eq(schema.userGoals.id, plan.userGoalId), eq(schema.userGoals.userId, userId)))
			.limit(1)
	)[0];
	return !!goal;
}

/** POST /sessions/:id/state: set or clear a session's started or skipped state. */
plans.post(
	'/sessions/:id/state',
	zValidator(
		'json',
		z.object({
			state: z.union([z.literal('started'), z.literal('skipped'), z.null()]),
			progress: z.string().max(200).nullable().optional(),
		}),
	),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const id = c.req.param('id');
		const { state, progress } = c.req.valid('json');

		if (!(await sessionOwnedBy(db, user.id, id))) return c.json({ error: 'Not found.' }, 404);

		if (state === null) {
			await db
				.delete(schema.sessionStates)
				.where(
					and(eq(schema.sessionStates.userId, user.id), eq(schema.sessionStates.sessionId, id)),
				);
		} else {
			await db
				.insert(schema.sessionStates)
				.values({ userId: user.id, sessionId: id, state, progress: progress ?? null })
				.onConflictDoUpdate({
					target: [schema.sessionStates.userId, schema.sessionStates.sessionId],
					set: progress === undefined ? { state } : { state, progress },
				});
		}
		return c.json({ ok: true, state });
	},
);

/** DELETE /sessions/:id: remove a workout the user added (never a planned one). */
plans.delete('/sessions/:id', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');
	const id = c.req.param('id');

	const session = (
		await db.select().from(schema.sessionsPlan).where(eq(schema.sessionsPlan.id, id)).limit(1)
	)[0];
	if (!session) return c.json({ error: 'Not found.' }, 404);

	const week = (
		await db
			.select()
			.from(schema.planWeeks)
			.where(eq(schema.planWeeks.id, session.planWeekId))
			.limit(1)
	)[0];
	const plan = week
		? (await db.select().from(schema.plans).where(eq(schema.plans.id, week.planId)).limit(1))[0]
		: undefined;
	const owned = plan
		? (
				await db
					.select()
					.from(schema.userGoals)
					.where(
						and(eq(schema.userGoals.id, plan.userGoalId), eq(schema.userGoals.userId, user.id)),
					)
					.limit(1)
			)[0]
		: undefined;
	if (!owned) return c.json({ error: 'Not found.' }, 404);

	const added = session.prescription?.added === true;
	if (!added) return c.json({ error: 'Only workouts you added can be removed.' }, 403);

	await db.delete(schema.sessionsPlan).where(eq(schema.sessionsPlan.id, id));
	return c.json({ ok: true });
});

/** POST generate: create a goal plus a generated, narrated plan. */
plans.post(
	'/generate',
	zValidator(
		'json',
		z.object({
			goalProfileSlug: goalSlugSchema,
			targetDate: targetDateSchema.optional(),
			startDate: z.string().optional(),
			baseline: z.record(z.string(), z.unknown()).optional(),
			availableDays: availableDaysSchema.optional(),
		}),
	),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const body = c.req.valid('json');

		// Generation costs AI; keep it bounded.
		const rl = await checkRateLimit(c.env.DB, `generate:${user.id}`, 20, 3600);
		if (!rl.ok) return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '600' });

		const profile = GOAL_PROFILES.find((p) => p.slug === body.goalProfileSlug);
		if (!profile) return c.json({ error: 'unknown_profile' }, 400);

		const startDate = body.startDate ?? new Date().toISOString().slice(0, 10);
		const availableDays = body.availableDays?.length ? body.availableDays : [0, 2, 4];

		const baseline = (body.baseline ?? {}) as Baseline;

		// Sports logged in the last seven days, with how long and how hard. A heavy
		// sport week already carries load, so the plan trims the strength and quality
		// work to match. The window is pushed into SQL against the (user, created)
		// index, so only the recent logs are read, not the runner's whole history.
		const since = Date.now() - 7 * 86400000;
		const recentLogs = await c
			.get('db')
			.select()
			.from(schema.logs)
			.where(
				and(
					eq(schema.logs.userId, user.id),
					isNotNull(schema.logs.sessionId),
					gte(schema.logs.createdAt, new Date(since)),
				),
			);
		const recentIds = recentLogs.map((l) => l.sessionId as string);
		const recentSessions = recentIds.length
			? (
					await Promise.all(
						chunk(recentIds, 90).map((part) =>
							c
								.get('db')
								.select()
								.from(schema.sessionsPlan)
								.where(inArray(schema.sessionsPlan.id, part)),
						),
					)
				).flat()
			: [];
		const crossIds = new Set(
			recentSessions.filter((row) => row.type === 'cross-train').map((row) => row.id),
		);
		const crossLogs = recentLogs.filter((l) => l.sessionId && crossIds.has(l.sessionId));
		const crossLoad = {
			sessions: crossLogs.length,
			minutes: Math.round(
				crossLogs.reduce((m, l) => {
					const stats = l.runStats ?? {};
					return m + (stats.durationSec ?? 0);
				}, 0) / 60,
			),
			highEffort: crossLogs.filter((l) => (l.rpe ?? 0) >= 7).length,
		};

		// A read of what the runner has actually been doing, from their own logs,
		// joined to the plan so each one knows its session type. Seeds paces from a
		// recent hard effort and volume from real recent weeks, when the runner has
		// not given a race time or a weekly distance. Read from the (user, started)
		// index, so the 28-day window is the query's own filter.
		const fitSince = Date.now() - 28 * 86400000;
		const fitLogs = await c
			.get('db')
			.select()
			.from(schema.logs)
			.where(and(eq(schema.logs.userId, user.id), gte(schema.logs.startedAt, new Date(fitSince))));
		const fitSessionIds = [
			...new Set(fitLogs.map((l) => l.sessionId).filter((x): x is string => !!x)),
		];
		const fitSessions = fitSessionIds.length
			? (
					await Promise.all(
						chunk(fitSessionIds, 90).map((part) =>
							c
								.get('db')
								.select()
								.from(schema.sessionsPlan)
								.where(inArray(schema.sessionsPlan.id, part)),
						),
					)
				).flat()
			: [];
		const typeById = new Map(fitSessions.map((s) => [s.id, s.type]));
		const modalityById = new Map(fitSessions.map((s) => [s.id, s.modality]));
		const fitness = fitnessState(
			fitLogs.map((l) => {
				const stats = l.runStats ?? {};
				return {
					sessionId: l.sessionId,
					type: l.sessionId ? (typeById.get(l.sessionId) ?? null) : null,
					modality: l.sessionId ? (modalityById.get(l.sessionId) ?? null) : null,
					date: l.startedAt instanceof Date ? l.startedAt.toISOString() : null,
					distanceKm: stats.distanceKm ?? null,
					durationSec: stats.durationSec ?? null,
					rpe: l.rpe ?? null,
					feedback: l.feedback ?? null,
				};
			}),
			{ raceTimes: baseline.recentTimes },
		);
		const prefs = await loadPrefs(db, user.id);
		// Age is stored as a birth year in settings, so it stays right over time.
		// Seed it onto the baseline (unless the body already carried one), where the
		// engine tunes the plan by age band and the stored goal keeps it for rebuilds.
		const age = ageFromBirthYear(prefs.birthYear);
		const seededBaseline: Baseline = {
			...baseline,
			...(baseline.age == null && age != null ? { age } : {}),
			...(prefs.equipment ? { equipment: prefs.equipment } : {}),
			...(prefs.equipmentItems ? { equipmentItems: prefs.equipmentItems } : {}),
			...(baseline.effectiveVdot == null && fitness.effectiveVdot != null
				? { effectiveVdot: fitness.effectiveVdot }
				: {}),
			...(baseline.weeklyKm == null && fitness.recentWeeklyKm > 0
				? { weeklyKm: fitness.recentWeeklyKm }
				: {}),
			...(fitness.likedTypes.length ? { likedTypes: fitness.likedTypes } : {}),
			...(fitness.dislikedTypes.length ? { dislikedTypes: fitness.dislikedTypes } : {}),
		};

		const planInput = {
			profile,
			baseline: seededBaseline,
			availableDays,
			startDate,
			// The rotation seed comes from the plan's own identity, the runner and
			// the start date, so a regeneration of this plan rebuilds the same
			// rotations while two runners get different ones.
			seed: planSeed(user.id, startDate),
			targetDate: body.targetDate,
			crossLoad,
			equipment: seededBaseline.equipmentItems,
			machines: resolveMachines(prefs),
			favoriteMachines: prefs.favoriteMachines,
			favoriteWorkouts: prefs.favoriteWorkouts,
			schedule: prefs.schedule,
		};
		const baseDraft = generatePlan(planInput);

		// The load model, dark by default. In shadow it records what it would change
		// and applies nothing; in apply it may ease or hold a future week, never
		// build past the engine's own curve. Off means it never runs.
		const loadRead = await buildLoadRead({
			d1: c.env.DB,
			userId: user.id,
			weeks: baseDraft.weeks,
			today: startDate,
			logs: loadEntriesFrom(fitLogs, modalityById),
			thresholdPaceSecPerKm: thresholdPaceFromVdot(baseDraft.meta.vdot ?? fitness.effectiveVdot),
			experience: seededBaseline.experience,
			prefs,
		});

		// The engine lays the plan out instantly. Then, in parallel, the model shapes
		// each week (quality kind and emphasis) within the profile's rules, and writes
		// a short plan review. Both are bounded and best-effort, so a slow or invalid
		// answer leaves the engine's plan and a deterministic review standing.
		const allowed = (['tempo', 'hills', 'interval', 'race-pace'] as QualityKind[]).filter((k) =>
			profile.sessionTypes.includes(k as SessionArchetype),
		);
		const firstWeekSessions = baseDraft.weeks[0]?.sessions ?? [];
		const [shapes, review] = await Promise.all([
			shapePlan(c.env, {
				goalName: profile.name,
				allowed,
				prefs: baseline as Record<string, unknown>,
				fitness: {
					recentWeeklyKm: fitness.recentWeeklyKm,
					rpeTrend: fitness.rpeTrend,
					likedTypes: fitness.likedTypes,
					dislikedTypes: fitness.dislikedTypes,
					samples: fitness.samples,
				},
				weeks: baseDraft.weeks.map((w) => ({
					weekNumber: w.weekNumber,
					phase: w.phase,
					volumeKm: w.targetVolumeKm,
					strengthDays: w.sessions.filter((s) => s.modality === 'strength').length,
					mobilityDays: w.sessions.filter((s) => s.modality === 'mobility').length,
				})),
			}),
			reviewPlan(c.env, {
				goalName: profile.name,
				totalWeeks: baseDraft.meta.totalWeeks,
				age: seededBaseline.age,
				phases: baseDraft.weeks.map((w) => w.phase),
				strengthPerWeek: firstWeekSessions.filter((s) => s.modality === 'strength').length,
				firstWeek: firstWeekSessions.map((s) => s.title),
			}),
		]);
		// The load model's easing and holding fold onto the shaping pass's choices,
		// lowering a `build` to a `hold` or an `ease` where it asks. A no-op unless
		// the mode is apply, so shadow and advisory leave the shapes as they were.
		const weekNumbers = baseDraft.weeks.map((w) => w.weekNumber);
		const shaped: (WeekShape | undefined)[] = shapes ?? baseDraft.weeks.map(() => undefined);
		const withLoad = applyLoadToShapes(shaped, loadRead, weekNumbers);
		const draft = withLoad.some(Boolean) ? generatePlan({ ...planInput, weekShapes: withLoad }) : baseDraft;
		const usedAi = !!shapes || review.usedAi;

		const goalId = crypto.randomUUID();
		// The goal profile guard reads the reference table, so make sure it holds
		// every built-in profile before the goal insert.
		await syncGoalProfiles(db);
		await db.insert(schema.userGoals).values({
			id: goalId,
			userId: user.id,
			goalProfileSlug: profile.slug,
			targetDate: body.targetDate ?? null,
			baseline: seededBaseline,
			availableDays,
		});

		const planId = crypto.randomUUID();
		await db.insert(schema.plans).values({
			id: planId,
			userGoalId: goalId,
			version: 1,
			generatedAt: new Date(),
			model: usedAi ? 'engine+ai' : 'engine',
			params: planParams(draft, review, loadRead),
			status: 'active',
		});

		const weekRows = draft.weeks.map((w, i) => {
			const weekId = crypto.randomUUID();
			return {
				id: weekId,
				planId,
				weekNumber: w.weekNumber,
				focus: w.focus,
				// The model's week line if it shaped this week; otherwise a template.
				summaryText:
					shapes?.[i]?.emphasis ?? templateWeekSummary(w.weekNumber, w.phase, w.targetVolumeKm),
				startDate: w.startDate,
				endDate: w.endDate,
				phase: w.phase,
				targetVolumeKm: w.targetVolumeKm,
				sessionRows: w.sessions.map((s) => ({
					id: crypto.randomUUID(),
					planWeekId: weekId,
					day: s.day,
					slot: s.slot,
					modality: s.modality,
					type: s.type,
					title: s.title,
					purpose: s.purpose,
					prescription: s.prescription,
					durationMin: s.durationMin,
				})),
			};
		});

		// D1 caps bound parameters per statement (100). Keep chunks well under it.
		const weekValues = weekRowValues(weekRows);
		for (const part of chunk(weekValues, 10)) {
			await db.insert(schema.planWeeks).values(part);
		}

		const sessionRows = weekRows.flatMap((w) => w.sessionRows);
		for (const part of chunk(sessionRows, 8)) {
			await db.insert(schema.sessionsPlan).values(part);
		}

		// Narrate after responding, so the user never waits on the model.
		c.executionCtx.waitUntil(
			narrateAndStore(
				c.env,
				db,
				weekRows.map((w) => ({
					id: w.id,
					weekNumber: w.weekNumber,
					phase: w.phase,
					targetVolumeKm: w.targetVolumeKm,
				})),
			),
		);

		// Rewrite each session's reason with the model as a second pass, after the
		// plan is saved, so onboarding never waits on it. Every line is gated before
		// it is stored, and the deterministic whyStructured stays as the fallback.
		const whyInputs: StoredWhyInput[] = weekRows.flatMap((w) =>
			w.sessionRows.map((s) => ({
				sessionId: s.id,
				input: {
					day: s.day,
					title: s.title,
					weekNumber: w.weekNumber,
					phase: w.phase,
					modality: s.modality,
					goalName: profile.name,
					reason: s.prescription.whyStructured ?? {},
				},
			})),
		);
		c.executionCtx.waitUntil(
			rephraseAndStore(c.env, db, whyInputs, { userId: user.id, path: c.req.path }),
		);

		return c.json({ planId, goalId, weeks: draft.weeks.length, usedAi }, 201);
	},
);

/**
 * The body of POST /adapt: the same optional equipment change as the settings
 * patch, plus the runner's own civil date. The client sends its local `today` so
 * the past/future split uses the runner's day rather than the server's UTC day,
 * which differ for a few hours either side of UTC.
 */
const adaptBodySchema = equipmentPrefsPatchSchema.extend({
	today: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
});

/**
 * POST /adapt: rebuild the weeks that have not started yet, from the runner's
 * own logs and feedback. Deterministic and instant, no AI in the path. Past
 * weeks are never touched.
 */
plans.post('/adapt', zValidator('json', adaptBodySchema), async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');

	// Rebuilding costs the rate limit; check it before any write, so a burst
	// cannot keep persisting equipment changes past the limit.
	const rl = await checkRateLimit(c.env.DB, `adapt:${user.id}`, 30, 3600);
	if (!rl.ok) return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '600' });

	// An equipment change arrives here: store it (bounded to the same fields and
	// values as the settings endpoint), then rebuild the weeks ahead.
	const body = c.req.valid('json');
	const patch: Partial<Prefs> = {};
	if (body.equipment !== undefined) patch.equipment = body.equipment;
	if (body.equipmentItems !== undefined) patch.equipmentItems = body.equipmentItems;
	if (body.gymPreset !== undefined) patch.gymPreset = body.gymPreset;
	if (body.machineItems !== undefined) patch.machineItems = body.machineItems;
	if (Object.keys(patch).length) {
		const saved = await upsertPrefs(c.env.DB, user.id, patch);
		if (saved.kind === 'conflict') {
			return c.json({ error: 'Another change was saving at the same time. Try again.' }, 409);
		}
	}
	const prefs = await loadPrefs(db, user.id);

	const found = await currentPlanWithWeeks(db, user.id);
	if (!found) return c.json({ error: 'no_plan' }, 404);
	const { goal, plan, weeks } = found;

	const profile = GOAL_PROFILES.find((p) => p.slug === goal.goalProfileSlug);
	if (!profile) return c.json({ error: 'unknown_profile' }, 400);

	const weekIds = weeks.map((w) => w.id);
	const sessions = weekIds.length
		? (
				await Promise.all(
					chunk(weekIds, 90).map((part) =>
						db
							.select()
							.from(schema.sessionsPlan)
							.where(inArray(schema.sessionsPlan.planWeekId, part)),
					),
				)
			).flat()
		: [];

	const existingWeeks = weeks.map((w) => ({
		weekNumber: w.weekNumber,
		phase: w.phase ?? 'base',
		focus: w.focus ?? '',
		startDate: w.startDate ?? '',
		endDate: w.endDate ?? '',
		targetVolumeKm: 0,
		sessions: sessions
			.filter((s) => s.planWeekId === w.id)
			.sort(compareDaySessions)
			.map((s) => ({
				day: s.day,
				slot: s.slot ?? 'AM',
				modality: s.modality,
				type: s.type,
				title: s.title ?? '',
				purpose: s.purpose ?? '',
				prescription: s.prescription ?? {},
				durationMin: s.durationMin ?? 0,
			})),
	}));

	// Keep age current on a rebuild: the stored goal carries it from onboarding, and
	// the birth year in settings is the fallback for a goal created before that.
	const storedBaseline = (goal.baseline ?? {}) as Baseline;
	const age = storedBaseline.age ?? ageFromBirthYear(prefs.birthYear);
	const baseline: Baseline = {
		...storedBaseline,
		...(age != null ? { age } : {}),
		...(prefs.equipment ? { equipment: prefs.equipment } : {}),
		...(prefs.equipmentItems ? { equipmentItems: prefs.equipmentItems } : {}),
	};
	const typeById = new Map(sessions.map((s) => [s.id, s.type]));
	const modalityById = new Map(sessions.map((s) => [s.id, s.modality]));
	// Only the 28-day fitness window is read, pushed into SQL against the
	// (user, started) index rather than pulling every log the runner has.
	const fitSince = Date.now() - 28 * 86400000;
	const fitLogs = await db
		.select()
		.from(schema.logs)
		.where(and(eq(schema.logs.userId, user.id), gte(schema.logs.startedAt, new Date(fitSince))));
	const fitness = fitnessState(
		fitLogs.map((l) => {
			const stats = l.runStats ?? {};
			return {
				sessionId: l.sessionId,
				type: l.sessionId ? (typeById.get(l.sessionId) ?? null) : null,
				modality: l.sessionId ? (modalityById.get(l.sessionId) ?? null) : null,
				date: l.startedAt instanceof Date ? l.startedAt.toISOString() : null,
				distanceKm: stats.distanceKm ?? null,
				durationSec: stats.durationSec ?? null,
				rpe: l.rpe ?? null,
				feedback: l.feedback ?? null,
			};
			}),
		{ raceTimes: baseline.recentTimes },
	);

	// The runner's own civil day, sent by the client. The server's UTC day is only
	// a fallback: for a few hours each day the two differ, and using UTC would
	// judge an evening session on the US west coast against tomorrow.
	const todayIso = body.today ?? new Date().toISOString().slice(0, 10);
	const allowed = (['tempo', 'hills', 'interval', 'race-pace'] as QualityKind[]).filter((k) =>
		profile.sessionTypes.includes(k as SessionArchetype),
	);

	// The one plan-change pipeline. Every path that changes a plan goes through
	// it: it is handed the goal, the previous plan configuration, the runner's
	// history and the intent, and returns typed, confidence-scored decisions
	// (the week's volume intent, the quality-day count, the long-run delta) plus
	// a grounded reason per decision. Best-effort: with no key, or on any
	// failure, it returns null and the deterministic adapt below stands exactly
	// as it is today.
	const adaptWeeks: AdaptWeek[] = weeks.map((w) => ({
		weekNumber: w.weekNumber,
		startDate: w.startDate,
		endDate: w.endDate,
		phase: w.phase,
		sessions: sessions
			.filter((s) => s.planWeekId === w.id)
			.map((s) => ({
				id: s.id,
				day: s.day,
				modality: s.modality,
				type: s.type,
				prescription: (s.prescription ?? {}) as { targetDistanceKm?: number },
			})),
	}));
	const adaptLogs: AdaptLog[] = fitLogs.map((l) => ({
		sessionId: l.sessionId,
		runStats: (l.runStats ?? undefined) as { distanceKm?: number; durationSec?: number } | undefined,
		rpe: l.rpe,
		createdAt: l.startedAt instanceof Date ? l.startedAt.toISOString() : null,
	}));
	const changeContext: PlanChangeContext = {
		intent: 'adapt',
		goal: {
			slug: profile.slug,
			name: profile.name,
			...(goal.targetDate
				? {
						weeksToRace: Math.round(
							(Date.parse(`${goal.targetDate}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) /
								86400000 /
								7,
						),
					}
				: {}),
		},
		previous: summarizePreviousWeeks(adaptWeeks),
		history: deriveHistory(adaptLogs, adaptWeeks, fitness, todayIso),
		affectedWeekNumbers: existingWeeks
			.filter((w) => w.startDate > todayIso)
			.map((w) => w.weekNumber)
			.slice(0, MAX_AI_WEEKS),
	};
	const change = await buildPlanChange(c.env, changeContext);

	// The load model's read, dark by default. It can only ease or hold a future
	// week inside the engine's own ceilings, so it is safe to fold onto whatever
	// else changed and can never raise load. In shadow it records without applying.
	const loadRead = await buildLoadRead({
		d1: c.env.DB,
		userId: user.id,
		weeks: existingWeeks,
		today: todayIso,
		logs: loadEntriesFrom(fitLogs, modalityById),
		thresholdPaceSecPerKm: thresholdPaceFromVdot(
			(plan.params as { vdot?: number } | null)?.vdot ?? fitness.effectiveVdot,
		),
		experience: baseline.experience,
		prefs,
	});
	const loadModel = loadModelState(loadRead);

	const result = adaptPlan({
		profile,
		baseline,
		availableDays: (goal.availableDays as number[] | null)?.length
			? (goal.availableDays as number[])
			: [0, 2, 4],
		startDate: existingWeeks[0]?.startDate || todayIso,
		seed: planSeed(user.id, existingWeeks[0]?.startDate || todayIso),
		targetDate: goal.targetDate ?? undefined,
		existingWeeks,
		today: todayIso,
		fitness,
		allowedQuality: allowed,
		equipment: baseline.equipmentItems,
		machines: resolveMachines(prefs),
		favoriteMachines: prefs.favoriteMachines,
		favoriteWorkouts: prefs.favoriteWorkouts,
		schedule: prefs.schedule,
		// The load model's easing and holding, only applied in apply mode. It can
		// only lower a week's intent, never raise it.
		load: loadRead,
		// The pipeline's decisions, when it made any. Absent means the engine
		// keeps its own curve for every week ahead, exactly as today.
		weekShapes: change ? existingWeeks.map((w) => change.shapes.get(w.weekNumber)) : undefined,
	} as unknown as Parameters<typeof adaptPlan>[0]);

	if (result.changedFromWeek == null) {
		// Nothing to rebuild, but a shadow run still records what it would change,
		// so the read is auditable without the plan moving.
		if (loadModel) {
			await db
				.update(schema.plans)
				.set({ params: { ...(plan.params ?? {}), loadModel } })
				.where(eq(schema.plans.id, plan.id));
		}
		return c.json({ changed: false, changedFromWeek: null, swapped: [], loadModel: loadModel ?? null });
	}

	// Replace the weeks ahead in place, leaving past weeks and their logs
	// untouched. Sessions that keep their day, slot and type keep their ids, so
	// the runner's logs, session states and matched activities stay attached.
	const changed = result.weeks.filter((w) => w.weekNumber >= result.changedFromWeek!);
	// The pipeline's reasons, one note per changed week, folded onto each session
	// so the workout card can show why this week changed. Absent without the
	// pipeline, so a deterministic adapt adds no note.
	const noteByWeek = change
		? new Map(change.reasons.map((r) => [r.weekNumber, weekChangeNote(r)]))
		: undefined;
	const stored: StoredWeek[] = weeks.map((w) => ({
		id: w.id,
		weekNumber: w.weekNumber,
		sessions: sessions
			.filter((s) => s.planWeekId === w.id)
			.map((s) => ({ id: s.id, day: s.day, slot: s.slot, type: s.type })),
	}));
	const desired: DesiredWeek[] = changed.map((w) => {
		const note = noteByWeek?.get(w.weekNumber);
		return {
			weekNumber: w.weekNumber,
			phase: w.phase,
			focus: w.focus,
			summaryText: templateWeekSummary(w.weekNumber, w.phase, w.targetVolumeKm),
			startDate: w.startDate,
			endDate: w.endDate,
			sessions: w.sessions.map((s) => ({
				day: s.day,
				slot: s.slot,
				modality: s.modality,
				type: s.type,
				title: s.title,
				purpose: s.purpose,
				prescription: note ? { ...s.prescription, changeNote: note } : s.prescription,
				durationMin: s.durationMin,
			})),
		};
	});
	await replaceWeeks(db, plan.id, stored, desired);

	await db
		.update(schema.plans)
		.set({
			generatedAt: new Date(),
			params: {
				...(plan.params ?? {}),
				adaptedAt: new Date().toISOString(),
				...(loadModel ? { loadModel } : {}),
				...(change
					? { adaptedWithAi: true, changeReasons: change.reasons, changeDecisions: change.decisions }
					: {}),
			},
		})
		.where(eq(schema.plans.id, plan.id));

	return c.json({
		changed: true,
		changedFromWeek: result.changedFromWeek,
		swapped: result.swapped,
		weeks: changed.length,
		loadModel: loadModel ?? null,
	});
});

/** One session of the approved week one, as the client sends it. */
interface PreviewSession {
	day: number;
	slot: 'AM' | 'PM';
	modality: 'running' | 'walking' | 'strength' | 'mobility' | 'recovery';
	type: string;
	title?: string;
	purpose?: string;
	prescription?: unknown;
	durationMin?: number;
	libraryId?: string;
}

/**
 * Save the approved week one exactly as sent. A session that matches an existing
 * one on day, slot and type is updated in place, so its logged state and any
 * notes survive the edit; the rest are inserted, and any leftover row is removed,
 * so a removal in week one is a real removal.
 */
async function replaceWeekOneSessions(db: Db, weekId: string, sessions: PreviewSession[]) {
	const existing = await db
		.select()
		.from(schema.sessionsPlan)
		.where(eq(schema.sessionsPlan.planWeekId, weekId));
	const pool = [...existing];

	for (const s of sessions) {
		const given =
			s.prescription && typeof s.prescription === 'object'
				? (s.prescription as Partial<SessionPrescription>)
				: {};
		const prescription = { ...given } as SessionPrescription;
		// A library workout is stored on the prescription, so fold the id in when the
		// client sent it at the top level and the prescription does not carry it.
		if (s.libraryId && prescription.libraryId == null) prescription.libraryId = s.libraryId;
		const row = {
			day: s.day,
			slot: s.slot,
			modality: s.modality,
			type: s.type,
			title: s.title ?? null,
			purpose: s.purpose ?? null,
			prescription,
			durationMin: s.durationMin ?? null,
		};
		const matchIdx = pool.findIndex(
			(e) => e.day === s.day && (e.slot ?? 'AM') === s.slot && e.type === s.type,
		);
		if (matchIdx >= 0) {
			const match = pool.splice(matchIdx, 1)[0]!;
			await db.update(schema.sessionsPlan).set(row).where(eq(schema.sessionsPlan.id, match.id));
		} else {
			await db
				.insert(schema.sessionsPlan)
				.values({ id: crypto.randomUUID(), planWeekId: weekId, ...row });
		}
	}
	for (const stale of pool) {
		await db.delete(schema.sessionsPlan).where(eq(schema.sessionsPlan.id, stale.id));
	}
}

/**
 * POST /preview: the runner edits week one to match the week they will run, then
 * asks for the rest of the plan to be rebuilt around it. Week one is saved
 * exactly as sent. Weeks two onward are rebuilt from the week one pattern: the
 * engine lays them out with the week one days and the runner's added workouts,
 * then the model shapes them within the profile's rules. Best-effort AI: when it
 * is unavailable the deterministic rebuild still stands. Week one is never
 * rewritten by the rebuild. Returns the current plan, the same shape as GET
 * /current, so the client can carry on, plus the rebuild's warnings when it
 * left any (for instance a week one too heavy to build from), so the client can
 * say what the rebuild did.
 */
plans.post(
	'/preview',
	zValidator(
		'json',
		z.object({
			sessions: z
				.array(
					z.object({
						day: z.number().int().min(0).max(6),
						slot: z.enum(['AM', 'PM']),
						modality: z.enum(['running', 'walking', 'strength', 'mobility', 'recovery']),
						type: z.string().min(1).max(40),
						title: z.string().max(200).optional(),
						purpose: z.string().max(600).optional(),
						prescription: prescriptionSchema.optional(),
						durationMin: z.number().int().min(0).max(600).optional(),
						libraryId: z.string().min(1).max(60).optional(),
					}),
				)
				.max(50),
		}),
	),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const { sessions } = c.req.valid('json');

		// The rebuild costs AI; keep it bounded.
		const rl = await checkRateLimit(c.env.DB, `preview:${user.id}`, 30, 3600);
		if (!rl.ok) return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '600' });

		const found = await currentPlanWithWeeks(db, user.id);
		if (!found) return c.json({ error: 'no_plan' }, 404);
		const { goal, plan, weeks } = found;
		const firstWeek = weeks[0];
		if (!firstWeek) return c.json({ error: 'no_plan' }, 404);

		const profile = GOAL_PROFILES.find((p) => p.slug === goal.goalProfileSlug);
		if (!profile) return c.json({ error: 'unknown_profile' }, 400);

		const prefs = await loadPrefs(db, user.id);
		const storedBaseline = (goal.baseline ?? {}) as Baseline;
		const age = storedBaseline.age ?? ageFromBirthYear(prefs.birthYear);
		const baseline: Baseline = {
			...storedBaseline,
			...(age != null ? { age } : {}),
			...(prefs.equipment ? { equipment: prefs.equipment } : {}),
			...(prefs.equipmentItems ? { equipmentItems: prefs.equipmentItems } : {}),
		};

		// The stored plan, so the rebuild can keep week one and every date in place.
		const weekIds = weeks.map((w) => w.id);
		const storedSessions = weekIds.length
			? (
					await Promise.all(
						chunk(weekIds, 90).map((part) =>
							db
								.select()
								.from(schema.sessionsPlan)
								.where(inArray(schema.sessionsPlan.planWeekId, part)),
						),
					)
				).flat()
			: [];
		const existingWeeks: PlannedWeek[] = weeks.map((w) => ({
			weekNumber: w.weekNumber,
			phase: w.phase ?? 'base',
			focus: w.focus ?? '',
			startDate: w.startDate ?? '',
			endDate: w.endDate ?? '',
			targetVolumeKm: 0,
			sessions: storedSessions
				.filter((s) => s.planWeekId === w.id)
				.sort(compareDaySessions)
				.map((s) => ({
					day: s.day,
					slot: s.slot ?? 'AM',
					modality: s.modality,
					type: s.type as SessionArchetype,
					title: s.title ?? '',
					purpose: s.purpose ?? '',
					prescription: (s.prescription ?? {}) as SessionPrescription,
					durationMin: s.durationMin ?? 0,
				})),
		}));

		// The approved week one drives the rebuild: its days are the days the engine
		// may use, and its added workouts recur.
		const pattern = weekOnePattern(sessions);
		const availableDays = pattern.availableDays.length
			? pattern.availableDays
			: (goal.availableDays as number[] | null)?.length
				? (goal.availableDays as number[])
				: [0, 2, 4];

		const planInput: PlanInput = {
			profile,
			baseline,
			availableDays,
			startDate: firstWeek.startDate ?? new Date().toISOString().slice(0, 10),
			seed: planSeed(user.id, firstWeek.startDate ?? new Date().toISOString().slice(0, 10)),
			targetDate: goal.targetDate ?? undefined,
			equipment: baseline.equipmentItems,
			machines: resolveMachines(prefs),
			favoriteMachines: prefs.favoriteMachines,
			favoriteWorkouts: prefs.favoriteWorkouts,
			schedule: prefs.schedule,
		};

		// The engine lays out the later weeks instantly. Then the model shapes them
		// (quality kind, emphasis) within the profile's rules, with the week one
		// pattern in context. Bounded and best-effort: a slow or invalid answer
		// leaves the deterministic rebuild standing.
		const allowed = (['tempo', 'hills', 'interval', 'race-pace'] as QualityKind[]).filter((k) =>
			profile.sessionTypes.includes(k as SessionArchetype),
		);
		const baseDraft = generatePlan(planInput);
		const shapes = await shapePlan(c.env, {
			goalName: profile.name,
			allowed,
			prefs: baseline as Record<string, unknown>,
			weeks: baseDraft.weeks.map((w) => ({
				weekNumber: w.weekNumber,
				phase: w.phase,
				volumeKm: w.targetVolumeKm,
				strengthDays: w.sessions.filter((s) => s.modality === 'strength').length,
				mobilityDays: w.sessions.filter((s) => s.modality === 'mobility').length,
			})),
			weekOne: pattern,
		});
		const { weeks: rebuilt, warnings: rebuildWarnings } = rebuildFromWeekOne({
			existingWeeks,
			weekOne: sessions,
			plan: planInput,
			weekShapes: shapes ?? undefined,
		});
		const usedAi = !!shapes;

		// Week one is saved exactly as sent, and never rebuilt.
		await replaceWeekOneSessions(db, firstWeek.id, sessions);

		// Replace weeks two onward in place, leaving week one and its history
		// alone. A later session that keeps its day, slot and type keeps its id.
		const laterWeeks = rebuilt.filter((w) => w.weekNumber > firstWeek.weekNumber);
		const stored: StoredWeek[] = weeks.map((w) => ({
			id: w.id,
			weekNumber: w.weekNumber,
			sessions: storedSessions
				.filter((s) => s.planWeekId === w.id)
				.map((s) => ({ id: s.id, day: s.day, slot: s.slot, type: s.type })),
		}));
		const laterDesired: DesiredWeek[] = laterWeeks.map((w) => ({
			weekNumber: w.weekNumber,
			phase: w.phase,
			focus: w.focus,
			summaryText: templateWeekSummary(w.weekNumber, w.phase, w.targetVolumeKm),
			startDate: w.startDate,
			endDate: w.endDate,
			sessions: w.sessions.map((s) => ({
				day: s.day,
				slot: s.slot,
				modality: s.modality,
				type: s.type,
				title: s.title,
				purpose: s.purpose,
				prescription: s.prescription,
				durationMin: s.durationMin,
			})),
		}));
		const weekIdByNumber = await replaceWeeks(db, plan.id, stored, laterDesired);

		const weekRows = laterWeeks.map((w) => ({
			id: weekIdByNumber.get(w.weekNumber)!,
			weekNumber: w.weekNumber,
			phase: w.phase,
			targetVolumeKm: w.targetVolumeKm,
		}));

		await db
			.update(schema.plans)
			.set({
				generatedAt: new Date(),
				model: usedAi ? 'engine+ai' : 'engine',
				params: {
					...(plan.params ?? {}),
					previewedAt: new Date().toISOString(),
				},
			})
			.where(eq(schema.plans.id, plan.id));

		// Narrate the rebuilt weeks after responding, so the user never waits.
		c.executionCtx.waitUntil(narrateAndStore(c.env, db, weekRows));

		return c.json(previewResponse(await currentPlanJson(db, user.id), rebuildWarnings));
	},
);

/**
 * GET /load: the fitness, fatigue and form the model reads today, plus what it
 * would change. Descriptive only, and absent unless the runner has the model on.
 * The numbers are computed on read from the runner's own logs and plan, so this
 * is a read-out, not a stored claim.
 */
plans.get('/load', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');
	const found = await currentPlanWithWeeks(db, user.id);
	if (!found) return c.json({ available: false, readout: null });
	const { goal, plan, weeks } = found;
	const prefs = await loadPrefs(db, user.id);
	const config = resolveLoadConfig(prefs);
	if (config.mode === 'off') return c.json({ available: false, readout: null, mode: 'off' });

	const weekIds = weeks.map((w) => w.id);
	const sessions = weekIds.length
		? (
				await Promise.all(
					chunk(weekIds, 90).map((part) =>
						db.select().from(schema.sessionsPlan).where(inArray(schema.sessionsPlan.planWeekId, part)),
					),
				)
			).flat()
		: [];
	const modalityById = new Map(sessions.map((s) => [s.id, s.modality]));

	const todayIso = new Date().toISOString().slice(0, 10);
	const fitSince = Date.now() - 28 * 86400000;
	const fitLogs = await db
		.select()
		.from(schema.logs)
		.where(and(eq(schema.logs.userId, user.id), gte(schema.logs.startedAt, new Date(fitSince))));

	const loadWeeks: LoadWeek[] = weeks.map((w) => ({
		weekNumber: w.weekNumber,
		phase: w.phase,
		startDate: w.startDate,
		endDate: w.endDate,
		sessions: sessions
			.filter((s) => s.planWeekId === w.id)
			.map((s) => ({
				day: s.day,
				modality: s.modality,
				durationMin: s.durationMin ?? 0,
				prescription: (s.prescription ?? {}) as { targetDistanceKm?: number },
			})),
	}));
	const baseline = (goal.baseline ?? {}) as Baseline;
	const read = await buildLoadRead({
		d1: c.env.DB,
		userId: user.id,
		weeks: loadWeeks,
		today: todayIso,
		logs: loadEntriesFrom(fitLogs, modalityById),
		thresholdPaceSecPerKm: thresholdPaceFromVdot(
			(plan.params as { vdot?: number } | null)?.vdot ?? baseline.effectiveVdot,
		),
		experience: baseline.experience,
		prefs,
	});

	return c.json({
		available: read.available,
		mode: read.mode,
		readout: loadReadout(read),
		readiness: read.readiness,
		// The easing or holding for the weeks ahead, so advisory can show it.
		weekIntents: read.weekIntents,
		shadow: read.shadow,
		points: read.points.map((p) => ({
			date: p.date,
			fitness: p.fitness,
			fatigue: p.fatigue,
			form: p.form,
		})),
	});
});

export default plans;
