import { Hono } from 'hono';
import { normalizeHealthRow, recoverySignal, type HealthDay } from '@strideguide/shared/plan';
import type { AppBindings } from '../types';

/**
 * Daily recovery context (resting HR, HRV, sleep) when a connector has supplied
 * it. The health_daily table is added by the provider sync work; this route does
 * not depend on it existing. It checks for the table first and returns
 * available: false when it is absent, so the app simply shows nothing.
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

recovery.get('/', async (c) => {
	const user = c.get('user')!;
	const db = c.env.DB;

	if (!(await hasHealthDaily(db))) {
		return c.json({ available: false, signal: null, days: [] });
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
		const signal = days.length ? recoverySignal(days) : null;
		return c.json({ available: true, signal, days });
	} catch {
		// A schema difference in a table we do not own is not an error here.
		return c.json({ available: false, signal: null, days: [] });
	}
});

export default recovery;
