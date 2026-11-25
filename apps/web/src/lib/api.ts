/** Thin typed client for the Hono API. Same-origin: /api/* on the Worker. */
import type { GoalProfileData } from '@strideguide/shared';
import type { Prefs } from '@strideguide/shared/units';
import type { RecoverySignal, HealthDay } from '@strideguide/shared/plan';
import type { ClientActivity, CurrentPlan } from './plan';
import { cachePlan, cachedPlan, isOnline, outbox, queueLog, removeFromOutbox } from './offline';
import { reportClientError } from './clientErrors';

/** True when a failure looks like a lost connection rather than a server
 * rejection. A 4xx comes back as a plain Error carrying the server's message,
 * while a dropped connection rejects fetch with a TypeError. */
function isNetworkFailure(e: unknown): boolean {
	return e instanceof TypeError;
}

/** The windows the health drill-down can ask the API for. */
export type HealthMetricWindow = 7 | 30 | 90;

/** One day's value for a metric. */
export interface HealthMetricPoint {
	date: string;
	value: number;
}

/** One sampled value for a metric. */
export interface HealthSamplePoint {
	time: string;
	value: number;
	unit: string | null;
}

/** A metric series with its newest point pulled out, for the card and the chart. */
export interface HealthMetricsPayload {
	available: boolean;
	windowDays: number;
	metrics: Record<string, { latest: HealthMetricPoint | null; series: HealthMetricPoint[] }>;
	samples: Record<string, { latest: HealthSamplePoint | null; series: HealthSamplePoint[] }>;
	/**
	 * Per metric, the mean of the previous window of the same length, so a card's
	 * change compares this period against the one before it. Absent when the
	 * earlier window has no reading for that metric.
	 */
	previous?: Record<string, number>;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
	let res: Response;
	try {
		res = await fetch(`/api${path}`, {
			credentials: 'include',
			headers: { 'content-type': 'application/json' },
			...init,
		});
	} catch (e) {
		// Offline is expected and already handled; only report a failure while online.
		if (isOnline()) reportClientError('api-network', `${init?.method ?? 'GET'} ${path}`, e);
		throw e;
	}
	if (!res.ok) {
		if (res.status >= 500) {
			reportClientError('api-5xx', `${res.status} ${init?.method ?? 'GET'} ${path}`);
		}
		// Surface the server's message when it sends one, so a form can show it.
		let message = `Something went wrong (${res.status}). Try again.`;
		try {
			const body = (await res.clone().json()) as { message?: string; error?: string };
			if (body?.message) message = body.message;
			else if (body?.error) message = body.error;
		} catch {
			// keep the generic message
		}
		throw new Error(message);
	}
	return (await res.json()) as T;
}

/** Like req, but for root-level routes (/connections) rather than /api. */
async function reqRoot<T>(path: string, init?: RequestInit): Promise<T> {
	let res: Response;
	try {
		res = await fetch(path, {
			credentials: 'include',
			headers: { 'content-type': 'application/json' },
			...init,
		});
	} catch (e) {
		if (isOnline()) reportClientError('api-network', `${init?.method ?? 'GET'} ${path}`, e);
		throw e;
	}
	if (!res.ok) {
		let message = `Something went wrong (${res.status}). Try again.`;
		try {
			const body = (await res.clone().json()) as { message?: string; error?: string };
			if (body?.message) message = body.message;
			else if (body?.error) message = body.error;
		} catch {
			// keep the generic message
		}
		throw new Error(message);
	}
	return (await res.json()) as T;
}

export interface ApiUser {
	id: string;
	email: string;
	name?: string | null;
	avatarUrl?: string | null;
}

/** One connector row on the Settings > Connections page. */
export interface ConnectionStatus {
	id: 'google-health';
	label: string;
	/** True when the server has this provider's OAuth client configured. */
	configured: boolean;
	connected: boolean;
	status: 'connected' | 'error' | null;
	lastSyncedAt: string | null;
	scopes: string | null;
}

export interface GeneratePlanInput {
	goalProfileSlug: string;
	targetDate?: string;
	startDate?: string;
	baseline?: {
		recentTimes?: Record<string, string>;
		weeklyKm?: number;
		experience?: 'beginner' | 'intermediate' | 'advanced';
		buildPreference?: 'ease-in' | 'steady' | 'ambitious';
		equipment?:
			| 'machines'
			| 'bodyweight'
			| 'bodyweight-dumbbells'
			| 'dumbbells'
			| 'barbell'
			| 'kettlebell'
			| 'bands'
			| 'both'
			| 'full-gym';
		equipmentItems?: ('machines' | 'dumbbells' | 'barbell' | 'kettlebell' | 'bands')[];
		strengthDays?: number;
		sessionMinutes?: number;
		flexibility?: { current: number; goal: number };
		stretching?: 'after-runs' | 'rest-days' | 'both' | 'none';
		crossTraining?: string[];
		terrain?: 'flat' | 'hilly' | 'mixed';
		niggles?: string;
		/** Free-text notes from onboarding, passed through to the generation prompt. */
		notes?: string;
	};
	availableDays?: number[];
}

/** One session of the edited week one, as the preview rebuild expects it. */
/** One move of a custom strength workout: sets of reps at a weight (kg). */
export interface CustomMoveBlock {
	machine: string;
	sets: { reps: number; weightKg: number }[];
}

/** A workout the runner composed themselves, sent to POST /plans/sessions. */
export interface CustomWorkoutInput {
	modality: 'running' | 'strength' | 'recovery';
	type: string;
	title: string;
	durationMin: number;
	summary: string;
	blocks?: CustomMoveBlock[];
	distanceKm?: number;
	notes?: string;
}

export interface PreviewSessionInput {
	day: number;
	slot: 'AM' | 'PM';
	modality: string;
	type: string;
	title?: string;
	purpose?: string;
	prescription?: unknown;
	durationMin?: number;
	libraryId?: string;
}

export const api = {
	me: async (): Promise<ApiUser | null> => {
		const res = await fetch('/auth/me', { credentials: 'include' });
		if (!res.ok) return null;
		const data = (await res.json()) as {
			user: { uid: string; email: string; name?: string | null } | null;
		};
		if (!data.user) return null;
		return { id: data.user.uid, email: data.user.email, name: data.user.name ?? null };
	},

	login: () => {
		window.location.href = '/auth/google';
	},

	logout: async (): Promise<{ ok: boolean }> => {
		const res = await fetch('/auth/logout', {
			method: 'POST',
			credentials: 'include',
			headers: { 'content-type': 'application/json' },
		});
		if (!res.ok) throw new Error(`logout failed ${res.status}`);
		return (await res.json()) as { ok: boolean };
	},

	profiles: () => req<{ profiles: GoalProfileData[] }>('/goals/profiles'),

	currentPlan: async (): Promise<CurrentPlan> => {
		try {
			const plan = await req<CurrentPlan>('/plans/current');
			cachePlan(plan);
			return plan;
		} catch (e) {
			const cached = cachedPlan<CurrentPlan>();
			if (cached) return cached;
			throw e;
		}
	},

	generatePlan: (body: GeneratePlanInput) =>
		req<{ planId: string; goalId: string; weeks: number; usedAi: boolean }>('/plans/generate', {
			method: 'POST',
			body: JSON.stringify(body),
		}),

	/** Save the edited week one and rebuild the weeks ahead around it. The
	 * sessions are the week exactly as it should be saved; removals are absent.
	 * Returns the rebuilt plan, the same shape as currentPlan. */
	rebuildFromPreview: (sessions: PreviewSessionInput[]) =>
		req<CurrentPlan>('/plans/preview', { method: 'POST', body: JSON.stringify({ sessions }) }),

	/** Rebuild the weeks ahead from the runner's own logs and feedback. Optionally
	 * change the equipment first, for a strength-equipment change. */
	adaptPlan: (body?: {
		equipment?:
			| 'machines'
			| 'bodyweight'
			| 'bodyweight-dumbbells'
			| 'dumbbells'
			| 'barbell'
			| 'kettlebell'
			| 'bands'
			| 'both'
			| 'full-gym';
		equipmentItems?: ('machines' | 'dumbbells' | 'barbell' | 'kettlebell' | 'bands')[];
		gymPreset?: string;
		machineItems?: string[];
	}) =>
		req<{
			changed: boolean;
			changedFromWeek: number | null;
			swapped: { week: number; from: string; to: string }[];
		}>('/plans/adapt', { method: 'POST', body: JSON.stringify(body ?? {}) }),

	/** Add a library workout to a day, or remove one the user added. */
	addWorkout: (date: string, workoutId: string) =>
		req<{ session: { id: string } }>('/plans/sessions', {
			method: 'POST',
			body: JSON.stringify({ date, workoutId }),
		}),
	/** Add a workout the runner typed in themselves, on a day inside the plan. */
	addCustomWorkout: (date: string, custom: CustomWorkoutInput) =>
		req<{ session: { id: string } }>('/plans/sessions', {
			method: 'POST',
			body: JSON.stringify({ date, custom }),
		}),
	removeWorkout: (id: string) =>
		req<{ ok: boolean }>(`/plans/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),

	/** Set or clear a session's started or skipped state, and its progress. */
	setSessionState: (id: string, state: 'started' | 'skipped' | null, progress?: string | null) =>
		req<{ ok: boolean }>(`/plans/sessions/${encodeURIComponent(id)}/state`, {
			method: 'POST',
			body: JSON.stringify({ state, progress }),
		}),

	/** Save the runner's own note for a session, or clear it with an empty string. */
	setSessionNotes: (id: string, notes: string) =>
		req<{ ok: boolean; notes: string }>(`/plans/sessions/${encodeURIComponent(id)}/notes`, {
			method: 'PATCH',
			body: JSON.stringify({ notes }),
		}),

	/** Save a log; if offline, queue it and return an optimistic (pending) log. */
	log: async (body: unknown): Promise<{ log: unknown }> => {
		try {
			return await req<{ log: unknown }>('/logs', { method: 'POST', body: JSON.stringify(body) });
		} catch (e) {
			// Offline, or a connection that dropped while the browser still thought
			// it was online: queue it and hand back an optimistic log. A 4xx
			// validation error is left to surface, since retrying it never succeeds.
			if (!isOnline() || isNetworkFailure(e)) {
				const item = queueLog(body);
				const b = (body ?? {}) as Record<string, unknown>;
				return {
					log: {
						id: `local-${item.id}`,
						sessionId: (b.sessionId as string) ?? null,
						runStats: b.runStats ?? null,
						strengthSets: b.strengthSets ?? null,
						rpe: b.rpe ?? null,
						feedback: b.feedback ?? null,
						notes: b.notes ?? null,
						startedAt: (b.startedAt as string) ?? null,
						// The day a queued log counts on is read from startedAt when set,
						// else from createdAt, so stamp the moment it was written. Hours
						// later the flush replaces this with the server's own row.
						createdAt: Math.floor(Date.now() / 1000),
						pending: true,
					},
				};
			}
			throw e;
		}
	},

	/** Flush queued offline logs. Stops on the first failure (still offline). */
	flushOutbox: async (): Promise<{ sent: number; remaining: number }> => {
		let sent = 0;
		for (const item of outbox()) {
			try {
				await req('/logs', { method: 'POST', body: JSON.stringify(item.body) });
				removeFromOutbox([item.id]);
				sent++;
			} catch {
				break;
			}
		}
		return { sent, remaining: outbox().length };
	},

	/** Health connectors: which are set up on the server, and which are linked. */
	connections: () => reqRoot<{ providers: ConnectionStatus[] }>('/connections/list'),

	/** Where to send the browser to begin linking a provider. Pass a local return
	 * path to come back to it after connecting; the server validates it. */
	connectionConnectUrl: (provider: string, returnPath?: string) => {
		const base = `/connections/${provider}/start`;
		return returnPath ? `${base}?return=${encodeURIComponent(returnPath)}` : base;
	},

	disconnectConnection: (provider: string) =>
		reqRoot<{ ok: boolean }>(`/connections/${provider}/disconnect`, { method: 'POST' }),

	/** Run a manual sync for a connection. When a sync succeeded in the last ten
	 * minutes the server returns the stored result with cached: true instead of
	 * calling the provider again. synced is the number of records pulled. */
	syncConnection: (provider: string) =>
		reqRoot<{ synced: number; cached: boolean; lastSyncedAt: string }>(
			`/connections/${provider}/sync`,
			{ method: 'POST' },
		),

	/** Imported activities, each a completed workout on its own. */
	activities: () => req<{ activities: ClientActivity[] }>('/activities'),

	/** Daily recovery context, when a connector has supplied any. */
	recovery: () =>
		req<{ available: boolean; signal: RecoverySignal | null; days: HealthDay[] }>('/recovery'),

	/** Grouped daily metrics and point samples for the health card and drill-down charts. */
	healthMetrics: (windowDays: HealthMetricWindow = 30) =>
		req<HealthMetricsPayload>(`/health-metrics?window=${windowDays}`),

	getSettings: () => req<{ prefs: Prefs }>('/settings'),
	putSettings: (body: Partial<Prefs>) =>
		req<{ prefs: Prefs }>('/settings', { method: 'PUT', body: JSON.stringify(body) }),

	explanation: (type: string) =>
		req<{
			ref: string;
			summary: string;
			claims: {
				topic: string;
				claim: string;
				evidence?: string;
				confidence?: string;
				source?: string;
			}[];
			sources: {
				title: string;
				authors?: string;
				year?: number;
				venue?: string;
				doiUrl?: string;
			}[];
			kbVersion?: string;
		}>(`/explanations?type=${encodeURIComponent(type)}`),

	latestSummary: () =>
		req<{ summary: { id: string; kind: string; body: string; createdAt: string } | null }>(
			'/summaries',
		),

	/** Delete the account and everything in it, then sign out on the server. */
	deleteAccount: () => req<{ ok: boolean }>('/me', { method: 'DELETE' }),

	chat: (message: string) =>
		req<{ reply: string; model?: string }>('/ai/chat', {
			method: 'POST',
			body: JSON.stringify({ message }),
		}),
};
