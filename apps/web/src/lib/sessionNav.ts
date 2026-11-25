import { goto } from '$app/navigation';

/**
 * Leave the current view. When the view was opened with an explicit `from`
 * route, go straight there so a deep link never steps out of the app on a
 * history entry that predates it. Otherwise pop the history, or fall back to a
 * sensible parent when there is nothing to pop (a deep link straight in).
 */
export function goBack(from: string | null = null, fallback = '/today'): void {
	if (from) {
		void goto(from);
		return;
	}
	if (typeof window !== 'undefined' && window.history.length > 1) history.back();
	else void goto(fallback);
}

/** The `from` query value, so a session view knows where to return. */
export function returnFrom(searchParams: URLSearchParams, fallback = '/today'): string {
	return searchParams.get('from') || fallback;
}

export function sessionHref(id: string, from: string): string {
	return `/session/${encodeURIComponent(id)}?from=${encodeURIComponent(from)}`;
}

export function playHref(id: string, from: string): string {
	return `/session/${encodeURIComponent(id)}/play?from=${encodeURIComponent(from)}`;
}

export function logHref(id: string, from: string): string {
	return `/session/${encodeURIComponent(id)}/log?from=${encodeURIComponent(from)}`;
}

export function notesHref(id: string, from: string): string {
	return `/session/${encodeURIComponent(id)}/notes?from=${encodeURIComponent(from)}`;
}

/** An imported activity's own page, so a card can drill into all its stats. */
export function activityHref(id: string, from: string): string {
	return `/activity/${encodeURIComponent(id)}?from=${encodeURIComponent(from)}`;
}
