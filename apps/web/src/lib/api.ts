/** Thin typed client for the Hono API. Same-origin: /api/* on the Worker. */
import type { GoalProfileData } from '@strideguide/shared';
import type { Prefs } from '@strideguide/shared/units';
import type { CurrentPlan } from './plan';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`/api${path}`, {
		credentials: 'include',
		headers: { 'content-type': 'application/json' },
		...init,
	});
	if (!res.ok) {
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
	};
	availableDays?: number[];
}

export const api = {
	health: () => req<{ ok: boolean; env: string }>('/health'),

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

	currentPlan: () => req<CurrentPlan>('/plans/current'),

	generatePlan: (body: GeneratePlanInput) =>
		req<{ planId: string; goalId: string; weeks: number; usedAi: boolean }>('/plans/generate', {
			method: 'POST',
			body: JSON.stringify(body),
		}),

	logs: () => req<{ logs: unknown[] }>('/logs'),

	log: (body: unknown) => req<{ log: unknown }>('/logs', { method: 'POST', body: JSON.stringify(body) }),

	getSettings: () => req<{ prefs: Prefs }>('/settings'),

	putSettings: (body: Partial<Prefs>) =>
		req<{ prefs: Prefs }>('/settings', { method: 'PUT', body: JSON.stringify(body) }),

	chat: (message: string, context?: string) =>
		req<{ reply: string }>('/ai/chat', { method: 'POST', body: JSON.stringify({ message, context }) }),
};
