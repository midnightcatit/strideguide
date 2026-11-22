import type { TrainingPaces } from './types';

/**
 * VDOT-based training paces (Daniels). Pure, dependency-free.
 * References: Daniels' Running Formula (VDOT): velocity<->VO2 and
 * sustainable-fraction-of-VO2max equations.
 */

/** VO2 (ml/kg/min) at a running velocity (metres/minute). */
function vo2FromVelocity(v: number): number {
	return -4.6 + 0.182258 * v + 0.000104 * v * v;
}

/** Fraction of VO2max sustainable for a duration (minutes). */
function fractionOfMax(durationMin: number): number {
	return (
		0.8 +
		0.1894393 * Math.exp(-0.012778 * durationMin) +
		0.2989558 * Math.exp(-0.1932605 * durationMin)
	);
}

/** Invert vo2FromVelocity: velocity (m/min) for a given VO2. */
function velocityForVo2(vo2: number): number {
	const a = 0.000104;
	const b = 0.182258;
	const c = -4.6 - vo2;
	const disc = b * b - 4 * a * c;
	return (-b + Math.sqrt(disc)) / (2 * a);
}

/** VDOT from a race performance. */
export function vdotFromRace(distanceM: number, timeSec: number): number {
	const minutes = timeSec / 60;
	const v = distanceM / minutes; // m/min
	const vo2 = vo2FromVelocity(v);
	return vo2 / fractionOfMax(minutes);
}

/** Training paces (sec/km) for a VDOT, using Daniels' intensity anchors. */
export function pacesFromVdot(vdot: number): TrainingPaces {
	const paceAt = (pctOfMax: number): number => {
		const vo2 = vdot * pctOfMax;
		const v = velocityForVo2(vo2); // m/min
		return (1000 / v) * 60; // sec/km
	};
	// Anchors (mid of Daniels' bands), converted from %VO2max.
	return {
		easy: [paceAt(0.65), paceAt(0.7)],
		marathon: paceAt(0.79),
		threshold: paceAt(0.86),
		interval: paceAt(0.975),
		repetition: paceAt(1.05),
	};
}

/** Best-effort VDOT from a baseline's recent times, else undefined. */
export function vdotFromBaseline(recentTimes?: Record<string, string>): number | undefined {
	if (!recentTimes) return undefined;
	const distances: Record<string, number> = {
		mile: 1609.34,
		'5k': 5000,
		'10k': 10000,
		'half': 21097.5,
		'marathon': 42195,
	};
	let best: number | undefined;
	for (const [key, raw] of Object.entries(recentTimes)) {
		const dist = distances[key.toLowerCase()];
		const secs = parseTime(raw);
		if (!dist || !secs || secs <= 0) continue;
		const v = vdotFromRace(dist, secs);
		if (v > 0 && Number.isFinite(v) && (best === undefined || v > best)) best = v;
	}
	return best;
}

/** Parse "24:30" or "1:45:00" or "h:mm:ss" into seconds. */
export function parseTime(raw: string): number | undefined {
	const parts = raw.trim().split(':').map((p) => Number(p));
	if (parts.some((n) => Number.isNaN(n))) return undefined;
	let secs = 0;
	for (const p of parts) secs = secs * 60 + p;
	return secs;
}

/** Format seconds-per-km as "m:ss". */
export function formatPace(secPerKm: number): string {
	const m = Math.floor(secPerKm / 60);
	const s = Math.round(secPerKm % 60);
	return `${m}:${String(s).padStart(2, '0')}`;
}
