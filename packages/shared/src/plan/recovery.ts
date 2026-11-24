/**
 * Recovery signal from daily health data (resting HR, HRV, sleep and the newer
 * vitals), when a connector has supplied it. Pure and I/O-free, and entirely
 * optional: callers that have no health data simply do not call it, and the plan
 * is unaffected.
 *
 * The read compares the most recent few days against the rest of the window, so
 * a personal baseline is used rather than an absolute population number. Every
 * signal is optional and only flags when the data is there, so a device that
 * reports nothing does not look healthy or strained; it simply stays quiet.
 */

export interface HealthDay {
	/** ISO yyyy-mm-dd. */
	date: string;
	restingHr?: number | null;
	hrvMs?: number | null;
	sleepMin?: number | null;
	spo2Avg?: number | null;
	respiratoryRate?: number | null;
	sleepTempC?: number | null;
	vo2Max?: number | null;
	steps?: number | null;
}

export interface RecoverySignal {
	/** Days of health data behind the read. */
	days: number;
	avgRestingHr?: number;
	avgHrvMs?: number;
	avgSleepMin?: number;
	avgSpo2Pct?: number;
	avgRespiratoryRate?: number;
	restingHrElevated: boolean;
	hrvSuppressed: boolean;
	shortSleep: boolean;
	lowSpo2: boolean;
	respiratoryRateElevated: boolean;
	sleepTempElevated: boolean;
	/** Any flag raised, meaning the runner may be carrying fatigue or illness. */
	strained: boolean;
}

export interface RecoveryConfig {
	/** Recent days compared against the baseline. */
	recentDays: number;
	/** Elevation in resting HR, beats per minute, that counts as up. */
	restingHrElevatedBpm: number;
	/** HRV drop as a fraction of baseline that counts as suppressed. */
	hrvSuppressedPct: number;
	/** Average sleep under this many minutes counts as short. */
	shortSleepMin: number;
	/** Below this many days the read is too thin to flag anything. */
	minDays: number;
	/** Oxygen saturation under this percent is worth flagging. */
	lowSpo2Pct: number;
	/** Breathing-rate rise over baseline, as a fraction, that counts as up. */
	respiratoryRateElevatedPct: number;
	/** Night temperature rise over baseline, in Celsius, that counts as up. */
	sleepTempElevatedC: number;
}

export const RECOVERY_CONFIG: RecoveryConfig = {
	recentDays: 3,
	restingHrElevatedBpm: 5,
	hrvSuppressedPct: 0.15,
	shortSleepMin: 6 * 60,
	minDays: 3,
	lowSpo2Pct: 94,
	respiratoryRateElevatedPct: 0.1,
	sleepTempElevatedC: 0.5,
};

/**
 * How a stored metric key becomes a health day field, kept as data so a new
 * metric can feed the read without a new branch. Keys match the sync's own
 * metric vocabulary.
 */
export const HEALTH_METRIC_FIELDS: { metric: string; field: keyof HealthDay }[] = [
	{ metric: 'resting_hr', field: 'restingHr' },
	{ metric: 'hrv_ms', field: 'hrvMs' },
	{ metric: 'sleep_min', field: 'sleepMin' },
	{ metric: 'spo2_avg', field: 'spo2Avg' },
	{ metric: 'respiratory_rate', field: 'respiratoryRate' },
	{ metric: 'sleep_temp_c', field: 'sleepTempC' },
	{ metric: 'vo2_max', field: 'vo2Max' },
	{ metric: 'steps', field: 'steps' },
];

/** The numeric fields on a day, so a metric key can be assigned by name. */
type NumericHealthField = Exclude<keyof HealthDay, 'date'>;

/**
 * Build one health day from a stored metrics map (metric key to value). A key the
 * day does not carry is left absent, never zero.
 */
export function dayFromMetrics(
	date: string,
	metrics: Record<string, number | null | undefined>,
): HealthDay {
	const day: HealthDay = { date };
	for (const { metric, field } of HEALTH_METRIC_FIELDS) {
		const value = metrics[metric];
		if (typeof value === 'number' && Number.isFinite(value)) {
			day[field as NumericHealthField] = value;
		}
	}
	return day;
}

function mean(values: number[]): number | undefined {
	if (!values.length) return undefined;
	return values.reduce((s, v) => s + v, 0) / values.length;
}

function num(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Read one health row from a connector payload whose column names are not
 * fixed. It accepts the common spellings for resting heart rate, HRV and sleep,
 * and normalises sleep to minutes. Returns null when there is no usable date.
 */
export function normalizeHealthRow(raw: Record<string, unknown>): HealthDay | null {
	const date = typeof raw.date === 'string' ? raw.date.slice(0, 10) : undefined;
	if (!date) return null;
	const restingHr = num(raw.restingHr) ?? num(raw.resting_hr) ?? num(raw.restingHeartRate);
	const hrvMs = num(raw.hrvMs) ?? num(raw.hrv_ms) ?? num(raw.hrv);
	let sleepMin = num(raw.sleepMin) ?? num(raw.sleep_min);
	if (sleepMin == null) {
		const hours = num(raw.sleepHours) ?? num(raw.sleep_hours);
		if (hours != null) sleepMin = hours * 60;
	}
	return {
		date,
		restingHr: restingHr ?? null,
		hrvMs: hrvMs ?? null,
		sleepMin: sleepMin != null ? Math.round(sleepMin) : null,
	};
}

/**
 * Read a recovery signal from the most recent days of health data. Expects the
 * days sorted newest first or oldest first; it sorts by date itself. Flags a
 * strain when recent resting HR runs high, HRV runs low, sleep runs short,
 * oxygen saturation dips, breathing rate climbs or night temperature rises,
 * each against the runner's own baseline where a baseline is possible.
 */
export function recoverySignal(days: HealthDay[], cfg: RecoveryConfig = RECOVERY_CONFIG): RecoverySignal {
	const sorted = [...days]
		.filter((d) => !!d.date)
		.sort((a, b) => a.date.localeCompare(b.date));
	const out: RecoverySignal = {
		days: sorted.length,
		restingHrElevated: false,
		hrvSuppressed: false,
		shortSleep: false,
		lowSpo2: false,
		respiratoryRateElevated: false,
		sleepTempElevated: false,
		strained: false,
	};
	if (sorted.length < cfg.minDays) return out;

	const recent = sorted.slice(-cfg.recentDays);
	const baseline = sorted.slice(0, Math.max(0, sorted.length - cfg.recentDays));

	const avg = (pick: (d: HealthDay) => number | null | undefined) =>
		mean(recent.map(pick).filter((v): v is number => typeof v === 'number'));

	const base = (pick: (d: HealthDay) => number | null | undefined) =>
		mean(baseline.map(pick).filter((v): v is number => typeof v === 'number'));

	const recentRhr = avg((d) => d.restingHr);
	const recentHrv = avg((d) => d.hrvMs);
	const recentSleep = avg((d) => d.sleepMin);
	const recentSpo2 = avg((d) => d.spo2Avg);
	const recentRr = avg((d) => d.respiratoryRate);
	const recentTemp = avg((d) => d.sleepTempC);
	const baseRhr = base((d) => d.restingHr);
	const baseHrv = base((d) => d.hrvMs);
	const baseRr = base((d) => d.respiratoryRate);
	const baseTemp = base((d) => d.sleepTempC);

	out.avgRestingHr = recentRhr != null ? Math.round(recentRhr) : undefined;
	out.avgHrvMs = recentHrv != null ? Math.round(recentHrv) : undefined;
	out.avgSleepMin = recentSleep != null ? Math.round(recentSleep) : undefined;
	out.avgSpo2Pct = recentSpo2 != null ? Math.round(recentSpo2 * 10) / 10 : undefined;
	out.avgRespiratoryRate = recentRr != null ? Math.round(recentRr * 10) / 10 : undefined;

	if (recentRhr != null && baseRhr != null) {
		out.restingHrElevated = recentRhr > baseRhr + cfg.restingHrElevatedBpm;
	}
	if (recentHrv != null && baseHrv != null && baseHrv > 0) {
		out.hrvSuppressed = recentHrv < baseHrv * (1 - cfg.hrvSuppressedPct);
	}
	if (recentSleep != null) {
		out.shortSleep = recentSleep < cfg.shortSleepMin;
	}
	if (recentSpo2 != null) {
		out.lowSpo2 = recentSpo2 < cfg.lowSpo2Pct;
	}
	if (recentRr != null && baseRr != null && baseRr > 0) {
		out.respiratoryRateElevated = recentRr > baseRr * (1 + cfg.respiratoryRateElevatedPct);
	}
	if (recentTemp != null && baseTemp != null) {
		out.sleepTempElevated = recentTemp > baseTemp + cfg.sleepTempElevatedC;
	}

	out.strained =
		out.restingHrElevated ||
		out.hrvSuppressed ||
		out.shortSleep ||
		out.lowSpo2 ||
		out.respiratoryRateElevated ||
		out.sleepTempElevated;
	return out;
}
