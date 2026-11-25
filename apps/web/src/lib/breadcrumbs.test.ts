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

	it('keeps the id in the parent crumb for a deeper session view', () => {
		expect(breadcrumbFor('/session/abc123/play')).toEqual([
			{ label: 'Session', href: '/session/abc123' },
			{ label: 'Play', href: '/session/abc123/play' },
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
});
