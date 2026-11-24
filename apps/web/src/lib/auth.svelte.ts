import { type ApiUser } from './api';

/** Shared auth state so the shell and pages fetch /auth/me once. */
export const auth = $state<{ user: ApiUser | null; checked: boolean }>({
	user: null,
	checked: false,
});

/** What /auth/me returns: the session payload, with the Google name Google gave us. */
interface MeUser {
	uid: string;
	email: string;
	name?: string | null;
}

/**
 * Read the signed-in user once. We call /auth/me directly rather than through
 * api.me() so the Google display name comes through, which the onboarding
 * prefill needs.
 */
export async function ensureAuth(): Promise<void> {
	if (auth.checked) return;
	try {
		const res = await fetch('/auth/me', { credentials: 'include' });
		const body = res.ok
			? ((await res.json()) as { user: MeUser | null })
			: { user: null as MeUser | null };
		auth.user = body.user
			? { id: body.user.uid, email: body.user.email, name: body.user.name ?? null }
			: null;
	} catch {
		auth.user = null;
	} finally {
		auth.checked = true;
	}
}
