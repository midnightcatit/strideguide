import { api, type ApiUser } from './api';
import { cacheUser, cachedUser, clearUser } from './offline';

/**
 * Shared auth state so the shell and pages fetch /auth/me once.
 *
 * `checked` turns true only once the server has actually answered: a real
 * answer of "no user" clears the user, while a network or server failure leaves
 * `checked` false, keeps the last known user, and sets `error` so the shell can
 * offer a retry instead of the sign-in wall.
 */
export const auth = $state<{ user: ApiUser | null; checked: boolean; error: string | null }>({
	user: cachedUser(),
	checked: false,
	error: null,
});

let inflight: Promise<void> | null = null;

/** Read the signed-in user once, including the Google display name api.me() returns. */
export function ensureAuth(): Promise<void> {
	if (auth.checked) return Promise.resolve();
	if (inflight) return inflight;
	inflight = run().finally(() => {
		inflight = null;
	});
	return inflight;
}

async function run(): Promise<void> {
	try {
		const user = await api.me();
		auth.user = user;
		auth.checked = true;
		auth.error = null;
		if (user) cacheUser(user);
		else clearUser();
	} catch {
		// Offline or a server error: keep the last known user so the app still
		// opens, and leave checked false so a retry can run.
		auth.error = 'Could not check your sign-in.';
	}
}

/** Forget the user in memory and on disk, for a sign-out. */
export function forgetUser(): void {
	auth.user = null;
	auth.checked = true;
	auth.error = null;
	clearUser();
}
