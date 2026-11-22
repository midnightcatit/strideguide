import { SignJWT, jwtVerify } from 'jose';
import type { Env } from '../env';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const STATE_TTL_SECONDS = 600;

export const SESSION_COOKIE = 'sg_session';
export const STATE_COOKIE = 'sg_oauth_state';

export interface SessionPayload {
	uid: string;
	email: string;
}

function key(env: Env): Uint8Array {
	return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function signSession(env: Env, payload: SessionPayload): Promise<string> {
	return new SignJWT({ uid: payload.uid, email: payload.email })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${SESSION_TTL_SECONDS}s`)
		.sign(key(env));
}

export async function verifySession(env: Env, token: string): Promise<SessionPayload | null> {
	try {
		const { payload } = await jwtVerify(token, key(env));
		if (typeof payload.uid === 'string' && typeof payload.email === 'string') {
			return { uid: payload.uid, email: payload.email };
		}
		return null;
	} catch {
		return null;
	}
}

/** Secure cookies on https; plain cookies on localhost http. */
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
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
