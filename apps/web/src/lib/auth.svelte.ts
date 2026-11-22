import { api, type ApiUser } from './api';

/** Shared auth state so the shell and pages fetch /auth/me once. */
export const auth = $state<{ user: ApiUser | null; checked: boolean }>({
	user: null,
	checked: false,
});

export async function ensureAuth(): Promise<void> {
	if (auth.checked) return;
	try {
		auth.user = await api.me();
	} catch {
		auth.user = null;
	} finally {
		auth.checked = true;
	}
}
