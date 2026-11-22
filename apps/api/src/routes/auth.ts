import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { schema } from '../db';
import {
	appOrigin,
	buildGoogleAuthUrl,
	exchangeCodeForTokens,
	upsertUser,
	verifyGoogleIdToken,
	type GoogleIdentity,
} from '../lib/auth';
import { checkRateLimit, clientIp } from '../lib/rate-limit';
import {
	secureCookies,
	sessionCookieName,
	sessionCookieOptions,
	sessionTtlSeconds,
	sha256Hex,
	signSession,
	stateCookieName,
	stateCookieOptions,
	verifySession,
} from '../lib/session';
import type { AppBindings } from '../types';

const auth = new Hono<AppBindings>();

auth.get('/google', (c) => {
	const secure = secureCookies(c.env);
	const state = crypto.randomUUID();
	const nonce = crypto.randomUUID();
	setCookie(c, stateCookieName(c.env), `${state}.${nonce}`, stateCookieOptions(secure));
	return c.redirect(buildGoogleAuthUrl(c.env, appOrigin(c.env), state, nonce));
});

auth.get('/google/callback', async (c) => {
	const rl = await checkRateLimit(c.env.DB, `auth:${clientIp(c.req.raw)}`, 30, 600);
	if (!rl.ok) {
		return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '600' });
	}

	const url = new URL(c.req.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const cookieState = getCookie(c, stateCookieName(c.env)) ?? '';
	deleteCookie(c, stateCookieName(c.env), { path: '/' });

	const [expectedState, expectedNonce] = cookieState.split('.');
	if (!code || !state || !expectedState || !expectedNonce || state !== expectedState) {
		return c.json({ error: 'invalid_oauth_state' }, 400);
	}

	const tokens = await exchangeCodeForTokens(c.env, appOrigin(c.env), code);
	if (!tokens.id_token) {
		console.error('oauth_token_exchange_failed');
		return c.json({ error: 'token_exchange_failed' }, 400);
	}

	let identity: GoogleIdentity;
	try {
		identity = await verifyGoogleIdToken(c.env, tokens.id_token, expectedNonce);
	} catch {
		return c.json({ error: 'invalid_id_token' }, 400);
	}

	if (!identity.email || !identity.sub || !identity.emailVerified) {
		return c.json({ error: 'invalid_google_identity' }, 400);
	}

	const db = c.get('db');
	const user = await upsertUser(db, identity);
	const token = await signSession(c.env, { uid: user.id, email: user.email });

	await db.insert(schema.authSessions).values({
		id: crypto.randomUUID(),
		userId: user.id,
		tokenHash: await sha256Hex(token),
		expiresAt: new Date(Date.now() + sessionTtlSeconds() * 1000),
	});

	setCookie(c, sessionCookieName(c.env), token, sessionCookieOptions(secureCookies(c.env)));
	return c.redirect(`${c.env.WEB_ORIGIN}/`);
});

/** Real logout: revoke the ledger row (server-side) and clear the cookie (M0-SEC-01/02). */
auth.post('/logout', async (c) => {
	const token = getCookie(c, sessionCookieName(c.env));
	deleteCookie(c, sessionCookieName(c.env), { path: '/' });
	if (token) {
		await c
			.get('db')
			.update(schema.authSessions)
			.set({ revokedAt: new Date() })
			.where(eq(schema.authSessions.tokenHash, await sha256Hex(token)));
	}
	return c.json({ ok: true });
});

auth.get('/me', async (c) => {
	const token = getCookie(c, sessionCookieName(c.env));
	if (!token) return c.json({ user: null });
	const payload = await verifySession(c.env, token);
	return c.json({ user: payload });
});

export default auth;
