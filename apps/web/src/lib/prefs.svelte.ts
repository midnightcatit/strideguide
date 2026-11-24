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
		prefs.equipment = res.prefs.equipment;
		prefs.equipmentItems = res.prefs.equipmentItems;
		prefs.gymPreset = res.prefs.gymPreset;
		prefs.machineItems = res.prefs.machineItems;
		prefs.favoriteMachines = res.prefs.favoriteMachines;
		prefs.favoriteWorkouts = res.prefs.favoriteWorkouts;
		prefs.connectNudgeDismissed = res.prefs.connectNudgeDismissed;
	} catch {
		// unauthenticated or offline: keep defaults
	}
}

export async function setGymPreset(gymPreset: Prefs['gymPreset']): Promise<void> {
	prefs.gymPreset = gymPreset;
	try {
		await api.putSettings({ gymPreset });
	} catch {
		// best-effort; ui already updated
	}
}

export async function setMachineItems(machineItems: Prefs['machineItems']): Promise<void> {
	prefs.machineItems = machineItems;
	try {
		await api.putSettings({ machineItems });
	} catch {
		// best-effort; ui already updated
	}
}

/** The machines the runner likes; a soft preference the strength builder leans on. */
export async function setFavoriteMachines(
	favoriteMachines: Prefs['favoriteMachines'],
): Promise<void> {
	prefs.favoriteMachines = favoriteMachines;
	try {
		await api.putSettings({ favoriteMachines });
	} catch {
		// best-effort; ui already updated
	}
}

/** The library workouts the runner likes; the plan names one when it fits the day. */
export async function setFavoriteWorkouts(
	favoriteWorkouts: Prefs['favoriteWorkouts'],
): Promise<void> {
	prefs.favoriteWorkouts = favoriteWorkouts;
	try {
		await api.putSettings({ favoriteWorkouts });
	} catch {
		// best-effort; ui already updated
	}
}

export async function setConnectNudgeDismissed(v: boolean): Promise<void> {
	prefs.connectNudgeDismissed = v;
	try {
		await api.putSettings({ connectNudgeDismissed: v });
	} catch {
		// best-effort; ui already updated
	}
}

export async function setEquipment(equipment: Prefs['equipment']): Promise<void> {
	prefs.equipment = equipment;
	try {
		await api.putSettings({ equipment });
	} catch {
		// best-effort; ui already updated
	}
}

export async function setEquipmentItems(equipmentItems: Prefs['equipmentItems']): Promise<void> {
	prefs.equipmentItems = equipmentItems;
	try {
		await api.putSettings({ equipmentItems });
	} catch {
		// best-effort; ui already updated
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

/**
 * The tabs a runner can choose to open on. The Coach tab stays out of this list:
 * it is a place to ask questions, not a starting point. The keys line up with the
 * primary nav, so the chosen tab and the nav share one source of truth.
 */
export const LANDING_TABS = [
	{ key: 'dashboard', label: 'Dashboard', href: '/', description: 'Your week at a glance' },
	{ key: 'today', label: 'Today', href: '/today', description: "Today's session and quick actions" },
	{ key: 'calendar', label: 'Calendar', href: '/calendar', description: 'The month ahead' },
	{ key: 'progress', label: 'Progress', href: '/progress', description: 'How the training is going' },
] as const;

export type LandingTab = (typeof LANDING_TABS)[number]['key'];

const LANDING_KEY = 'sg:landingTab';

/** The tab the runner chose to open on. Dashboard when nothing is stored. */
export function getLandingTab(): LandingTab {
	try {
		const stored = localStorage.getItem(LANDING_KEY);
		return LANDING_TABS.some((tab) => tab.key === stored) ? (stored as LandingTab) : 'dashboard';
	} catch {
		return 'dashboard';
	}
}

export function setLandingTab(tab: LandingTab): void {
	try {
		localStorage.setItem(LANDING_KEY, tab);
	} catch {
		// Storage can be unavailable in private windows; the choice still holds this session.
	}
}

/** The route for a landing tab. */
export function landingHref(tab: LandingTab): string {
	return LANDING_TABS.find((item) => item.key === tab)?.href ?? '/';
}
