import { SignJWT, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '../db';
import type { Env } from '../env';
import { secureCookies } from './session';
import { providerClientId, providerClientSecret, type ProviderConfig } from './providers';

/**
 * Health connector security and token plumbing.
 *
 * Tokens are encrypted at rest with AES-GCM under a base64 32-byte key from the
 * CONNECTIONS_KEY secret. The same key signs the short-lived OAuth state. Nothing
 * in this file logs a token value.
 */

const KEY_BYTES = 32;
const IV_BYTES = 12;
const STATE_TTL_SECONDS = 600;
/** Refresh a little before expiry so an in-flight call does not race the clock. */
const EXPIRY_SKEW_MS = 60_000;

export const DEV_CONNECT_STATE_COOKIE = 'sg_connect_state';
export const PROD_CONNECT_STATE_COOKIE = '__Host-sg_connect_state';

function b64encode(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

function b64decode(value: string): Uint8Array {
	const binary = atob(value);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
	return out;
}

function decodeKey(env: Env): Uint8Array {
	const raw = env.CONNECTIONS_KEY;
	if (!raw) throw new Error('CONNECTIONS_KEY is not set');
	let bytes: Uint8Array;
	try {
		bytes = b64decode(raw);
	} catch {
		throw new Error('CONNECTIONS_KEY is not valid base64');
	}
	if (bytes.length !== KEY_BYTES) {
		throw new Error(`CONNECTIONS_KEY must decode to ${KEY_BYTES} bytes`);
	}
	return bytes;
}

async function aesKey(env: Env): Promise<CryptoKey> {
	return crypto.subtle.importKey('raw', decodeKey(env), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Encrypt a token for storage. Output is `v1.<iv>.<ciphertext>`, all base64. */
export async function encryptToken(env: Env, plaintext: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
	const key = await aesKey(env);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(plaintext),
	);
	return `v1.${b64encode(iv)}.${b64encode(new Uint8Array(ciphertext))}`;
}

/** Decrypt a value written by encryptToken. */
export async function decryptToken(env: Env, stored: string): Promise<string> {
	const parts = stored.split('.');
	if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('unrecognized token format');
	const iv = b64decode(parts[1]!);
	const ciphertext = b64decode(parts[2]!);
	const key = await aesKey(env);
	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
	return new TextDecoder().decode(plaintext);
}

/** Sign a short-lived OAuth state: the user, the provider, and a random nonce. */
export async function signState(
	env: Env,
	payload: { uid: string; provider: string; nonce: string },
): Promise<string> {
	return new SignJWT({ uid: payload.uid, p: payload.provider, n: payload.nonce })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${STATE_TTL_SECONDS}s`)
		.sign(decodeKey(env));
}

export async function verifyState(
	env: Env,
	token: string,
): Promise<{ uid: string; provider: string; nonce: string } | null> {
	try {
		const { payload } = await jwtVerify(token, decodeKey(env), { algorithms: ['HS256'] });
		if (
			typeof payload.uid === 'string' &&
			typeof payload.p === 'string' &&
			typeof payload.n === 'string'
		) {
			return { uid: payload.uid, provider: payload.p, nonce: payload.n };
		}
		return null;
	} catch {
		return null;
	}
}

export function connectStateCookieName(env: Env): string {
	return secureCookies(env) ? PROD_CONNECT_STATE_COOKIE : DEV_CONNECT_STATE_COOKIE;
}

export function connectStateCookieOptions(secure: boolean) {
	return {
		httpOnly: true,
		secure,
		sameSite: 'Lax' as const,
		path: '/',
		maxAge: STATE_TTL_SECONDS,
	} as const;
}

export interface TokenResponse {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
	/** An absolute unix-seconds expiry, when the provider sends one. */
	expires_at?: number;
	scope?: string;
	token_type?: string;
	error?: string;
	error_description?: string;
}

/** Turn a provider token response into the columns we persist. */
export function tokenExpiry(response: TokenResponse): Date | null {
	if (typeof response.expires_at === 'number') return new Date(response.expires_at * 1000);
	if (typeof response.expires_in === 'number') return new Date(Date.now() + response.expires_in * 1000);
	return null;
}

/** Exchange an authorization code for tokens. */
export async function exchangeCode(
	cfg: ProviderConfig,
	clientId: string,
	clientSecret: string,
	code: string,
	redirectUri: string,
): Promise<TokenResponse> {
	const res = await fetch(cfg.tokenUrl, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			code,
			grant_type: 'authorization_code',
			redirect_uri: redirectUri,
		}),
	});
	return (await res.json()) as TokenResponse;
}

/** Read the linked account's id from the provider. */
export async function fetchProviderUserId(
	cfg: ProviderConfig,
	accessToken: string,
): Promise<string | null> {
	const res = await fetch(cfg.userIdUrl, { headers: { authorization: `Bearer ${accessToken}` } });
	if (!res.ok) return null;
	const body = (await res.json()) as Record<string, unknown>;
	const value = body[cfg.userIdField];
	return value === undefined || value === null ? null : String(value);
}

/** Revoke the grant at the provider, when it supports revocation. Best-effort. */
export async function revokeToken(
	cfg: ProviderConfig,
	accessToken: string,
): Promise<void> {
	if (!cfg.revokeUrl) return;
	try {
		if (cfg.revokeStyle === 'query-token') {
			await fetch(`${cfg.revokeUrl}?token=${encodeURIComponent(accessToken)}`, { method: 'POST' });
		} else {
			await fetch(cfg.revokeUrl, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ access_token: accessToken }),
			});
		}
	} catch {
		// Revoking is best-effort; the local row is deleted regardless.
	}
}

export type ConnectionRow = typeof schema.connections.$inferSelect;

function needsRefresh(connection: ConnectionRow): boolean {
	if (!connection.refreshTokenEnc) return false;
	if (!connection.tokenExpiresAt) return true;
	return connection.tokenExpiresAt.getTime() - Date.now() <= EXPIRY_SKEW_MS;
}

/**
 * Return a usable access token for a connection, refreshing it first when it is
 * expired (or close to). A refresh persists the new tokens and marks the row
 * connected; a failure marks it errored. Token values are never logged.
 */
export async function getAccessToken(
	env: Env,
	db: Db,
	cfg: ProviderConfig,
	connection: ConnectionRow,
): Promise<string> {
	if (!connection.accessTokenEnc) throw new Error('connection has no stored access token');

	if (!needsRefresh(connection)) {
		return decryptToken(env, connection.accessTokenEnc);
	}

	const clientId = providerClientId(env, cfg) ?? '';
	const clientSecret = providerClientSecret(env, cfg) ?? '';
	const refreshToken = await decryptToken(env, connection.refreshTokenEnc!);

	const res = await fetch(cfg.tokenUrl, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		}),
	});
	const tokens = (await res.json()) as TokenResponse;

	if (!res.ok || !tokens.access_token || tokens.error) {
		await db
			.update(schema.connections)
			.set({ status: 'error', updatedAt: new Date() })
			.where(eq(schema.connections.id, connection.id));
		throw new Error('token refresh failed');
	}

	const accessTokenEnc = await encryptToken(env, tokens.access_token);
	const refreshTokenEnc = tokens.refresh_token
		? await encryptToken(env, tokens.refresh_token)
		: connection.refreshTokenEnc;

	await db
		.update(schema.connections)
		.set({
			accessTokenEnc,
			refreshTokenEnc,
			tokenExpiresAt: tokenExpiry(tokens),
			scopes: tokens.scope ?? connection.scopes,
			status: 'connected',
			updatedAt: new Date(),
		})
		.where(eq(schema.connections.id, connection.id));

	return tokens.access_token;
}
