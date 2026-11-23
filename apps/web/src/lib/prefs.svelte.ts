import {
	DEFAULT_PREFS,
	formatDistance,
	formatPace,
	formatPaceBand,
	type Prefs,
	type Units,
} from '@strideguide/shared/units';
import { sessionTypeLabel } from './plan';
import { api } from './api';

/** Reactive app preferences (units, week start). Mutate properties; don't reassign. */
export const prefs = $state<Prefs>({ ...DEFAULT_PREFS });

export async function loadPrefs(): Promise<void> {
	try {
		const res = await api.getSettings();
		prefs.units = res.prefs.units ?? DEFAULT_PREFS.units;
		prefs.weekStart = res.prefs.weekStart ?? 0;
		prefs.name = res.prefs.name;
		prefs.birthYear = res.prefs.birthYear;
		prefs.eventName = res.prefs.eventName;
		prefs.autoAdvance = res.prefs.autoAdvance;
		prefs.countdownSec = res.prefs.countdownSec;
		prefs.heightCm = res.prefs.heightCm;
		prefs.weightKg = res.prefs.weightKg;
		prefs.restingHr = res.prefs.restingHr;
	} catch {
		// unauthenticated or offline: keep defaults
	}
}

export async function setWeekStart(weekStart: 0 | 1): Promise<void> {
	prefs.weekStart = weekStart;
	try {
		await api.putSettings({ weekStart });
	} catch {
		// best-effort
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

export function paceDeltaUnit(): string {
	return prefs.units === 'imperial' ? 's/mi' : 's/km';
}

/** Convert a pace difference (sec per km) into the user's pace unit. */
export function convertPaceDelta(secPerKm: number): number {
	return prefs.units === 'imperial' ? Math.round(secPerKm * 1.609344) : Math.round(secPerKm);
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
		workout?: {
			blocks?: { repeat?: number; steps?: { kind?: string; distanceM?: number }[] }[];
		} | null;
	} | null;
}

/** The workout name for a card title: the plan's title, or a readable type. */
export function sessionLabel(session: LabelSession): string {
	return session.title ?? sessionTypeLabel(session.type);
}

/**
 * The rep scheme for a session that repeats a measured rep, e.g. "6 × 800 m".
 * Null when the session is not a measured-rep workout, so a card can skip it.
 */
export function repSchemeLabel(session: LabelSession): string | null {
	const blocks = session.prescription?.workout?.blocks ?? [];
	const setBlock = blocks.find((b) => (b.repeat ?? 1) > 1);
	if (!setBlock) return null;
	const steps = setBlock.steps ?? [];
	const rep = steps.find((st) => st.kind === 'work' && st.distanceM);
	if (!rep?.distanceM) return null;
	return `${setBlock.repeat} × ${fmtStepDistance(rep.distanceM)}`;
}

/** Height, weight and resting heart rate. Pass null to clear a value. */
export async function setVitals(fields: {
	heightCm?: number | null;
	weightKg?: number | null;
	restingHr?: number | null;
}): Promise<void> {
	if (fields.heightCm !== undefined) prefs.heightCm = fields.heightCm ?? undefined;
	if (fields.weightKg !== undefined) prefs.weightKg = fields.weightKg ?? undefined;
	if (fields.restingHr !== undefined) prefs.restingHr = fields.restingHr ?? undefined;
	try {
		await api.putSettings({
			heightCm: fields.heightCm ?? undefined,
			weightKg: fields.weightKg ?? undefined,
			restingHr: fields.restingHr ?? undefined,
		});
	} catch {
		// best-effort
	}
}

/** Seconds to count down before a step starts. */
export async function setCountdownSec(v: number): Promise<void> {
	prefs.countdownSec = Math.max(0, Math.min(15, Math.round(v)));
	try {
		await api.putSettings({ countdownSec: prefs.countdownSec });
	} catch {
		// best-effort
	}
}

/** Turn auto-advance in the workout player on or off. */
export async function setAutoAdvance(v: boolean): Promise<void> {
	prefs.autoAdvance = v;
	try {
		await api.putSettings({ autoAdvance: v });
	} catch {
		// best-effort
	}
}

/** Save the personal details. Empty strings clear a field. */
export async function setPersonal(fields: {
	name?: string;
	birthYear?: number | null;
	eventName?: string;
}): Promise<void> {
	if (fields.name !== undefined) prefs.name = fields.name || undefined;
	if (fields.birthYear !== undefined) prefs.birthYear = fields.birthYear ?? undefined;
	if (fields.eventName !== undefined) prefs.eventName = fields.eventName || undefined;
	try {
		await api.putSettings({
			name: fields.name,
			birthYear: fields.birthYear ?? undefined,
			eventName: fields.eventName,
		});
	} catch {
		// best-effort; the form shows what was typed
	}
}
