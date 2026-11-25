import type { LayoutServerLoad } from './$types';

/**
 * Resolve the signed-in user on the server so the shell can render the real
 * chrome on the first paint instead of a loading line. The session is a
 * signed, revocable cookie owned by the API Worker, so identity is read by
 * asking `/auth/me` with the request's own cookie; nothing is verified here.
 *
 * When no session cookie is present the answer is a fast "signed out" with no
 * round trip. When the read fails, `authResolved` stays false so the client
 * keeps its own `/auth/me` check as the fallback and never trusts a guess.
 */
export const load: LayoutServerLoad = async ({ request, url, fetch }) => {
	const cookie = request.headers.get('cookie') ?? '';
	const hasSession = /(?:^|;\s*)(?:__Host-sg_session|sg_session)=/.test(cookie);
	if (!hasSession) {
		return { user: null, authResolved: true };
	}

	try {
		const res = await fetch(`${url.origin}/auth/me`, { headers: { cookie } });
		if (!res.ok) {
			return { user: null, authResolved: false };
		}
		const data = (await res.json()) as {
			user: { uid: string; email: string; name?: string | null } | null;
		};
		return {
			user: data.user
				? { id: data.user.uid, email: data.user.email, name: data.user.name ?? null }
				: null,
			authResolved: true,
		};
	} catch {
		return { user: null, authResolved: false };
	}
};
