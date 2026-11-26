import { describe, expect, it } from 'vitest';
import {
	buildAdminAction,
	clampAdminLimit,
	disableRefusal,
	floorAdminOffset,
	isRootAdminEmail,
	normalizeAdminSearch,
	normalizeEmail,
	parseAdminEmails,
	projectAdminUser,
	projectAdminUserDetail,
	removalRefusal,
	type AdminUserAggregate,
	type AdminUserDetailAggregate,
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

describe('normalizeEmail', () => {
	it('trims and lowercases, and treats a missing value as empty', () => {
		expect(normalizeEmail('  Sam@Example.COM ')).toBe('sam@example.com');
		expect(normalizeEmail(null)).toBe('');
		expect(normalizeEmail(undefined)).toBe('');
	});
});

describe('removalRefusal', () => {
	it('refuses self, a root admin and another admin, in the verb asked for', () => {
		expect(removalRefusal({ id: 'a', role: 'user', isRoot: false }, 'a', 'delete')).toBe(
			'You cannot delete your own account.',
		);
		expect(
			removalRefusal({ id: 'b', role: 'user', isRoot: true }, 'a', 'permanently delete'),
		).toBe('You cannot permanently delete a root admin.');
		expect(removalRefusal({ id: 'b', role: 'admin', isRoot: false }, 'a', 'disable')).toBe(
			'You cannot disable another admin.',
		);
		expect(removalRefusal({ id: 'b', role: 'user', isRoot: false }, 'a', 'delete')).toBeNull();
	});
});

/** The exact keys the admin user list is allowed to expose. */
const ALLOWED_KEYS = [
	'connectionCount',
	'connectionStatus',
	'createdAt',
	'deleted',
	'disabled',
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
		disabledAt: null,
		deletedAt: null,
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
			disabledAt: null,
			deletedAt: null,
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

	it('reports the disabled state from the marker', () => {
		expect(projectAdminUser(base, false).disabled).toBe(false);
		expect(projectAdminUser({ ...base, disabledAt: 1767225845 }, false).disabled).toBe(true);
	});
});

describe('clampAdminLimit', () => {
	it('defaults when the value is missing or not a number', () => {
		expect(clampAdminLimit(undefined)).toBe(25);
		expect(clampAdminLimit(null)).toBe(25);
		expect(clampAdminLimit('')).toBe(25);
		expect(clampAdminLimit('abc')).toBe(25);
	});

	it('clamps to the 1..100 range and floors', () => {
		expect(clampAdminLimit('0')).toBe(1);
		expect(clampAdminLimit('-3')).toBe(1);
		expect(clampAdminLimit('1000')).toBe(100);
		expect(clampAdminLimit('12.9')).toBe(12);
		expect(clampAdminLimit('50')).toBe(50);
	});
});

describe('floorAdminOffset', () => {
	it('defaults to zero and refuses a negative or bad value', () => {
		expect(floorAdminOffset(undefined)).toBe(0);
		expect(floorAdminOffset('')).toBe(0);
		expect(floorAdminOffset('abc')).toBe(0);
		expect(floorAdminOffset('-5')).toBe(0);
	});

	it('floors a fractional and passes through a positive integer', () => {
		expect(floorAdminOffset('3.7')).toBe(3);
		expect(floorAdminOffset('40')).toBe(40);
	});
});

describe('normalizeAdminSearch', () => {
	it('trims and treats a missing value as empty', () => {
		expect(normalizeAdminSearch('  runner@example.com  ')).toBe('runner@example.com');
		expect(normalizeAdminSearch(undefined)).toBe('');
		expect(normalizeAdminSearch(null)).toBe('');
	});
});

describe('disableRefusal', () => {
	const user = { id: 'u1', role: 'user' as const, isRoot: false };

	it('allows disabling a plain user', () => {
		expect(disableRefusal(user, 'admin-1')).toBeNull();
	});

	it('refuses the admin disabling themselves', () => {
		expect(disableRefusal({ ...user, id: 'admin-1' }, 'admin-1')).toContain('your own account');
	});

	it('refuses a root admin and another admin', () => {
		expect(disableRefusal({ ...user, isRoot: true }, 'admin-1')).toContain('root admin');
		expect(disableRefusal({ ...user, role: 'admin' }, 'admin-1')).toContain('another admin');
	});
});

describe('buildAdminAction', () => {
	it('carries the actor, action, target and detail, with a fresh id and time', () => {
		const row = buildAdminAction({
			actorId: 'admin-1',
			action: 'disable_user',
			targetType: 'user',
			targetId: 'u1',
			detail: { reason: 'spam' },
		});
		expect(row.actorId).toBe('admin-1');
		expect(row.action).toBe('disable_user');
		expect(row.targetType).toBe('user');
		expect(row.targetId).toBe('u1');
		expect(row.detail).toEqual({ reason: 'spam' });
		expect(typeof row.id).toBe('string');
		expect(row.createdAt).toBeInstanceOf(Date);
	});

	it('defaults a missing target and detail to null', () => {
		const row = buildAdminAction({
			actorId: 'admin-1',
			action: 'enable_user',
			targetType: 'user',
			targetId: null,
		});
		expect(row.targetId).toBeNull();
		expect(row.detail).toBeNull();
	});
});

describe('projectAdminUserDetail', () => {
	const aggregate: AdminUserDetailAggregate = {
		id: 'u1',
		email: 'runner@example.com',
		createdAt: new Date('2026-01-02T03:04:05Z'),
		role: 'user',
		disabledAt: new Date('2026-02-03T04:05:06Z'),
		deletedAt: null,
		goals: [
			{
				slug: 'half-marathon',
				targetDate: '2026-05-01',
				status: 'active',
				createdAt: new Date('2026-01-02T03:04:05Z'),
			},
		],
		plans: [
			{
				version: 2,
				generatedAt: new Date('2026-01-02T03:04:05Z'),
				weekCount: 12,
				status: 'active',
			},
		],
		logs: { count: 9, earliest: 1767225845, latest: 1768000000 },
		connections: [
			{
				provider: 'google-health',
				status: 'error',
				lastSyncedAt: 1767225845,
				lastError: 'heart-rate',
			},
		],
		healthCoverage: [{ metric: 'resting_hr', rows: 40, firstDate: '2026-01-01', lastDate: '2026-02-01' }],
		actions: [
			{
				id: 'a1',
				actorId: 'admin-1',
				action: 'disable_user',
				targetType: 'user',
				targetId: 'u1',
				detail: null,
				createdAt: 1767225845,
			},
		],
	};

	const ALLOWED_DETAIL_KEYS = [
		'actions',
		'connections',
		'createdAt',
		'deleted',
		'deletedAt',
		'disabled',
		'disabledAt',
		'email',
		'goals',
		'healthCoverage',
		'id',
		'isRoot',
		'logs',
		'plans',
		'role',
	];

	it('returns exactly the allowed detail keys', () => {
		const detail = projectAdminUserDetail(aggregate, false);
		expect(Object.keys(detail).sort()).toEqual([...ALLOWED_DETAIL_KEYS].sort());
	});

	it('maps timestamps and the disabled state', () => {
		const detail = projectAdminUserDetail(aggregate, true);
		expect(detail.createdAt).toBe('2026-01-02T03:04:05.000Z');
		expect(detail.disabled).toBe(true);
		expect(detail.disabledAt).toBe('2026-02-03T04:05:06.000Z');
		expect(detail.isRoot).toBe(true);
		expect(detail.logs.count).toBe(9);
		expect(detail.logs.earliest).toBe(new Date(1767225845 * 1000).toISOString());
		expect(detail.healthCoverage[0]!.rows).toBe(40);
		expect(detail.healthCoverage[0]!.firstDate).toBe('2026-01-01');
	});

	it('treats an active account as not disabled', () => {
		const detail = projectAdminUserDetail({ ...aggregate, disabledAt: null }, false);
		expect(detail.disabled).toBe(false);
		expect(detail.disabledAt).toBeNull();
	});
});
