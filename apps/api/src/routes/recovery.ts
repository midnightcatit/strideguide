import { Hono } from 'hono';
import { normalizeHealthRow, recoverySignal, type HealthDay } from '@strideguide/shared/plan';
import { loadHealthDaysFromMetrics } from '../lib/health-metrics';
import type { AppBindings } from '../types';

/**
 * Daily recovery context when a connector has supplied it, plus a steps series
 * for the days that carry one. The generic metric store carries every signal the
 * recovery read now uses (resting HR, HRV, sleep, SpO2, breathing rate, night
 * temperature); the older health_daily table is still read when the store is
 * absent, so a deployment that has not migrated yet keeps working. The route
 * checks for the table first and returns available: false when there is no data,
 * so the app simply shows nothing.
 */
const recovery = new Hono<AppBindings>();

async function hasHealthDaily(db: AppBindings['Bindings']['DB']): Promise<boolean> {
	try {
		const row = await db
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'health_daily'")
			.first<{ name: string }>();
		return !!row;
	} catch {
		return false;
	}
}

/** One day's step total, kept out of the response when the day has none. */
export function stepDay(row: Record<string, unknown>): { date: string; steps: number } | null {
	const date = typeof row.date === 'string' ? row.date.slice(0, 10) : '';
	const raw = row.steps;
	if (!date || raw === null || raw === undefined || raw === '') return null;
	const steps = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(steps)) return null;
	return { date, steps: Math.round(steps) };
}

/** A recovery payload, empty when no connector has supplied any health data. */
function empty() {
	return { available: false, signal: null, days: [] as HealthDay[], steps: [] as { date: string; steps: number }[] };
}

recovery.get('/', async (c) => {
	const user = c.get('user')!;
	const db = c.env.DB;

	// Preferred source: the generic metrics store, which carries every signal.
	try {
		const fromMetrics = await loadHealthDaysFromMetrics(db, user.id, 21);
		if (fromMetrics && fromMetrics.days.length) {
			const signal = recoverySignal(fromMetrics.days);
			return c.json({ available: true, signal, days: fromMetrics.days, steps: fromMetrics.steps });
		}
	} catch {
		// Fall through to the legacy table, then to an empty payload.
	}

	if (!(await hasHealthDaily(db))) {
		return c.json(empty());
	}

	try {
		const result = await db
			.prepare('SELECT * FROM health_daily WHERE user_id = ? ORDER BY date DESC LIMIT 21')
			.bind(user.id)
			.all<Record<string, unknown>>();
		const rows = (result.results ?? []) as Record<string, unknown>[];
		const days: HealthDay[] = rows
			.map((r) => normalizeHealthRow(r))
			.filter((d): d is HealthDay => !!d);
		const steps = rows.map(stepDay).filter((s): s is { date: string; steps: number } => !!s);
		const signal = days.length ? recoverySignal(days) : null;
		return c.json({ available: true, signal, days, steps });
	} catch {
		// A schema difference in a table we do not own is not an error here.
		return c.json(empty());
	}
});

export default recovery;
