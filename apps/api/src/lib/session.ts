import { SignJWT, jwtVerify } from 'jose';
import type { Env } from '../env';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days (shortened, M0-SEC-04)
const STATE_TTL_SECONDS = 600;
const MIN_SECRET_BYTES = 32;

export const DEV_SESSION_COOKIE = 'sg_session';
export const DEV_STATE_COOKIE = 'sg_oauth_state';
export const PROD_SESSION_COOKIE = '__Host-sg_session';
export const PROD_STATE_COOKIE = '__Host-sg_oauth_state';

export interface SessionPayload {
	uid: string;
	email: string;
	/** The Google display name, if we have one. Used to prefill the app. */
	name?: string | null;
}

export function secureCookies(env: Env): boolean {
	return env.ENVIRONMENT === 'production';
}

export function sessionCookieName(env: Env): string {
	return secureCookies(env) ? PROD_SESSION_COOKIE : DEV_SESSION_COOKIE;
}

export function stateCookieName(env: Env): string {
	return secureCookies(env) ? PROD_STATE_COOKIE : DEV_STATE_COOKIE;
}

function enc(s: string): Uint8Array {
	return new TextEncoder().encode(s);
}

function sessionKey(env: Env): Uint8Array {
	const bytes = enc(env.SESSION_SECRET ?? '');
	if (bytes.length < MIN_SECRET_BYTES) {
		throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_BYTES} bytes`);
	}
	return bytes;
}

export async function signSession(env: Env, payload: SessionPayload): Promise<string> {
	return new SignJWT({ uid: payload.uid, email: payload.email, name: payload.name ?? null })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${SESSION_TTL_SECONDS}s`)
		.sign(sessionKey(env));
}

export async function verifySession(env: Env, token: string): Promise<SessionPayload | null> {
	try {
		const { payload } = await jwtVerify(token, sessionKey(env), { algorithms: ['HS256'] });
		if (typeof payload.uid === 'string' && typeof payload.email === 'string') {
			return {
				uid: payload.uid,
				email: payload.email,
				name: typeof payload.name === 'string' ? payload.name : null,
			};
		}
		return null;
	} catch {
		return null;
	}
}

export function sessionTtlSeconds(): number {
	return SESSION_TTL_SECONDS;
}

export interface OAuthState {
	/** Random value echoed through Google, bound to one sign-in attempt. */
	state: string;
	/** Random value echoed in the id_token and checked when we verify it. */
	nonce: string;
}

/**
 * Sign the OAuth CSRF state that rides through Google in the state param.
 *
 * The signature proves the state was ours and was not edited on the way back.
 * It is NOT enough on its own: a signed value is replayable by anyone, so the
 * callback also requires the state cookie and checks that the two agree. The
 * cookie is what binds the attempt to this one browser, which is what stops an
 * attacker from starting a flow and handing the victim its callback URL.
 */
export async function signOAuthState(env: Env, payload: OAuthState): Promise<string> {
	return new SignJWT({ s: payload.state, n: payload.nonce })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${STATE_TTL_SECONDS}s`)
		.sign(sessionKey(env));
}

export async function verifyOAuthState(env: Env, token: string): Promise<OAuthState | null> {
	try {
		const { payload } = await jwtVerify(token, sessionKey(env), { algorithms: ['HS256'] });
		if (typeof payload.s === 'string' && typeof payload.n === 'string') {
			return { state: payload.s, nonce: payload.n };
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Check the browser's state cookie against the verified, signed state.
 *
 * The callback must require the cookie: a valid signed state alone is the login
 * CSRF hole, because an attacker can mint one in their own browser and pass it
 * to the victim. The cookie value is `<state>.<nonce>`, set by the start route
 * and readable only by this origin, so requiring it and comparing constant-time
 * binds the finishing sign-in to the browser that began it.
 */
export function oauthStateMatchesCookie(signed: OAuthState, cookieValue: string): boolean {
	if (!cookieValue) return false;
	const [cookieState, cookieNonce] = cookieValue.split('.');
	if (!cookieState || !cookieNonce) return false;
	return (
		timingSafeEqualStr(cookieState, signed.state) &&
		timingSafeEqualStr(cookieNonce, signed.nonce)
	);
}

export function sessionCookieOptions(secure: boolean) {
	return {
		httpOnly: true,
		secure,
		sameSite: 'Lax' as const,
		path: '/',
		maxAge: SESSION_TTL_SECONDS,
	} as const;
}

export function stateCookieOptions(secure: boolean) {
	return {
		httpOnly: true,
		secure,
		sameSite: 'Lax' as const,
		path: '/',
		maxAge: STATE_TTL_SECONDS,
	} as const;
}

export async function sha256Hex(input: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', enc(input));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison (defense-in-depth for state/nonce). */
export function timingSafeEqualStr(a: string, b: string): boolean {
	const ab = enc(a);
	const bb = enc(b);
	if (ab.length !== bb.length) return false;
	let out = 0;
	for (let i = 0; i < ab.length; i++) {
		out |= ab[i]! ^ bb[i]!;
	}
	return out === 0;
}
