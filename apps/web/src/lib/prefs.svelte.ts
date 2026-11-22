import {
	DEFAULT_PREFS,
	formatDistance,
	formatPace,
	formatPaceBand,
	type Prefs,
	type Units,
} from '@strideguide/shared/units';
import { api } from './api';

/** Reactive app preferences (units, week start). Mutate properties; don't reassign. */
export const prefs = $state<Prefs>({ ...DEFAULT_PREFS });

export async function loadPrefs(): Promise<void> {
	try {
		const res = await api.getSettings();
		prefs.units = res.prefs.units ?? 'metric';
		prefs.weekStart = res.prefs.weekStart ?? 0;
	} catch {
		// unauthenticated or offline: keep defaults
	}
}

export async function setUnits(units: Units): Promise<void> {
	prefs.units = units;
	try {
		await api.putSettings({ units });
	} catch {
		// best-effort; ui already updated
	}
}

export function fmtDistance(km: number): string {
	return formatDistance(km, prefs.units);
}

export function fmtPace(secPerKm: number): string {
	return formatPace(secPerKm, prefs.units);
}

export function fmtPaceBand(band?: [number, number]): string | null {
	return band ? formatPaceBand(band, prefs.units) : null;
}

export function distanceUnit(): 'km' | 'mi' {
	return prefs.units === 'imperial' ? 'mi' : 'km';
}
