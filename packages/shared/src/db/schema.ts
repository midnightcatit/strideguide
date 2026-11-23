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
		/** Plan phase for the week: base, build, peak or taper. */
		phase: text('phase'),
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
		modality: text('modality', { enum: ['running', 'walking', 'strength', 'mobility', 'recovery'] }).notNull(),
		type: text('type').notNull(),
		title: text('title'),
		purpose: text('purpose'),
		prescription: text('prescription', { mode: 'json' }),
		durationMin: integer('duration_min'),
		explanationId: text('explanation_id'),
		/** The runner's own note for this session, kept so a later rebuild can read it. */
		notes: text('notes'),
	},
	(t) => ({
		weekIdx: index('sessions_plan_week_idx').on(t.planWeekId),
	}),
);

/**
 * Per-session state that is not part of the plan: skipped or started. Kept on the
 * server so it follows the user across devices; the client caches it per session.
 */
export const sessionStates = sqliteTable(
	'session_states',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		sessionId: text('session_id').notNull(),
		state: text('state', { enum: ['started', 'skipped'] }).notNull(),
		/** Where the user got to in the guided player, as JSON: { idx, elapsed }. */
		progress: text('progress'),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.sessionId] }),
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
		/** How the runner felt about the session, from a quick thumbs up or down. */
		feedback: text('feedback', { enum: ['up', 'down'] }),
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

/**
 * A linked external account. One row per user and provider. Tokens are stored
 * encrypted (AES-GCM), never in the clear; the crypto lives in the API, so the
 * columns hold base64 ciphertext.
 */
export const connections = sqliteTable(
	'connections',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		provider: text('provider', { enum: ['google-health'] }).notNull(),
		/** The account's id at the provider, so a reconnect maps to the same person. */
		providerUserId: text('provider_user_id'),
		accessTokenEnc: text('access_token_enc'),
		refreshTokenEnc: text('refresh_token_enc'),
		/** Space or comma separated, as the provider returned it. */
		scopes: text('scopes'),
		tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp' }),
		status: text('status', { enum: ['connected', 'error'] })
			.notNull()
			.default('connected'),
		lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
		/**
		 * Set by a provider push notification to ask for a sync on the next cron
		 * pass. The webhook never fetches inline, so it only flips this marker.
		 */
		syncRequestedAt: integer('sync_requested_at', { mode: 'timestamp' }),
		createdAt,
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => ({
		userProviderIdx: uniqueIndex('connections_user_provider_idx').on(t.userId, t.provider),
	}),
);

/**
 * An activity pulled from a connector. Normalized to metric so it can be matched
 * against planned sessions; `raw` keeps the provider payload for a later reparse.
 */
export const activities = sqliteTable(
	'activities',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		provider: text('provider', { enum: ['google-health'] }).notNull(),
		/** The activity's id at the provider, unique per provider. */
		externalId: text('external_id').notNull(),
		modality: text('modality', {
			enum: ['running', 'walking', 'strength', 'mobility', 'recovery', 'cross-train'],
		}).notNull(),
		type: text('type'),
		startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
		durationSec: integer('duration_sec'),
		distanceM: real('distance_m'),
		avgPaceSecPerKm: real('avg_pace_sec_per_km'),
		avgHr: integer('avg_hr'),
		maxHr: integer('max_hr'),
		calories: integer('calories'),
		source: text('source'),
		route: text('route', { mode: 'json' }),
		raw: text('raw', { mode: 'json' }),
		sessionId: text('session_id').references(() => sessionsPlan.id, { onDelete: 'set null' }),
		matchConfidence: real('match_confidence'),
		createdAt,
	},
	(t) => ({
		providerExternalIdx: uniqueIndex('activities_provider_external_idx').on(
			t.provider,
			t.externalId,
		),
		userStartedIdx: index('activities_user_started_idx').on(t.userId, t.startedAt),
	}),
);

/**
 * One row per user, provider and civil day for the daily health metrics we pull
 * from a connector: resting heart rate, heart rate variability, sleep and steps.
 * Every column but the key is nullable, so a day with only steps stays valid and
 * a later sync never overwrites a field with a missing one.
 */
export const healthDaily = sqliteTable(
	'health_daily',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		provider: text('provider', { enum: ['google-health'] }).notNull(),
		/** Civil day in the user's timezone, formatted YYYY-MM-DD. */
		date: text('date').notNull(),
		restingHr: integer('resting_hr'),
		hrvMs: real('hrv_ms'),
		sleepMin: integer('sleep_min'),
		steps: integer('steps'),
		/** The provider payloads that fed this row, kept for a later reparse. */
		raw: text('raw', { mode: 'json' }),
		createdAt,
	},
	(t) => ({
		userProviderDateIdx: uniqueIndex('health_daily_user_provider_date_idx').on(
			t.userId,
			t.provider,
			t.date,
		),
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

/**
 * Browser-side failures reported by the client beacon (window errors, unhandled
 * rejections, failed requests). Written from a public route, so a stuck client
 * can report itself even when its session or network is failing.
 */
export const clientErrors = sqliteTable(
	'client_errors',
	{
		id: text('id').primaryKey(),
		createdAt,
		kind: text('kind').notNull(),
		message: text('message'),
		detail: text('detail'),
		url: text('url'),
		userAgent: text('user_agent'),
		userId: text('user_id'),
	},
	(t) => ({
		createdIdx: index('client_errors_created_idx').on(t.createdAt),
	}),
);

/** Alias helpers for composite keys if needed later. */
export const authSessionsPk = primaryKey({ columns: [authSessions.id] });
