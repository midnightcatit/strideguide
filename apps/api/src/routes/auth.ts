import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { schema } from '../db';
import {
	appOrigin,
	buildGoogleAuthUrl,
	exchangeCodeForTokens,
	upsertUser,
	verifyGoogleIdToken,
} from '../lib/auth';
import {
	SESSION_COOKIE,
	STATE_COOKIE,
	sha256Hex,
	sessionCookieOptions,
	signSession,
	stateCookieOptions,
	verifySession,
} from '../lib/session';
import type { AppBindings } from '../types';

const auth = new Hono<AppBindings>();

auth.get('/google', (c) => {
	const origin = appOrigin(c.env);
	const secure = origin.startsWith('https');
	const state = crypto.randomUUID();
	const nonce = crypto.randomUUID();
	setCookie(c, STATE_COOKIE, `${state}.${nonce}`, stateCookieOptions(secure));
	return c.redirect(buildGoogleAuthUrl(c.env, origin, state, nonce));
});

auth.get('/google/callback', async (c) => {
	const origin = appOrigin(c.env);
	const secure = origin.startsWith('https');
	const url = new URL(c.req.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const cookieState = getCookie(c, STATE_COOKIE);
	deleteCookie(c, STATE_COOKIE, { path: '/' });

	const [expectedState, expectedNonce] = (cookieState ?? '').split('.');
	if (!code || !state || !expectedState || state !== expectedState) {
		return c.json({ error: 'invalid_oauth_state' }, 400);
	}

	const tokens = await exchangeCodeForTokens(c.env, origin, code);
	if (!tokens.id_token) {
		return c.json({ error: tokens.error ?? 'token_exchange_failed' }, 400);
	}

	const identity = await verifyGoogleIdToken(c.env, tokens.id_token, expectedNonce);
	if (!identity.email || !identity.sub) {
		return c.json({ error: 'invalid_google_identity' }, 400);
	}

	const db = c.get('db');
	const user = await upsertUser(db, identity);
	const token = await signSession(c.env, { uid: user.id, email: user.email });

	await db.insert(schema.authSessions).values({
		id: crypto.randomUUID(),
		userId: user.id,
		tokenHash: await sha256Hex(token),
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
	});

	setCookie(c, SESSION_COOKIE, token, sessionCookieOptions(secure));
	return c.redirect(`${c.env.WEB_ORIGIN}/`);
});

auth.post('/logout', (c) => {
	deleteCookie(c, SESSION_COOKIE, { path: '/' });
	return c.json({ ok: true });
});

auth.get('/me', async (c) => {
	const token = getCookie(c, SESSION_COOKIE);
	if (!token) return c.json({ user: null });
	const payload = await verifySession(c.env, token);
	return c.json({ user: payload });
});

export default auth;
