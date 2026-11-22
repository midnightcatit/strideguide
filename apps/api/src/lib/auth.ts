import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { and, eq } from 'drizzle-orm';
import { schema } from '../db';
import type { Db } from '../db';
import type { Env } from '../env';

const GOOGLE_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/** App origin used to build the OAuth redirect_uri. Must match a Google-registered URI. */
export function appOrigin(env: Env): string {
	return env.APP_ORIGIN;
}

export function googleRedirectUri(origin: string): string {
	return `${origin}/auth/google/callback`;
}

export function buildGoogleAuthUrl(
	env: Env,
	origin: string,
	state: string,
	nonce: string,
): string {
	const params = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID,
		redirect_uri: googleRedirectUri(origin),
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'online',
		include_granted_scopes: 'true',
		prompt: 'select_account',
		state,
		nonce,
	});
	return `${GOOGLE_AUTHORIZE}?${params.toString()}`;
}

interface GoogleTokenResponse {
	id_token?: string;
	access_token?: string;
	error?: string;
	error_description?: string;
}

export async function exchangeCodeForTokens(
	env: Env,
	origin: string,
	code: string,
): Promise<GoogleTokenResponse> {
	const res = await fetch(GOOGLE_TOKEN, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			code,
			grant_type: 'authorization_code',
			redirect_uri: googleRedirectUri(origin),
		}),
	});
	return (await res.json()) as GoogleTokenResponse;
}

export interface GoogleIdentity {
	sub: string;
	email: string;
	name: string | null;
	picture: string | null;
	emailVerified: boolean;
}

export async function verifyGoogleIdToken(
	env: Env,
	idToken: string,
	expectedNonce?: string,
): Promise<GoogleIdentity> {
	const { payload } = await jwtVerify(idToken, googleJwks, {
		issuer: ['https://accounts.google.com', 'accounts.google.com'],
		audience: env.GOOGLE_CLIENT_ID,
	});
	if (expectedNonce && payload.nonce !== expectedNonce) {
		throw new Error('id_token nonce mismatch');
	}
	return identityFromClaims(payload);
}

function identityFromClaims(p: JWTPayload): GoogleIdentity {
	return {
		sub: String(p.sub ?? ''),
		email: String(p.email ?? ''),
		name: typeof p.name === 'string' ? p.name : null,
		picture: typeof p.picture === 'string' ? p.picture : null,
		emailVerified: p.email_verified === true,
	};
}

/** Upsert the user by Google subject (falling back to email) and return the row. */
export async function upsertUser(db: Db, identity: GoogleIdentity) {
	const existing = await db
		.select()
		.from(schema.users)
		.where(
			and(eq(schema.users.googleSub, identity.sub), eq(schema.users.email, identity.email)),
		)
		.limit(1);

	const found = existing[0];
	if (found) {
		return found;
	}

	const inserted = await db
		.insert(schema.users)
		.values({
			id: crypto.randomUUID(),
			email: identity.email,
			googleSub: identity.sub,
			name: identity.name,
			avatarUrl: identity.picture,
		})
		.returning();

	return inserted[0]!;
}
