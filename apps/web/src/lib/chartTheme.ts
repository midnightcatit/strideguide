/**
 * Chart theme for the health surfaces, kept pure so it can be reasoned about and
 * tested on its own. It ties each metric to a family (heart, sleep, activity,
 * body, training load), and each family to one slot in the shared chart palette,
 * so a metric draws in the same colour everywhere. It also holds the small
 * helpers the cards share: date conversion, a shortened day label, and the
 * period-over-period change.
 */

import type { Prefs } from '@strideguide/shared/units';

export type ChartFamily = 'heart' | 'sleep' | 'activity' | 'body' | 'load';

/**
 * One palette slot per family, from `--chart-1` to `--chart-8` (`chartOrder` in
 * @strideguide/shared/tokens). Indices are 1-based to match the variable name.
 */
export const FAMILY_CHART: Record<ChartFamily, number> = {
	heart: 2, // blue
	sleep: 7, // violet
	activity: 4, // green
	body: 3, // teal
	load: 5, // amber
};

/** The CSS colour for a family, as a palette variable. */
export function familyColor(family: ChartFamily): string {
	return `var(--chart-${FAMILY_CHART[family]})`;
}

/**
 * Each metric and the family it belongs to. A metric that is not named here (an
 * unknown body measurement) falls back to the body family, so it never draws
 * grey.
 */
export const METRIC_FAMILY: Record<string, ChartFamily> = {
	resting_hr: 'heart',
	hrv_ms: 'heart',
	hr_min: 'heart',
	hr_avg: 'heart',
	hr_max: 'heart',
	spo2_avg: 'heart',
	spo2_low: 'heart',
	spo2_high: 'heart',
	respiratory_rate: 'heart',
	vo2_max: 'heart',

	sleep_min: 'sleep',
	sleep_deep_min: 'sleep',
	sleep_rem_min: 'sleep',
	sleep_light_min: 'sleep',
	sleep_awake_min: 'sleep',
	sleep_temp_c: 'sleep',

	steps: 'activity',
	active_energy_kcal: 'activity',
	active_zone_min: 'activity',
	active_min: 'activity',
	total_calories_kcal: 'activity',
	sedentary_min: 'activity',
	floors: 'activity',
	altitude_gain_m: 'activity',
	distance_m: 'activity',

	weight_kg: 'body',
	body_fat_pct: 'body',
	height_mm: 'body',
	core_temp_c: 'body',
	blood_glucose_mgdl: 'body',
};

/** The family for a metric key, defaulting to body for an unknown measurement. */
export function metricFamily(key: string): ChartFamily {
	return METRIC_FAMILY[key] ?? 'body';
}

/** The CSS colour a metric draws in, everywhere it appears. */
export function metricColor(key: string): string {
	return familyColor(metricFamily(key));
}

/**
 * The four sleep stages as one family colour at four strengths, so the stack
 * reads as a single metric split into parts. The opacity is applied per bar
 * series and mirrored by the card's own legend swatches.
 */
export const SLEEP_STAGES: { key: string; label: string; opacity: number }[] = [
	{ key: 'sleep_deep_min', label: 'Deep', opacity: 1 },
	{ key: 'sleep_rem_min', label: 'REM', opacity: 0.68 },
	{ key: 'sleep_light_min', label: 'Light', opacity: 0.42 },
	{ key: 'sleep_awake_min', label: 'Awake', opacity: 0.2 },
];

/**
 * Goals drawn as a line on the activity bars. The defaults are rough daily
 * targets, not medical advice: 10,000 steps is the common consumer default, 500
 * kcal a common active energy goal, and 21 active-zone minutes is the WHO 150 a
 * week goal per day. A runner who sets their own goals in Settings overrides
 * these; anything unset falls back to the default here.
 */
export const GOAL_DEFAULTS = {
	steps: 10000,
	active_energy_kcal: 500,
	active_zone_min: 21,
} as const;

/** The goal prefs a metric's line reads, the fields a runner can override. */
export type GoalPrefs = Pick<Prefs, 'stepGoal' | 'activeEnergyGoalKcal' | 'activeZoneGoalMin'>;

/** A positive stored override, or the default when it is unset or not usable. */
function goalOr(value: number | undefined, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * The daily goal for a metric, from the runner's prefs with the app default as
 * the fallback. Null for a metric that has no goal, so the chart draws no line.
 */
export function metricGoal(key: string, prefs: GoalPrefs): number | null {
	switch (key) {
		case 'steps':
			return goalOr(prefs.stepGoal, GOAL_DEFAULTS.steps);
		case 'active_energy_kcal':
			return goalOr(prefs.activeEnergyGoalKcal, GOAL_DEFAULTS.active_energy_kcal);
		case 'active_zone_min':
			return goalOr(prefs.activeZoneGoalMin, GOAL_DEFAULTS.active_zone_min);
		default:
			return null;
	}
}

/** Parse an ISO day or timestamp into a Date at UTC, or null when unreadable. */
export function toDate(iso: string): Date | null {
	const ms = Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
	return Number.isNaN(ms) ? null : new Date(ms);
}

/** An ISO day turned into a short label, e.g. "Nov 12". */
export function shortDay(iso: string): string {
	const d = toDate(iso);
	if (!d) return iso;
	return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** A day's short weekday name, e.g. "Mon". */
export function shortWeekday(iso: string): string {
	const d = toDate(iso);
	if (!d) return '';
	return d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });
}

/**
 * The period-over-period change: the mean of this window's readings minus the
 * mean of the previous window of the same length. `previousMean` is the mean the
 * server computed over the window before this one, so the change is a true step
 * back in time rather than a split of a single window. Null when the previous
 * window carries no reading, or this window has none, so a lone day shows no
 * change instead of a made-up one.
 */
export function periodDelta(
	values: number[],
	previousMean: number | null | undefined,
): number | null {
	if (previousMean == null || !Number.isFinite(previousMean)) return null;
	const nums = values.filter((v) => Number.isFinite(v));
	if (nums.length === 0) return null;
	const mean = nums.reduce((s, x) => s + x, 0) / nums.length;
	return mean - previousMean;
}

/** A signed value with a fixed number of decimals and an explicit sign. */
export function signed(value: number, decimals = 0): string {
	const rounded = Number(value.toFixed(decimals));
	if (rounded === 0) return (0).toFixed(decimals);
	const sign = rounded > 0 ? '+' : '-';
	return `${sign}${Math.abs(rounded).toFixed(decimals)}`;
}

/**
 * The typical range of a window as one standard deviation either side of the
 * mean, or null when there is nothing to spread. Used as the normal-range band
 * on a time series, so the band is this person's own spread over the window
 * rather than a clinical claim the app cannot make.
 */
export function spreadBand(values: number[]): [number, number] | null {
	const nums = values.filter((v) => Number.isFinite(v));
	if (nums.length < 3) return null;
	const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
	const variance = nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
	const sd = Math.sqrt(variance);
	if (!Number.isFinite(sd) || sd === 0) return null;
	return [mean - sd, mean + sd];
}
