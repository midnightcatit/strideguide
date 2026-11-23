/**
 * Recovery signal from daily health data (resting HR, HRV, sleep), when a
 * connector has supplied it. Pure and I/O-free, and entirely optional: callers
 * that have no health data simply do not call it, and the plan is unaffected.
 *
 * The read compares the most recent few days against the rest of the window, so
 * a personal baseline is used rather than an absolute population number.
 */

export interface HealthDay {
	/** ISO yyyy-mm-dd. */
	date: string;
	restingHr?: number | null;
	hrvMs?: number | null;
	sleepMin?: number | null;
}

export interface RecoverySignal {
	/** Days of health data behind the read. */
	days: number;
	avgRestingHr?: number;
	avgHrvMs?: number;
	avgSleepMin?: number;
	restingHrElevated: boolean;
	hrvSuppressed: boolean;
	shortSleep: boolean;
	/** Any flag raised, meaning the runner may be carrying fatigue. */
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
}

export const RECOVERY_CONFIG: RecoveryConfig = {
	recentDays: 3,
	restingHrElevatedBpm: 5,
	hrvSuppressedPct: 0.15,
	shortSleepMin: 6 * 60,
	minDays: 3,
};

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
 * strain when recent resting HR runs high, HRV runs low, or sleep runs short
 * against the runner's own baseline.
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
	const baseRhr = base((d) => d.restingHr);
	const baseHrv = base((d) => d.hrvMs);

	out.avgRestingHr = recentRhr != null ? Math.round(recentRhr) : undefined;
	out.avgHrvMs = recentHrv != null ? Math.round(recentHrv) : undefined;
	out.avgSleepMin = recentSleep != null ? Math.round(recentSleep) : undefined;

	if (recentRhr != null && baseRhr != null) {
		out.restingHrElevated = recentRhr > baseRhr + cfg.restingHrElevatedBpm;
	}
	if (recentHrv != null && baseHrv != null && baseHrv > 0) {
		out.hrvSuppressed = recentHrv < baseHrv * (1 - cfg.hrvSuppressedPct);
	}
	if (recentSleep != null) {
		out.shortSleep = recentSleep < cfg.shortSleepMin;
	}

	out.strained = out.restingHrElevated || out.hrvSuppressed || out.shortSleep;
	return out;
}
