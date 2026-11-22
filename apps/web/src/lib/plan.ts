/** Client-side plan shapes as returned by the API, plus small display helpers. */

export type Modality = 'running' | 'strength' | 'mobility' | 'recovery';

export interface ClientPrescription {
	summary?: string;
	targetDistanceKm?: number;
	targetPaceSecPerKm?: [number, number];
	targetZone?: string;
	targetRpe?: [number, number];
	blocks?: { machine: string; sets: { reps: number; weightKg: number }[] }[];
	notes?: string;
}

export interface ClientSession {
	id: string;
	day: number;
	slot: string | null;
	modality: Modality;
	type: string;
	title: string | null;
	purpose: string | null;
	prescription: ClientPrescription | null;
	durationMin: number | null;
}

export interface ClientWeek {
	id: string;
	weekNumber: number;
	focus: string | null;
	summaryText: string | null;
	startDate: string | null;
	endDate: string | null;
	sessions: ClientSession[];
}

export interface ClientLog {
	id: string;
	sessionId: string | null;
	runStats: {
		distanceKm?: number;
		durationSec?: number;
		avgHr?: number;
		avgPaceSecPerKm?: number;
	} | null;
	strengthSets: { machine: string; sets: { reps: number; weightKg: number }[] }[] | null;
	rpe: number | null;
	notes: string | null;
	createdAt?: string | number | null;
}

export interface CurrentPlan {
	goal: { id: string; goalProfileSlug: string; targetDate: string | null } | null;
	plan: { id: string; params: Record<string, unknown> | null } | null;
	weeks: ClientWeek[];
	logs: ClientLog[];
}

export const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** 0 = Monday … 6 = Sunday for a Date. */
export function mondayIndex(d: Date): number {
	return (d.getDay() + 6) % 7;
}

export function formatDuration(min?: number | null): string | null {
	if (min == null) return null;
	const m = Math.floor(min);
	return `${m} min`;
}

/** The primary (hero) session for a day: run/long/quality first, else anything. */
export function heroSession(sessions: ClientSession[], day: number): ClientSession | undefined {
	const onDay = sessions.filter((s) => s.day === day);
	return (
		onDay.find((s) => s.modality === 'running' && s.type !== 'recovery') ??
		onDay.find((s) => s.modality === 'running') ??
		onDay[0]
	);
}

export function modalityLabel(m: Modality): string {
	return { running: 'Run', strength: 'Strength', mobility: 'Mobility', recovery: 'Recovery' }[m];
}
