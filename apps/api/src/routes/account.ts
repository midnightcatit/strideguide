import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';
import { deleteUserAccount } from '../lib/account';
import { secureCookies, sessionCookieName } from '../lib/session';
import type { AppBindings } from '../types';

const account = new Hono<AppBindings>();

/**
 * Delete the account and every row the user owns, then sign them out. Their
 * auth_sessions rows are gone and the session cookie is cleared, so every
 * device is signed out and a later sign-in starts a brand-new empty account.
 */
account.delete('/', async (c) => {
	const user = c.get('user')!;
	await deleteUserAccount(c.get('db'), user.id);
	deleteCookie(c, sessionCookieName(c.env), { path: '/', secure: secureCookies(c.env) });
	return c.json({ ok: true });
});

export default account;
