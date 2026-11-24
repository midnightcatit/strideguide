/**
 * Units are presentation only (AGENTS.md). The engine and stored data are always
 * metric (km, seconds-per-km); these helpers convert for display, driven by user prefs.
 */

export type Units = 'metric' | 'imperial';

import type { EquipmentItem, EquipmentPreference } from './types';

export interface Prefs {
	units: Units;
	/** 0 = Monday, 1 = Sunday. */
	weekStart: 0 | 1;
	/** What the coach calls them. Optional; the greeting falls back to plain wording. */
	name?: string;
	/** Birth year, so age stays right as the years pass. Used for training heuristics only. */
	birthYear?: number;
	/** The event they are training for, in their words (e.g. "Chicago Marathon"). */
	eventName?: string;
	/** Height in centimetres. Stored metric; shown in the chosen units. */
	heightCm?: number;
	/** Body weight in kilograms. Stored metric; shown in the chosen units. */
	weightKg?: number;
	/** Resting heart rate, beats per minute. */
	restingHr?: number;
	/** In the workout player, move to the next step automatically. */
	autoAdvance?: boolean;
	/** Seconds to count down before a step starts, 0 to 15. */
	countdownSec?: number;
	/** What the runner trains strength with. Drives the circuit the engine builds. */
	equipment?: EquipmentPreference;
	/** The equipment categories the runner has, to narrow the circuit to their kit. */
	equipmentItems?: EquipmentItem[];
	/** A named gym whose typical machine set the runner trains at. */
	gymPreset?: string;
	/** Specific machines the runner has, overriding the gym preset. */
	machineItems?: string[];
	/** Machines the runner likes to train on, from the move catalog. A soft preference. */
	favoriteMachines?: string[];
	/** Library workout ids the runner likes. The plan names one when it fits the day. */
	favoriteWorkouts?: string[];
	/** True once the runner dismisses the Connect Google Health nudge, so it stays gone. */
	connectNudgeDismissed?: boolean;
}

export const DEFAULT_PREFS: Prefs = { units: 'imperial', weekStart: 0 };

/** Age in whole years from a birth year, or undefined if it is not set. */
export function ageFromBirthYear(
	birthYear: number | undefined,
	now = new Date(),
): number | undefined {
	if (!birthYear) return undefined;
	return now.getUTCFullYear() - birthYear;
}

const KM_PER_MILE = 1.609344;

export function kmToMiles(km: number): number {
	return km / KM_PER_MILE;
}
export function milesToKm(mi: number): number {
	return mi * KM_PER_MILE;
}
/** Seconds-per-km -> seconds-per-mile. */
export function pacePerKmToPerMile(secPerKm: number): number {
	return secPerKm * KM_PER_MILE;
}

export function distanceUnit(units: Units): 'km' | 'mi' {
	return units === 'imperial' ? 'mi' : 'km';
}
export function paceUnit(units: Units): '/km' | '/mi' {
	return units === 'imperial' ? '/mi' : '/km';
}

export function convertDistance(km: number, units: Units): number {
	return units === 'imperial' ? kmToMiles(km) : km;
}
export function convertPace(secPerKm: number, units: Units): number {
	return units === 'imperial' ? pacePerKmToPerMile(secPerKm) : secPerKm;
}

/** "m:ss", or "h:mm:ss" when >= 1 hour. */
export function formatClock(seconds: number): string {
	const s = Math.round(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
	const ss = String(sec).padStart(2, '0');
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Distance in the user's units, e.g. "6 km" or "3.7 mi". */
export function formatDistance(km: number, units: Units, digits = 1): string {
	const v = convertDistance(km, units);
	const rounded = Number(v.toFixed(digits));
	const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
	return `${text} ${distanceUnit(units)}`;
}

/** Pace in the user's units, e.g. "4:55 /km" or "7:56 /mi". */
export function formatPace(secPerKm: number, units: Units): string {
	return `${formatClock(convertPace(secPerKm, units))} ${paceUnit(units)}`;
}

/** A pace range, e.g. "4:55–5:05 /km". */
export function formatPaceBand(band: [number, number], units: Units): string {
	const [a, b] = band;
	return `${formatClock(convertPace(a, units))}–${formatClock(convertPace(b, units))} ${paceUnit(units)}`;
}

/** A kilometre value from prose, as the user's distance text, e.g. "3.1 mi". */
function proseDistance(km: string): string {
	const mi = Number(kmToMiles(Number(km)).toFixed(1));
	return Number.isInteger(mi) ? String(mi) : mi.toFixed(1);
}

/**
 * Rewrite metric figures in knowledge-base prose into the reader's units. The
 * stored research is metric, so this is a no-op for metric and, for imperial,
 * converts plain distance and pace tokens (km and /km) to miles and /mi. Only
 * whole distance and pace tokens are touched, so citation text keeps its meaning.
 */
export function localizeUnits(text: string, units: Units): string {
	if (units === 'metric' || !text) return text;
	let out = text;

	// Paces: "5:05 /km", "5:12/km", "5:05 per km".
	out = out.replace(
		/(\d{1,2}):(\d{2})\s*(\/|per\s+)\s*km\b/gi,
		(_m, m: string, s: string, sep: string) => {
			const perMile = formatClock(pacePerKmToPerMile(Number(m) * 60 + Number(s)));
			return sep.startsWith('/') ? `${perMile} /mi` : `${perMile} per mile`;
		},
	);

	// Distance ranges: "3-5 km", "160 to 220 km", "16–24 km".
	out = out.replace(
		/(\d+(?:\.\d+)?)\s*(-|–|~|to)\s*(\d+(?:\.\d+)?)\s*(?:km|kilometres?|kilometers?)\b/gi,
		(_m, a: string, joiner: string, b: string) => {
			const sep = joiner === 'to' ? ' to ' : joiner;
			return `${proseDistance(a)}${sep}${proseDistance(b)} mi`;
		},
	);

	// Hyphenated distance adjectives: "5-km".
	out = out.replace(/(\d+(?:\.\d+)?)-km\b/gi, (_m, n: string) => `${proseDistance(n)}-mile`);

	// Single distances: "5 km", "6 kilometres".
	out = out.replace(
		/(\d+(?:\.\d+)?)\s*(?:km|kilometres?|kilometers?)\b/gi,
		(_m, n: string) => `${proseDistance(n)} mi`,
	);

	return out;
}
