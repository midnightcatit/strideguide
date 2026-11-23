/**
 * Best-effort browser error reporting.
 *
 * Posts a small beacon to the public /api/client-errors route so a client that
 * fails in production (a dead request, a thrown handler) leaves a trace we can
 * read later. Never throws, never blocks, and never changes app behaviour.
 */
export function reportClientError(kind: string, message?: unknown, detail?: unknown): void {
	if (typeof window === 'undefined') return;
	try {
		const body = JSON.stringify({
			kind: kind.slice(0, 40),
			message: toStr(message, 500),
			detail: toStr(detail, 4000),
			url: location.href.slice(0, 500),
		});
		void fetch('/api/client-errors', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body,
			credentials: 'include',
			keepalive: true,
		}).catch(() => {});
	} catch {
		// reporting must never break the app
	}
}

function toStr(v: unknown, max: number): string | undefined {
	if (v == null) return undefined;
	const s =
		v instanceof Error ? `${v.name}: ${v.message}${v.stack ? `\n${v.stack}` : ''}` : String(v);
	const trimmed = s.slice(0, max);
	return trimmed || undefined;
}

/** Install once, at startup: surface uncaught errors and unhandled rejections. */
export function installClientErrorReporting(): void {
	if (typeof window === 'undefined') return;
	window.addEventListener('error', (e) => {
		reportClientError('window.error', e.message, e.error);
	});
	window.addEventListener('unhandledrejection', (e) => {
		const reason = (e as PromiseRejectionEvent).reason;
		reportClientError(
			'unhandledrejection',
			reason instanceof Error ? reason.message : String(reason),
			reason,
		);
	});
}
