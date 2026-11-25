/**
 * Chart theme for the health surfaces, kept pure so it can be reasoned about and
 * tested on its own. It ties each metric to a family (heart, sleep, activity,
 * body, training load), and each family to one slot in the shared chart palette,
 * so a metric draws in the same colour everywhere. It also holds the small
 * helpers the cards share: date conversion, a shortened day label, and the
 * period-over-period change.
 */

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
 * Goals drawn as a line on the activity bars. Rough daily targets, not medical
 * advice: 10,000 steps is the common consumer default, 500 kcal a common active
 * energy goal, and 21 active-zone minutes is the WHO 150 a week goal per day.
 */
export const METRIC_GOALS: Record<string, number> = {
	steps: 10000,
	active_energy_kcal: 500,
	active_zone_min: 21,
};

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
 * The change between the newer half and the older half of a window: the mean of
 * the most recent readings minus the mean of the earlier ones. Null when there
 * are fewer than two readings, so a lone day gets no delta. This is the
 * closest an honest read can get to a previous window without a second fetch.
 */
export function periodDelta(values: number[]): number | null {
	const nums = values.filter((v) => Number.isFinite(v));
	if (nums.length < 2) return null;
	const mid = Math.floor(nums.length / 2);
	const earlier = nums.slice(0, mid);
	const later = nums.slice(mid);
	const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
	return mean(later) - mean(earlier);
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
