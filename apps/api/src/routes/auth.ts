import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { schema } from '../db';
import {
	appOrigin,
	buildGoogleAuthUrl,
	exchangeCodeForTokens,
	upsertUser,
	verifyGoogleIdToken,
	isAccountBlocked,
	type GoogleIdentity,
} from '../lib/auth';
import { checkRateLimit, clientIp } from '../lib/rate-limit';
import {
	secureCookies,
	sessionCookieName,
	sessionCookieOptions,
	sessionTtlSeconds,
	sha256Hex,
	signOAuthState,
	signSession,
	stateCookieName,
	stateCookieOptions,
	oauthStateMatchesCookie,
	verifyOAuthState,
	verifySession,
} from '../lib/session';
import type { AppBindings } from '../types';

const auth = new Hono<AppBindings>();

/** Plain-language text for each callback failure, shown on the error page. */
const AUTH_ERROR_TEXT: Record<string, string> = {
	access_denied: 'You cancelled before finishing. Nothing changed.',
	invalid_oauth_state: 'That sign-in link is no longer valid. Start again to get a fresh one.',
	oauth_state_mismatch:
		'That sign-in link did not match this browser. Start again to get a fresh one.',
	token_exchange_failed: 'Google did not finish the sign-in. Try again in a moment.',
	invalid_id_token: 'We could not verify the reply from Google. Try again.',
	invalid_google_identity: 'Your Google account did not share a verified email address.',
	account_disabled: 'This account is disabled. Ask an admin to turn it back on.',
};

/** Where the error page sends the runner back so they can try once more. */
const RETRY_PATH = '/settings/account';

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** A self-contained page so a failed sign-in never ends on a bare JSON body. */
function authErrorPage(env: AppBindings['Bindings'], reason: string): string {
	const message = AUTH_ERROR_TEXT[reason] ?? 'Sign-in did not finish. Try again.';
	const retryUrl = `${env.WEB_ORIGIN}${RETRY_PATH}`;
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Sign-in did not finish</title>
	</head>
	<body style="margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f4f2;color:#1a1a1a;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
		<main style="width:100%;max-width:24rem;background:#ffffff;border:1px solid #e2e2df;border-radius:12px;padding:24px;">
			<h1 style="margin:0 0 12px;font-size:1.125rem;">Sign-in did not finish</h1>
			<p style="margin:0 0 20px;font-size:0.9375rem;line-height:1.5;">${escapeHtml(message)}</p>
			<a href="${escapeHtml(retryUrl)}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:0.9375rem;">Try signing in again</a>
		</main>
	</body>
</html>`;
}

/** Leave a trace of every callback failure, then answer with the error page. */
async function logAuthFailure(c: Context<AppBindings>, reason: string): Promise<void> {
	console.error('oauth_callback_failed', { reason, path: '/auth/google/callback' });
	try {
		await c.get('db').insert(schema.appErrors).values({
			id: crypto.randomUUID(),
			name: 'GoogleOAuthError',
			message: reason,
			path: '/auth/google/callback',
			method: 'GET',
			requestId: c.req.header('cf-ray') ?? null,
		});
	} catch {
		// Logging must never mask the sign-in failure the runner is seeing.
	}
}

async function authFailure(c: Context<AppBindings>, reason: string) {
	await logAuthFailure(c, reason);
	return c.html(authErrorPage(c.env, reason), 400);
}

auth.get('/google', async (c) => {
	// Cap how fast one IP can start sign-ins, so the redirect endpoint cannot be
	// used to hammer Google or to mint signed states in bulk.
	const rl = await checkRateLimit(c.env.DB, `auth-start:${clientIp(c.req.raw)}`, 30, 600);
	if (!rl.ok) {
		return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '600' });
	}

	const secure = secureCookies(c.env);
	const state = crypto.randomUUID();
	const nonce = crypto.randomUUID();
	// The signed state rides through Google in the state param so the callback can
	// check its integrity; the cookie holds the plain state and nonce and is what
	// ties the attempt to this browser. The callback requires both.
	const signedState = await signOAuthState(c.env, { state, nonce });
	setCookie(c, stateCookieName(c.env), `${state}.${nonce}`, stateCookieOptions(secure));
	return c.redirect(buildGoogleAuthUrl(c.env, appOrigin(c.env), signedState, nonce));
});

auth.get('/google/callback', async (c) => {
	const rl = await checkRateLimit(c.env.DB, `auth:${clientIp(c.req.raw)}`, 30, 600);
	if (!rl.ok) {
		return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '600' });
	}

	const url = new URL(c.req.url);
	const code = url.searchParams.get('code');
	const stateParam = url.searchParams.get('state');
	const cookieState = getCookie(c, stateCookieName(c.env)) ?? '';
	deleteCookie(c, stateCookieName(c.env), { path: '/', secure: secureCookies(c.env) });

	// Google sends this back when the runner cancels the consent screen.
	if (url.searchParams.get('error')) {
		return authFailure(c, 'access_denied');
	}

	// Verify the CSRF state. The signed value proves integrity, but the browser's
	// own cookie must also be present and agree: a signed state alone is
	// replayable, so an attacker could begin a flow and hand the victim its
	// callback URL, fixing the victim into the attacker's session. Requiring the
	// cookie is what binds the finishing sign-in to this browser.
	const signedState = stateParam ? await verifyOAuthState(c.env, stateParam) : null;
	if (!code || !signedState) {
		return authFailure(c, 'invalid_oauth_state');
	}

	if (!oauthStateMatchesCookie(signedState, cookieState)) {
		return authFailure(c, 'oauth_state_mismatch');
	}

	const expectedNonce = signedState.nonce;

	const tokens = await exchangeCodeForTokens(c.env, appOrigin(c.env), code);
	if (!tokens.id_token) {
		return authFailure(c, 'token_exchange_failed');
	}

	let identity: GoogleIdentity;
	try {
		identity = await verifyGoogleIdToken(c.env, tokens.id_token, expectedNonce);
	} catch {
		return authFailure(c, 'invalid_id_token');
	}

	if (!identity.email || !identity.sub || !identity.emailVerified) {
		return authFailure(c, 'invalid_google_identity');
	}

	const db = c.get('db');
	const user = await upsertUser(db, identity);
	// A disabled or soft-deleted account cannot start a new session. Refuse before
	// minting the token, so no session row or cookie is created for it.
	if (isAccountBlocked(user)) {
		return authFailure(c, 'account_disabled');
	}
	const token = await signSession(c.env, { uid: user.id, email: user.email, name: user.name });

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
	const rl = await checkRateLimit(c.env.DB, `auth-logout:${clientIp(c.req.raw)}`, 30, 60);
	if (!rl.ok) {
		return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '60' });
	}

	const token = getCookie(c, sessionCookieName(c.env));
	deleteCookie(c, sessionCookieName(c.env), { path: '/', secure: secureCookies(c.env) });
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
	// A light per-IP cap so an unauthenticated caller cannot hammer the session
	// read. It is generous enough that normal app polling never trips it.
	const rl = await checkRateLimit(c.env.DB, `auth-me:${clientIp(c.req.raw)}`, 120, 60);
	if (!rl.ok) {
		return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '60' });
	}

	const token = getCookie(c, sessionCookieName(c.env));
	if (!token) return c.json({ user: null });
	const payload = await verifySession(c.env, token);
	if (!payload) return c.json({ user: null });

	// Same revocation check as requireAuth, so a revoked session reads as signed out.
	const rows = await c
		.get('db')
		.select()
		.from(schema.authSessions)
		.where(eq(schema.authSessions.tokenHash, await sha256Hex(token)))
		.limit(1);
	const session = rows[0];
	if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
		return c.json({ user: null });
	}
	// A disabled or soft-deleted account reads as signed out here, so the app drops
	// to the sign-in screen instead of looping on a session the API keeps rejecting.
	const userRows = await c
		.get('db')
		.select({ disabledAt: schema.users.disabledAt, deletedAt: schema.users.deletedAt })
		.from(schema.users)
		.where(eq(schema.users.id, payload.uid))
		.limit(1);
	if (isAccountBlocked(userRows[0])) {
		return c.json({ user: null });
	}
	return c.json({ user: payload });
});

export default auth;
