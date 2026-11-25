import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { and, eq } from 'drizzle-orm';
import { schema } from '../db';
import type { AppBindings } from '../types';
import { requireAuth } from '../middleware/auth';
import { secureCookies } from '../lib/session';
import {
	connectStateCookieName,
	connectStateCookieOptions,
	decryptToken,
	encryptToken,
	exchangeCode,
	fetchProviderUserId,
	isConnectionsKeyConfigured,
	revokeToken,
	safeReturnPath,
	signState,
	tokenExpiry,
	verifyState,
} from '../lib/connections';
import {
	PROVIDER_IDS,
	PROVIDERS,
	configuredMap,
	isProviderId,
	providerClientId,
	providerClientSecret,
} from '../lib/providers';
import { manualSyncConnection } from '../lib/sync';

/**
 * Health connector OAuth. Mounted at /connections so the callback URI is
 * <app origin>/connections/<provider>/callback. Routes stay thin; the endpoints,
 * scopes and token crypto live in src/lib.
 */
const connections = new Hono<AppBindings>();

function redirectUri(env: AppBindings['Bindings'], provider: string): string {
	return `${env.APP_ORIGIN}/connections/${provider}/callback`;
}

/** Build an absolute web URL for a local path, adding the callback outcome params. */
function returnUrl(
	env: AppBindings['Bindings'],
	path: string,
	params: Record<string, string>,
): string {
	const url = new URL(path, env.WEB_ORIGIN);
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
	return url.toString();
}

/**
 * List the caller's connections and which providers the server can offer.
 *
 * Served at /connections/list rather than /connections. The Worker route for
 * this API is run.midnightcatit.com/connections/*, and a trailing wildcard does
 * not match the bare path, so /connections and /connections/ fall through to the
 * web app and 404. A path with a segment matches and reaches the API.
 */
connections.get('/list', requireAuth, async (c) => {
	const user = c.get('user')!;
	const rows = await c
		.get('db')
		.select()
		.from(schema.connections)
		.where(eq(schema.connections.userId, user.id));
	const configured = configuredMap(c.env);

	const byProvider = new Map(rows.map((r) => [r.provider, r]));
	const providers = PROVIDER_IDS.map((id) => {
		const row = byProvider.get(id);
		return {
			id,
			label: PROVIDERS[id].label,
			configured: configured[id],
			connected: Boolean(row),
			status: row?.status ?? null,
			lastSyncedAt: row?.lastSyncedAt ?? null,
			scopes: row?.scopes ?? null,
		};
	});
	return c.json({ providers });
});

/** Begin the OAuth dance: set a signed state, then hand off to the provider. */
connections.get('/:provider/start', requireAuth, async (c) => {
	const provider = c.req.param('provider');
	if (!isProviderId(provider)) return c.json({ error: 'unknown_provider' }, 400);

	const cfg = PROVIDERS[provider];
	const clientId = providerClientId(c.env, cfg);
	if (!clientId || !providerClientSecret(c.env, cfg)) {
		return c.json(
			{ error: 'not_configured', message: `${cfg.label} is not set up on this server.` },
			400,
		);
	}
	// The state token is signed with a key derived from CONNECTIONS_KEY. Check it
	// up front so a missing or malformed key is a handled error, not a 500.
	if (!isConnectionsKeyConfigured(c.env)) {
		return c.json(
			{ error: 'not_configured', message: `${cfg.label} is not set up on this server.` },
			400,
		);
	}

	const user = c.get('user')!;
	const nonce = crypto.randomUUID();
	// Where to send the runner back to when the dance finishes. Validated here,
	// then carried inside the signed state so the callback cannot be pointed elsewhere.
	const returnPath = safeReturnPath(c.req.query('return'));
	// The signed token lives in an httpOnly cookie; the plain nonce rides as the
	// provider's state param, so the callback can tie the two together.
	const stateToken = await signState(c.env, { uid: user.id, provider, nonce, returnPath });
	setCookie(
		c,
		connectStateCookieName(c.env),
		stateToken,
		connectStateCookieOptions(secureCookies(c.env)),
	);

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri(c.env, provider),
		response_type: 'code',
		scope: cfg.scopes,
		state: nonce,
		...cfg.authorizeParams,
	});
	return c.redirect(`${cfg.authorizeUrl}?${params.toString()}`);
});

/** Finish the dance: validate state, store encrypted tokens, send the user back. */
connections.get('/:provider/callback', async (c) => {
	const provider = c.req.param('provider');
	if (!isProviderId(provider)) {
		return c.redirect(returnUrl(c.env, safeReturnPath(undefined), { error: 'unknown_provider' }));
	}

	const cfg = PROVIDERS[provider];
	const url = new URL(c.req.url);
	const code = url.searchParams.get('code');
	const stateParam = url.searchParams.get('state');
	const cookieState = getCookie(c, connectStateCookieName(c.env)) ?? '';
	deleteCookie(c, connectStateCookieName(c.env), {
		path: '/',
		secure: secureCookies(c.env),
	});

	const state = cookieState ? await verifyState(c.env, cookieState) : null;
	// Validate again even though the start handler checked, so a bad path can never
	// ride through and strand the runner on another site.
	const returnPath = safeReturnPath(state?.returnPath);
	const denied = url.searchParams.get('error');
	if (denied) return c.redirect(returnUrl(c.env, returnPath, { error: 'denied', provider }));
	if (!code || !stateParam || !state || state.nonce !== stateParam || state.provider !== provider) {
		return c.redirect(returnUrl(c.env, returnPath, { error: 'invalid_state', provider }));
	}

	const clientId = providerClientId(c.env, cfg);
	const clientSecret = providerClientSecret(c.env, cfg);
	if (!clientId || !clientSecret) {
		return c.redirect(returnUrl(c.env, returnPath, { error: 'not_configured', provider }));
	}

	const tokens = await exchangeCode(
		cfg,
		clientId,
		clientSecret,
		code,
		redirectUri(c.env, provider),
	);
	if (!tokens.access_token) {
		return c.redirect(returnUrl(c.env, returnPath, { error: 'exchange_failed', provider }));
	}

	const providerUserId = await fetchProviderUserId(cfg, tokens.access_token).catch(() => null);
	const accessTokenEnc = await encryptToken(c.env, tokens.access_token);
	const refreshTokenEnc = tokens.refresh_token
		? await encryptToken(c.env, tokens.refresh_token)
		: null;

	await c
		.get('db')
		.insert(schema.connections)
		.values({
			id: crypto.randomUUID(),
			userId: state.uid,
			provider,
			providerUserId,
			accessTokenEnc,
			refreshTokenEnc,
			scopes: tokens.scope ?? cfg.scopes,
			tokenExpiresAt: tokenExpiry(tokens),
			status: 'connected',
		})
		.onConflictDoUpdate({
			target: [schema.connections.userId, schema.connections.provider],
			set: {
				providerUserId,
				accessTokenEnc,
				refreshTokenEnc,
				scopes: tokens.scope ?? cfg.scopes,
				tokenExpiresAt: tokenExpiry(tokens),
				status: 'connected',
				updatedAt: new Date(),
			},
		});

	// Pull the first batch right away so the numbers are there when the runner
	// lands back in the app. Best effort, and off the redirect path: a slow or
	// failed first sync must never hold up the connect.
	const db = c.get('db');
	const row = (
		await db
			.select()
			.from(schema.connections)
			.where(
				and(
					eq(schema.connections.userId, state.uid),
					eq(schema.connections.provider, provider),
				),
			)
			.limit(1)
	)[0];
	if (row) {
		try {
			c.executionCtx.waitUntil(manualSyncConnection(c.env, db, row).catch(() => {}));
		} catch {
			// No execution context (for example in a test); the on-view sync will pull it.
		}
	}

	return c.redirect(returnUrl(c.env, returnPath, { connected: provider }));
});

/**
 * Run a manual sync for one connection. Reuses the last result when a sync
 * succeeded within the last twenty minutes, so a double tap does not call the
 * provider again. Returns { synced, cached, lastSyncedAt }.
 */
connections.post('/:provider/sync', requireAuth, async (c) => {
	const provider = c.req.param('provider');
	if (!isProviderId(provider)) return c.json({ error: 'unknown_provider' }, 400);

	const user = c.get('user')!;
	const db = c.get('db');
	const rows = await db
		.select()
		.from(schema.connections)
		.where(and(eq(schema.connections.userId, user.id), eq(schema.connections.provider, provider)))
		.limit(1);

	const row = rows[0];
	if (!row) {
		return c.json({ error: 'not_connected', message: 'Connect this app before syncing.' }, 404);
	}

	const result = await manualSyncConnection(c.env, db, row);
	return c.json(result);
});

/** Revoke at the provider where supported, then drop the local row. */
connections.post('/:provider/disconnect', requireAuth, async (c) => {
	const provider = c.req.param('provider');
	if (!isProviderId(provider)) return c.json({ error: 'unknown_provider' }, 400);

	const user = c.get('user')!;
	const db = c.get('db');
	const rows = await db
		.select()
		.from(schema.connections)
		.where(and(eq(schema.connections.userId, user.id), eq(schema.connections.provider, provider)))
		.limit(1);

	const row = rows[0];
	if (row?.accessTokenEnc) {
		try {
			const accessToken = await decryptToken(c.env, row.accessTokenEnc);
			await revokeToken(PROVIDERS[provider], accessToken);
		} catch {
			// Token could not be read or revoked; still remove the local row.
		}
	}

	await db
		.delete(schema.connections)
		.where(and(eq(schema.connections.userId, user.id), eq(schema.connections.provider, provider)));

	return c.json({ ok: true });
});

export default connections;
