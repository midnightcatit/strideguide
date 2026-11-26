import { describe, expect, it } from 'vitest';
import { breadcrumbFor } from './breadcrumbs';

describe('breadcrumbFor', () => {
	it('shows the mark on a top-level tab', () => {
		expect(breadcrumbFor('/today')).toEqual([]);
		expect(breadcrumbFor('/calendar')).toEqual([]);
		expect(breadcrumbFor('/')).toEqual([]);
	});

	it('builds a trail for a nested settings page', () => {
		expect(breadcrumbFor('/progress/health')).toEqual([
			{ label: 'Progress', href: '/progress' },
			{ label: 'Health', href: '/progress/health' },
		]);
	});

	it('names a session view without showing the raw id', () => {
		expect(breadcrumbFor('/session/abc123')).toEqual([
			{ label: 'Session', href: '/session/abc123' },
		]);
	});

	it('leads a session view with the tab it was opened from', () => {
		expect(breadcrumbFor('/session/abc123', '/today')).toEqual([
			{ label: 'Today', href: '/today' },
			{ label: 'Session', href: '/session/abc123?from=%2Ftoday' },
		]);
	});

	it('names an imported activity without showing the raw id', () => {
		expect(breadcrumbFor('/activity/act123')).toEqual([
			{ label: 'Activity', href: '/activity/act123' },
		]);
	});

	it('leads an activity view with the tab it was opened from', () => {
		expect(breadcrumbFor('/activity/act123', '/today?date=2026-11-25')).toEqual([
			{ label: 'Today', href: '/today?date=2026-11-25' },
			{ label: 'Activity', href: '/activity/act123?from=%2Ftoday%3Fdate%3D2026-11-25' },
		]);
	});

	it('drops a query from the from view but keeps it in the link', () => {
		expect(breadcrumbFor('/session/abc123', '/today?date=2026-11-25')).toEqual([
			{ label: 'Today', href: '/today?date=2026-11-25' },
			{ label: 'Session', href: '/session/abc123?from=%2Ftoday%3Fdate%3D2026-11-25' },
		]);
	});

	it('keeps the id and the from origin in each crumb of the trail', () => {
		expect(breadcrumbFor('/session/abc123/play', '/calendar/day/2026-01-05')).toEqual([
			{ label: 'Calendar', href: '/calendar' },
			{ label: 'Day', href: '/calendar/day/2026-01-05' },
			{ label: 'Session', href: '/session/abc123?from=%2Fcalendar%2Fday%2F2026-01-05' },
			{ label: 'Play', href: '/session/abc123/play?from=%2Fcalendar%2Fday%2F2026-01-05' },
		]);
	});

	it('keeps the date in the parent crumb for a calendar day', () => {
		expect(breadcrumbFor('/calendar/day/2026-01-05')).toEqual([
			{ label: 'Calendar', href: '/calendar' },
			{ label: 'Day', href: '/calendar/day/2026-01-05' },
		]);
	});

	it('reads the add form under its tab', () => {
		expect(breadcrumbFor('/today/add/2026-01-05')).toEqual([
			{ label: 'Today', href: '/today' },
			{ label: 'Add', href: '/today/add/2026-01-05' },
		]);
		expect(breadcrumbFor('/calendar/add/2026-01-05')).toEqual([
			{ label: 'Calendar', href: '/calendar' },
			{ label: 'Add', href: '/calendar/add/2026-01-05' },
		]);
	});

	it('reads an admin user detail as Settings > Admin > User without the raw id', () => {
		expect(breadcrumbFor('/settings/admin/users/u1')).toEqual([
			{ label: 'Settings', href: '/settings' },
			{ label: 'Admin', href: '/settings/admin' },
			{ label: 'User', href: '/settings/admin/users/u1' },
		]);
	});

	it('keeps the plain admin trail for the admin landing page', () => {
		expect(breadcrumbFor('/settings/admin')).toEqual([
			{ label: 'Settings', href: '/settings' },
			{ label: 'Admin', href: '/settings/admin' },
		]);
	});
});
