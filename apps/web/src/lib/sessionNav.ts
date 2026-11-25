import { goto } from '$app/navigation';

/**
 * Return to the previous view. Falls back to a sensible parent when there is no
 * history to pop, which is the case for a deep link straight into a view.
 */
export function goBack(fallback = '/today'): void {
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
