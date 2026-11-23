/** Thin typed client for the Hono API. Same-origin: /api/* on the Worker. */
import type { GoalProfileData } from '@strideguide/shared';
import type { Prefs } from '@strideguide/shared/units';
import type { CurrentPlan } from './plan';
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
		throw new Error(`API ${res.status} ${path}`);
	}
	return (await res.json()) as T;
}

export interface ApiUser {
	id: string;
	email: string;
	name?: string | null;
	avatarUrl?: string | null;
}

export interface GeneratePlanInput {
	goalProfileSlug: string;
	targetDate?: string;
	startDate?: string;
	baseline?: {
		recentTimes?: Record<string, string>;
		weeklyKm?: number;
		experience?: 'beginner' | 'intermediate' | 'advanced';
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

	getSettings: () => req<{ prefs: Prefs }>('/settings'),

	putSettings: (body: Partial<Prefs>) =>
		req<{ prefs: Prefs }>('/settings', { method: 'PUT', body: JSON.stringify(body) }),

	explanation: (type: string) =>
		req<{
			ref: string;
			summary: string;
			claims: { topic: string; claim: string; evidence?: string; confidence?: string; source?: string }[];
			sources: { title: string; authors?: string; year?: number; venue?: string; doiUrl?: string }[];
			kbVersion?: string;
		}>(`/explanations?type=${encodeURIComponent(type)}`),

	latestSummary: () =>
		req<{ summary: { id: string; kind: string; body: string; createdAt: string } | null }>('/summaries'),

	clearData: () => req<{ ok: boolean }>('/me/data', { method: 'DELETE' }),

	chat: (message: string) =>
		req<{ reply: string; model?: string }>('/ai/chat', {
			method: 'POST',
			body: JSON.stringify({ message }),
		}),
};
