/**
 * Units are presentation only (AGENTS.md). The engine and stored data are always
 * metric (km, seconds-per-km); these helpers convert for display, driven by user prefs.
 */

export type Units = 'metric' | 'imperial';

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
}

export const DEFAULT_PREFS: Prefs = { units: 'imperial', weekStart: 0 };

/** Age in whole years from a birth year, or undefined if it is not set. */
export function ageFromBirthYear(birthYear: number | undefined, now = new Date()): number | undefined {
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
