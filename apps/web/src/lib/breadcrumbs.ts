/**
 * The breadcrumb trail for a pathname, used by the app header. A top-level page
 * (a tab, or the settings list) returns an empty trail, so the header shows the
 * Stride Guide mark. Any deeper page returns its parents and itself, each crumb
 * carrying the path it links to, so it works to any depth.
 */
export interface Crumb {
	label: string;
	href: string;
}

const SEGMENT_LABELS: Record<string, string> = {
	today: 'Today',
	calendar: 'Calendar',
	progress: 'Progress',
	coach: 'Coach',
	settings: 'Settings',
	health: 'Health',
	week: 'This week',
	streak: 'Streak',
	volume: 'Volume',
	connections: 'Connections',
	training: 'Training',
	favorites: 'Favorites',
	profile: 'You',
	appearance: 'Appearance',
	landing: 'Landing tab',
	account: 'Account',
	about: 'About',
};

/** Top-level pages: the header shows the mark, not a trail. */
const PARENTS = new Set(['', 'today', 'calendar', 'progress', 'coach', 'settings']);

function titleCase(s: string): string {
	return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function breadcrumbFor(pathname: string): Crumb[] {
	const parts = pathname.split('/').filter(Boolean);
	if (parts.length <= 1 && PARENTS.has(parts[0] ?? '')) return [];
	const crumbs: Crumb[] = [];
	let href = '';
	for (const part of parts) {
		href += `/${part}`;
		crumbs.push({ label: SEGMENT_LABELS[part] ?? titleCase(part), href });
	}
	return crumbs;
}
