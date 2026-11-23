/** Thin typed client for the Hono API. Same-origin: /api/* on the Worker. */
import type { GoalProfileData } from '@strideguide/shared';
import type { Prefs } from '@strideguide/shared/units';
import type { RecoverySignal, HealthDay } from '@strideguide/shared/plan';
import type { ClientActivity, CurrentPlan } from './plan';
import { cachePlan, cachedPlan, isOnline, outbox, queueLog, removeFromOutbox } from './offline';
import { reportClientError } from './clientErrors';

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

export const api = {
	me: async (): Promise<ApiUser | null> => {
		const res = await fetch('/auth/me', { credentials: 'include' });
		if (!res.ok) return null;
		const data = (await res.json()) as { user: { uid: string; email: string } | null };
		if (!data.user) return null;
		return { id: data.user.uid, email: data.user.email };
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
		req<{ session: unknown }>('/plans/sessions', {
			method: 'POST',
			body: JSON.stringify({ date, workoutId }),
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
			if (!isOnline()) {
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
	connections: () => reqRoot<{ providers: ConnectionStatus[] }>('/connections'),

	/** Where to send the browser to begin linking a provider. */
	connectionConnectUrl: (provider: string) => `/connections/${provider}/start`,

	disconnectConnection: (provider: string) =>
		reqRoot<{ ok: boolean }>(`/connections/${provider}/disconnect`, { method: 'POST' }),

	/** Imported activities, each with its proposed or confirmed match to the plan. */
	activities: () => req<{ activities: ClientActivity[] }>('/activities'),

	/** Confirm an activity's match. Omit sessionId to accept the proposed one. */
	confirmActivity: (id: string, sessionId?: string) =>
		req<{ ok: boolean; sessionId: string; confidence: number }>(
			`/activities/${encodeURIComponent(id)}/confirm`,
			{ method: 'POST', body: JSON.stringify(sessionId ? { sessionId } : {}) },
		),

	/** Reject a proposed match, so the activity is not offered against that session again. */
	rejectActivity: (id: string) =>
		req<{ ok: boolean }>(`/activities/${encodeURIComponent(id)}/reject`, { method: 'POST' }),

	/** Daily recovery context, when a connector has supplied any. */
	recovery: () =>
		req<{ available: boolean; signal: RecoverySignal | null; days: HealthDay[] }>('/recovery'),

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

	clearData: () => req<{ ok: boolean }>('/me/data', { method: 'DELETE' }),

	chat: (message: string) =>
		req<{ reply: string; model?: string }>('/ai/chat', {
			method: 'POST',
			body: JSON.stringify({ message }),
		}),
};
