import { sql } from 'drizzle-orm';
import {
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * Stride Guide data model (D1 / SQLite via Drizzle).
 * Mirrors PLAN.md section 8. JSON columns are stored as TEXT containing JSON.
 */

const createdAt = integer('created_at', { mode: 'timestamp' })
	.notNull()
	.default(sql`(unixepoch())`);

export const users = sqliteTable(
	'users',
	{
		id: text('id').primaryKey(),
		email: text('email').notNull(),
		googleSub: text('google_sub'),
		name: text('name'),
		avatarUrl: text('avatar_url'),
		createdAt,
	},
	(t) => ({
		emailIdx: uniqueIndex('users_email_idx').on(t.email),
		googleSubIdx: uniqueIndex('users_google_sub_idx').on(t.googleSub),
	}),
);

export const authSessions = sqliteTable(
	'auth_sessions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		revokedAt: integer('revoked_at', { mode: 'timestamp' }),
		createdAt,
	},
	(t) => ({
		tokenHashIdx: uniqueIndex('auth_sessions_token_hash_idx').on(t.tokenHash),
		userIdx: index('auth_sessions_user_idx').on(t.userId),
	}),
);

export const goalProfiles = sqliteTable('goal_profiles', {
	slug: text('slug').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	modalityMix: text('modality_mix', { mode: 'json' }),
	progressionRules: text('progression_rules', { mode: 'json' }),
	successMetrics: text('success_metrics', { mode: 'json' }),
	requiredInputs: text('required_inputs', { mode: 'json' }),
	sessionTypes: text('session_types', { mode: 'json' }),
	builtIn: integer('built_in', { mode: 'boolean' }).notNull().default(false),
	createdAt,
});

export const userGoals = sqliteTable(
	'user_goals',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		goalProfileSlug: text('goal_profile_slug').notNull(),
		targetDate: text('target_date'),
		baseline: text('baseline', { mode: 'json' }),
		availableDays: text('available_days', { mode: 'json' }),
		status: text('status', { enum: ['active', 'completed', 'archived'] })
			.notNull()
			.default('active'),
		createdAt,
	},
	(t) => ({
		userIdx: index('user_goals_user_idx').on(t.userId),
	}),
);

export const plans = sqliteTable(
	'plans',
	{
		id: text('id').primaryKey(),
		userGoalId: text('user_goal_id')
			.notNull()
			.references(() => userGoals.id, { onDelete: 'cascade' }),
		version: integer('version').notNull().default(1),
		generatedAt: integer('generated_at', { mode: 'timestamp' }),
		model: text('model'),
		params: text('params', { mode: 'json' }),
		status: text('status', { enum: ['draft', 'active', 'superseded'] })
			.notNull()
			.default('active'),
		createdAt,
	},
	(t) => ({
		userGoalIdx: index('plans_user_goal_idx').on(t.userGoalId),
	}),
);

export const planWeeks = sqliteTable(
	'plan_weeks',
	{
		id: text('id').primaryKey(),
		planId: text('plan_id')
			.notNull()
			.references(() => plans.id, { onDelete: 'cascade' }),
		weekNumber: integer('week_number').notNull(),
		focus: text('focus'),
		summaryText: text('summary_text'),
		startDate: text('start_date'),
		endDate: text('end_date'),
	},
	(t) => ({
		planIdx: index('plan_weeks_plan_idx').on(t.planId),
	}),
);

export const sessionsPlan = sqliteTable(
	'sessions_plan',
	{
		id: text('id').primaryKey(),
		planWeekId: text('plan_week_id')
			.notNull()
			.references(() => planWeeks.id, { onDelete: 'cascade' }),
		day: integer('day').notNull(),
		slot: text('slot'),
		modality: text('modality', { enum: ['running', 'strength', 'mobility', 'recovery'] }).notNull(),
		type: text('type').notNull(),
		title: text('title'),
		purpose: text('purpose'),
		prescription: text('prescription', { mode: 'json' }),
		durationMin: integer('duration_min'),
		explanationId: text('explanation_id'),
	},
	(t) => ({
		weekIdx: index('sessions_plan_week_idx').on(t.planWeekId),
	}),
);

export const exercises = sqliteTable(
	'exercises',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		modality: text('modality', { enum: ['running', 'strength', 'mobility', 'recovery'] }).notNull(),
		machine: text('machine'),
		muscleGroups: text('muscle_groups', { mode: 'json' }),
		formNotes: text('form_notes'),
		purpose: text('purpose'),
		whyFull: text('why_full'),
		researchRefs: text('research_refs', { mode: 'json' }),
		createdAt,
	},
	(t) => ({
		nameIdx: index('exercises_name_idx').on(t.name),
	}),
);

export const logs = sqliteTable(
	'logs',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		sessionId: text('session_id'),
		startedAt: integer('started_at', { mode: 'timestamp' }),
		endedAt: integer('ended_at', { mode: 'timestamp' }),
		runStats: text('run_stats', { mode: 'json' }),
		strengthSets: text('strength_sets', { mode: 'json' }),
		rpe: real('rpe'),
		notes: text('notes'),
		source: text('source', { enum: ['manual', 'device', 'import'] })
			.notNull()
			.default('manual'),
		createdAt,
	},
	(t) => ({
		userIdx: index('logs_user_idx').on(t.userId),
		sessionIdx: index('logs_session_idx').on(t.sessionId),
	}),
);

export const researchSources = sqliteTable(
	'research_sources',
	{
		id: text('id').primaryKey(),
		title: text('title').notNull(),
		authors: text('authors'),
		year: integer('year'),
		venue: text('venue'),
		type: text('type'),
		doiUrl: text('doi_url'),
		retrievedAt: integer('retrieved_at', { mode: 'timestamp' }),
	},
	(t) => ({
		doiIdx: index('research_sources_doi_idx').on(t.doiUrl),
	}),
);

export const explanations = sqliteTable(
	'explanations',
	{
		id: text('id').primaryKey(),
		scope: text('scope', { enum: ['session', 'exercise', 'topic'] }).notNull(),
		refId: text('ref_id'),
		summary: text('summary'),
		full: text('full'),
		citationIds: text('citation_ids', { mode: 'json' }),
		model: text('model'),
		kbVersion: text('kb_version'),
		createdAt,
	},
	(t) => ({
		scopeRefIdx: index('explanations_scope_ref_idx').on(t.scope, t.refId),
	}),
);

export const aiJobs = sqliteTable(
	'ai_jobs',
	{
		id: text('id').primaryKey(),
		type: text('type').notNull(),
		status: text('status', { enum: ['pending', 'ok', 'error'] })
			.notNull()
			.default('pending'),
		modelUsed: text('model_used'),
		tokensIn: integer('tokens_in'),
		tokensOut: integer('tokens_out'),
		latencyMs: integer('latency_ms'),
		error: text('error'),
		createdAt,
	},
	(t) => ({
		typeIdx: index('ai_jobs_type_idx').on(t.type),
	}),
);

export const aiCache = sqliteTable('ai_cache', {
	cacheKey: text('cache_key').primaryKey(),
	response: text('response', { mode: 'json' }),
	model: text('model'),
	ttl: integer('ttl'),
	createdAt,
});

export const shares = sqliteTable(
	'shares',
	{
		id: text('id').primaryKey(),
		ownerUserId: text('owner_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		viewerUserId: text('viewer_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		scope: text('scope', { enum: ['calendar', 'progress', 'all'] })
			.notNull()
			.default('all'),
		status: text('status', { enum: ['pending', 'accepted', 'revoked'] })
			.notNull()
			.default('pending'),
		createdAt,
	},
	(t) => ({
		ownerIdx: index('shares_owner_idx').on(t.ownerUserId),
		viewerIdx: index('shares_viewer_idx').on(t.viewerUserId),
	}),
);

export const nutritionLogs = sqliteTable(
	'nutrition_logs',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		date: text('date').notNull(),
		data: text('data', { mode: 'json' }),
		notes: text('notes'),
		createdAt,
	},
	(t) => ({
		userDateIdx: index('nutrition_logs_user_date_idx').on(t.userId, t.date),
	}),
);

export const sleepLogs = sqliteTable(
	'sleep_logs',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		date: text('date').notNull(),
		data: text('data', { mode: 'json' }),
		notes: text('notes'),
		createdAt,
	},
	(t) => ({
		userDateIdx: index('sleep_logs_user_date_idx').on(t.userId, t.date),
	}),
);

export const recoveryLogs = sqliteTable(
	'recovery_logs',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		date: text('date').notNull(),
		data: text('data', { mode: 'json' }),
		notes: text('notes'),
		createdAt,
	},
	(t) => ({
		userDateIdx: index('recovery_logs_user_date_idx').on(t.userId, t.date),
	}),
);

export const knowledgeBaseVersions = sqliteTable('knowledge_base_versions', {
	id: text('id').primaryKey(),
	tier: text('tier').notNull(),
	generatedAt: integer('generated_at', { mode: 'timestamp' }),
	refreshedBy: text('refreshed_by'),
	notes: text('notes'),
});

export const settings = sqliteTable('settings', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	prefs: text('prefs', { mode: 'json' }),
});

/** Fixed-window rate limiting (per user or IP). */
export const rateLimits = sqliteTable('rate_limits', {
	key: text('key').primaryKey(),
	windowStart: integer('window_start').notNull(),
	count: integer('count').notNull().default(0),
});

/** Cron-generated coach notes (nightly / weekly). */
export const summaries = sqliteTable(
	'summaries',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: text('kind').notNull(),
		body: text('body').notNull(),
		createdAt,
	},
	(t) => ({
		userIdx: index('summaries_user_idx').on(t.userId),
	}),
);

/** Recent API errors, so production failures are inspectable without tailing. */
export const appErrors = sqliteTable('app_errors', {
	id: text('id').primaryKey(),
	createdAt,
	name: text('name'),
	message: text('message'),
	path: text('path'),
	method: text('method'),
	userId: text('user_id'),
	requestId: text('request_id'),
});

/** Alias helpers for composite keys if needed later. */
export const authSessionsPk = primaryKey({ columns: [authSessions.id] });
