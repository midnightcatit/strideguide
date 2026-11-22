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

/** A step/rep distance in the user's units (metres for short metric steps, miles for imperial). */
export function fmtStepDistance(meters: number): string {
	if (prefs.units === 'imperial') {
		const mi = meters / 1609.344;
		return `${mi.toFixed(mi < 10 ? 2 : 1)} mi`;
	}
	return meters < 1000 ? `${Math.round(meters)} m` : `${Math.round((meters / 1000) * 10) / 10} km`;
}

interface LabelSession {
	title?: string | null;
	type: string;
	prescription?: {
		workout?: { blocks?: { repeat?: number; steps?: { kind?: string; distanceM?: number }[] }[] } | null;
	} | null;
}

/** A unit-correct display label: "6 × 800 m" (metric) / "6 × 0.50 mi" (imperial). */
export function sessionLabel(session: LabelSession): string {
	const blocks = session.prescription?.workout?.blocks ?? [];
	const setBlock = blocks.find((b) => (b.repeat ?? 1) > 1);
	if (setBlock) {
		const steps = setBlock.steps ?? [];
		const rep = steps.find((st) => st.kind === 'work' && st.distanceM) ?? steps[0];
		if (rep?.distanceM) return `${setBlock.repeat} × ${fmtStepDistance(rep.distanceM)}`;
	}
	return session.title ?? session.type;
}
