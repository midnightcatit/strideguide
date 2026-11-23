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
	revokeToken,
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

/**
 * Health connector OAuth. Mounted at /connections so the callback URI is
 * <app origin>/connections/<provider>/callback. Routes stay thin; the endpoints,
 * scopes and token crypto live in src/lib.
 */
const connections = new Hono<AppBindings>();

function redirectUri(env: AppBindings['Bindings'], provider: string): string {
	return `${env.APP_ORIGIN}/connections/${provider}/callback`;
}

function settingsUrl(env: AppBindings['Bindings'], params: Record<string, string>): string {
	const qs = new URLSearchParams(params).toString();
	return `${env.WEB_ORIGIN}/settings/connections?${qs}`;
}

/** List the caller's connections and which providers the server can offer. */
connections.get('/', requireAuth, async (c) => {
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

	const user = c.get('user')!;
	const nonce = crypto.randomUUID();
	// The signed token lives in an httpOnly cookie; the plain nonce rides as the
	// provider's state param, so the callback can tie the two together.
	const stateToken = await signState(c.env, { uid: user.id, provider, nonce });
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
		return c.redirect(settingsUrl(c.env, { error: 'unknown_provider' }));
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
	const denied = url.searchParams.get('error');
	if (denied) return c.redirect(settingsUrl(c.env, { error: 'denied', provider }));
	if (!code || !stateParam || !state || state.nonce !== stateParam || state.provider !== provider) {
		return c.redirect(settingsUrl(c.env, { error: 'invalid_state', provider }));
	}

	const clientId = providerClientId(c.env, cfg);
	const clientSecret = providerClientSecret(c.env, cfg);
	if (!clientId || !clientSecret) {
		return c.redirect(settingsUrl(c.env, { error: 'not_configured', provider }));
	}

	const tokens = await exchangeCode(
		cfg,
		clientId,
		clientSecret,
		code,
		redirectUri(c.env, provider),
	);
	if (!tokens.access_token) {
		return c.redirect(settingsUrl(c.env, { error: 'exchange_failed', provider }));
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

	return c.redirect(settingsUrl(c.env, { connected: provider }));
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
