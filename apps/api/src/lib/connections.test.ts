import { describe, expect, it } from 'vitest';
import type { Env } from '../env';
import { decryptToken, encryptToken, signState, tokenExpiry, verifyState } from './connections';

/** A 32-byte key, base64 encoded, the shape CONNECTIONS_KEY expects. */
const KEY = btoa('a'.repeat(32));
const OTHER_KEY = btoa('b'.repeat(32));

function env(key: string | undefined): Env {
	return (key === undefined ? {} : { CONNECTIONS_KEY: key }) as unknown as Env;
}

describe('token encryption', () => {
	it('round trips a token', async () => {
		const stored = await encryptToken(env(KEY), 'ya29.super-secret-token');
		expect(stored).not.toContain('super-secret-token');
		expect(await decryptToken(env(KEY), stored)).toBe('ya29.super-secret-token');
	});

	it('uses a fresh IV so the same token encrypts differently', async () => {
		const a = await encryptToken(env(KEY), 'same-value');
		const b = await encryptToken(env(KEY), 'same-value');
		expect(a).not.toBe(b);
		expect(await decryptToken(env(KEY), a)).toBe('same-value');
		expect(await decryptToken(env(KEY), b)).toBe('same-value');
	});

	it('fails to decrypt under a different key', async () => {
		const stored = await encryptToken(env(KEY), 'secret');
		await expect(decryptToken(env(OTHER_KEY), stored)).rejects.toThrow();
	});

	it('refuses to encrypt without a key', async () => {
		await expect(encryptToken(env(undefined), 'secret')).rejects.toThrow('CONNECTIONS_KEY');
	});
});

describe('oauth state', () => {
	it('round trips the signed state', async () => {
		const token = await signState(env(KEY), { uid: 'user-1', provider: 'strava', nonce: 'n-1' });
		const state = await verifyState(env(KEY), token);
		expect(state).toEqual({ uid: 'user-1', provider: 'strava', nonce: 'n-1' });
	});

	it('rejects a tampered state', async () => {
		const token = await signState(env(KEY), { uid: 'user-1', provider: 'strava', nonce: 'n-1' });
		const tampered = `${token.slice(0, -2)}xy`;
		expect(await verifyState(env(KEY), tampered)).toBeNull();
	});

	it('rejects a state signed with another key', async () => {
		const token = await signState(env(KEY), { uid: 'user-1', provider: 'strava', nonce: 'n-1' });
		expect(await verifyState(env(OTHER_KEY), token)).toBeNull();
	});
});

describe('token expiry', () => {
	it('reads a relative expires_in', () => {
		const at = tokenExpiry({ expires_in: 3600 });
		expect(at).not.toBeNull();
		const delta = at!.getTime() - Date.now();
		expect(delta).toBeGreaterThan(3_500_000);
		expect(delta).toBeLessThanOrEqual(3_600_000);
	});

	it('reads an absolute expires_at in unix seconds', () => {
		expect(tokenExpiry({ expires_at: 1_700_000_000 })!.getTime()).toBe(1_700_000_000_000);
	});

	it('returns null when neither is present', () => {
		expect(tokenExpiry({})).toBeNull();
	});
});
