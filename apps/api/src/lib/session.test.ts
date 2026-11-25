import { describe, expect, it } from 'vitest';
import type { Env } from '../env';
import { oauthStateMatchesCookie, signOAuthState, verifyOAuthState } from './session';

function env(secret: string): Env {
	return { SESSION_SECRET: secret } as unknown as Env;
}

const secret = 'a'.repeat(32);

describe('signOAuthState / verifyOAuthState', () => {
	it('accepts an untampered signed state and returns its nonce', async () => {
		const token = await signOAuthState(env(secret), { state: 'state-1', nonce: 'nonce-1' });
		expect(await verifyOAuthState(env(secret), token)).toEqual({
			state: 'state-1',
			nonce: 'nonce-1',
		});
	});

	it('rejects a tampered signature', async () => {
		const token = await signOAuthState(env(secret), { state: 'state-1', nonce: 'nonce-1' });
		const [header, payload, signature] = token.split('.') as [string, string, string];
		const flipped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
		expect(await verifyOAuthState(env(secret), `${header}.${payload}.${flipped}`)).toBeNull();
	});

	it('rejects a state signed with a different secret', async () => {
		const token = await signOAuthState(env('b'.repeat(32)), {
			state: 'state-1',
			nonce: 'nonce-1',
		});
		expect(await verifyOAuthState(env(secret), token)).toBeNull();
	});
});

describe('oauthStateMatchesCookie', () => {
	const signed = { state: 'state-1', nonce: 'nonce-1' };

	it('accepts a cookie that matches the signed state and nonce', () => {
		expect(oauthStateMatchesCookie(signed, 'state-1.nonce-1')).toBe(true);
	});

	it('rejects a missing cookie, so a bare signed state cannot be replayed', () => {
		expect(oauthStateMatchesCookie(signed, '')).toBe(false);
	});

	it('rejects a cookie that does not match the signed state', () => {
		expect(oauthStateMatchesCookie(signed, 'state-2.nonce-1')).toBe(false);
	});

	it('rejects a cookie that does not match the signed nonce', () => {
		expect(oauthStateMatchesCookie(signed, 'state-1.nonce-2')).toBe(false);
	});

	it('rejects a malformed cookie', () => {
		expect(oauthStateMatchesCookie(signed, 'state-1')).toBe(false);
		expect(oauthStateMatchesCookie(signed, 'state-1.')).toBe(false);
		expect(oauthStateMatchesCookie(signed, '.nonce-1')).toBe(false);
	});
});
