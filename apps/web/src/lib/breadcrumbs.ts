/**
 * The breadcrumb trail for a pathname, used by the app header. A top-level page
 * (a tab, or the settings list) returns an empty trail, so the header shows the
 * Stride Guide mark. Any deeper page returns its parents and itself, each crumb
 * carrying the path it links to, so it works to any depth.
 *
 * A view segment that names a thing (a session, a calendar day, an add form)
 * takes one value after it, an id or a date. The value is part of that crumb's
 * own link, not a crumb of its own, so "session/abc/play" reads Session then
 * Play rather than showing the raw id.
 *
 * A session or an imported activity has no parent list of its own (there is no
 * /session or /activity index), so its trail is the view it was opened from,
 * passed as `from`, then the view and any step. That parent crumb is the way
 * back on one of these pages, which carries no Back control of its own.
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
	session: 'Session',
	activity: 'Activity',
	play: 'Play',
	log: 'Log',
	notes: 'Notes',
	day: 'Day',
	add: 'Add',
};

/** Top-level pages: the header shows the mark, not a trail. */
const PARENTS = new Set(['', 'today', 'calendar', 'progress', 'coach', 'settings']);

/**
 * View segments that are followed by a value (an id or a date). The value joins
 * the view's own link, so it never becomes a crumb.
 */
const VALUE_SEGMENTS = new Set(['session', 'day', 'add']);

function titleCase(s: string): string {
	return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The full trail for a path, each crumb carrying the path it links to. A
 * segment can carry a query or hash (the `from` view, for example
 * `/today?date=2026-11-25`); the label drops it while the link keeps it. */
function trailFor(pathname: string): Crumb[] {
	const parts = pathname.split('/').filter(Boolean);
	const crumbs: Crumb[] = [];
	let href = '';
	for (let i = 0; i < parts.length; i++) {
		const raw = parts[i]!;
		const part = raw.split(/[?#]/)[0]!;
		href += `/${raw}`;
		crumbs.push({ label: SEGMENT_LABELS[part] ?? titleCase(part), href });
		// Attach a following value to this crumb's link, without its own crumb.
		if (VALUE_SEGMENTS.has(part) && i + 1 < parts.length) {
			href += `/${parts[++i]!}`;
			crumbs[crumbs.length - 1]!.href = href;
		}
	}
	return crumbs;
}

export function breadcrumbFor(pathname: string, from?: string | null): Crumb[] {
	const parts = pathname.split('/').filter(Boolean);
	if (parts.length <= 1 && PARENTS.has(parts[0] ?? '')) return [];
	if (parts[0] === 'session' || parts[0] === 'activity') {
		// Neither has a parent path that exists, so lead with the view it was
		// opened from, which gives the header a crumb to tap back to.
		const view = parts[0];
		const crumbs = from ? trailFor(from) : [];
		crumbs.push({ label: SEGMENT_LABELS[view]!, href: `/${view}/${parts[1] ?? ''}` });
		for (const step of parts.slice(2)) {
			crumbs.push({
				label: SEGMENT_LABELS[step] ?? titleCase(step),
				href: `${crumbs[crumbs.length - 1]!.href}/${step}`,
			});
		}
		return crumbs;
	}
	return trailFor(pathname);
}
