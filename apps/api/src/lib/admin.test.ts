import { describe, expect, it } from 'vitest';
import {
	isRootAdminEmail,
	parseAdminEmails,
	projectAdminUser,
	type AdminUserAggregate,
} from './admin';

describe('parseAdminEmails', () => {
	it('splits, trims and lowercases, dropping blanks', () => {
		expect(parseAdminEmails(' Sam@Example.com , coach@x.io,')).toEqual(
			new Set(['sam@example.com', 'coach@x.io']),
		);
	});

	it('treats an unset or empty value as no root admins', () => {
		expect(parseAdminEmails(undefined)).toEqual(new Set());
		expect(parseAdminEmails(null)).toEqual(new Set());
		expect(parseAdminEmails('')).toEqual(new Set());
		expect(parseAdminEmails(' , ')).toEqual(new Set());
	});
});

describe('isRootAdminEmail', () => {
	const config = 'Sam@Example.com, coach@x.io';

	it('matches regardless of case or surrounding whitespace', () => {
		expect(isRootAdminEmail(config, 'sam@example.com')).toBe(true);
		expect(isRootAdminEmail(config, ' SAM@EXAMPLE.COM ')).toBe(true);
		expect(isRootAdminEmail(config, 'coach@x.io')).toBe(true);
	});

	it('rejects an email that is not in the list', () => {
		expect(isRootAdminEmail(config, 'someone@example.com')).toBe(false);
	});

	it('rejects a missing email and an empty list', () => {
		expect(isRootAdminEmail(config, null)).toBe(false);
		expect(isRootAdminEmail(config, '')).toBe(false);
		expect(isRootAdminEmail('', 'sam@example.com')).toBe(false);
		expect(isRootAdminEmail(undefined, 'sam@example.com')).toBe(false);
	});
});

/** The exact keys the admin user list is allowed to expose. */
const ALLOWED_KEYS = [
	'connectionCount',
	'connectionStatus',
	'createdAt',
	'email',
	'goalProfileSlug',
	'id',
	'isRoot',
	'lastLogAt',
	'planCount',
	'role',
];

describe('projectAdminUser', () => {
	const base: AdminUserAggregate = {
		id: 'u1',
		email: 'runner@example.com',
		createdAt: new Date('2026-01-02T03:04:05Z'),
		role: 'user',
		goalProfileSlug: 'half-marathon',
		planCount: 3,
		lastLogAt: 1767225845,
		connectionCount: 2,
		errorConnectionCount: 0,
	};

	it('returns exactly the allowed metadata keys', () => {
		const row = projectAdminUser(base, false);
		expect(Object.keys(row).sort()).toEqual([...ALLOWED_KEYS].sort());
	});

	it('drops anything private that a raw row might carry', () => {
		// A future column on any source table, or an accidental join, must not leak.
		const withPrivate = {
			...base,
			healthMetrics: { resting_hr: 48 },
			healthSamples: [{ metric: 'weight', value: 71.2 }],
			notes: 'felt rough on the hills',
			rpe: 8,
			runStats: { distanceKm: 12.4, avgPaceSecPerKm: 301 },
			route: { points: [[1, 2]] },
		} as AdminUserAggregate;
		const row = projectAdminUser(withPrivate, false) as unknown as Record<string, unknown>;
		expect(Object.keys(row).sort()).toEqual([...ALLOWED_KEYS].sort());
		for (const key of ['healthMetrics', 'healthSamples', 'notes', 'rpe', 'runStats', 'route']) {
			expect(row[key]).toBeUndefined();
		}
	});

	it('maps dates, counts and the root flag', () => {
		const row = projectAdminUser(base, true);
		expect(row.createdAt).toBe('2026-01-02T03:04:05.000Z');
		expect(row.lastLogAt).toBe(new Date(1767225845 * 1000).toISOString());
		expect(row.planCount).toBe(3);
		expect(row.isRoot).toBe(true);
	});

	it('reports connection status from the counts, and null when unlinked', () => {
		expect(projectAdminUser({ ...base, errorConnectionCount: 1 }, false).connectionStatus).toBe(
			'error',
		);
		expect(projectAdminUser(base, false).connectionStatus).toBe('connected');
		expect(
			projectAdminUser({ ...base, connectionCount: 0, errorConnectionCount: 0 }, false)
				.connectionStatus,
		).toBeNull();
	});

	it('treats missing aggregate values as zero and null', () => {
		const sparse: AdminUserAggregate = {
			id: 'u2',
			email: 'new@example.com',
			createdAt: null,
			role: 'user',
			goalProfileSlug: null,
			planCount: null,
			lastLogAt: null,
			connectionCount: null,
			errorConnectionCount: null,
		};
		const row = projectAdminUser(sparse, false);
		expect(row.planCount).toBe(0);
		expect(row.connectionCount).toBe(0);
		expect(row.connectionStatus).toBeNull();
		expect(row.createdAt).toBeNull();
		expect(row.lastLogAt).toBeNull();
	});
});
