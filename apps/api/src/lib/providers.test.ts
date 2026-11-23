import { describe, expect, it } from 'vitest';
import type { Env } from '../env';
import {
	PROVIDER_IDS,
	PROVIDERS,
	configuredMap,
	isConfigured,
	isProviderId,
	providerClientId,
} from './providers';

function env(vars: Record<string, string>): Env {
	return vars as unknown as Env;
}

describe('provider registry', () => {
	it('knows exactly the shipped provider', () => {
		expect(PROVIDER_IDS).toEqual(['google-health']);
		expect(isProviderId('google-health')).toBe(true);
		expect(isProviderId('strava')).toBe(false);
	});

	it('carries the real endpoints from the provider docs', () => {
		expect(PROVIDERS['google-health'].authorizeUrl).toBe(
			'https://accounts.google.com/o/oauth2/v2/auth',
		);
		expect(PROVIDERS['google-health'].tokenUrl).toBe('https://oauth2.googleapis.com/token');
		expect(PROVIDERS['google-health'].userIdUrl).toBe(
			'https://health.googleapis.com/v4/users/me/identity',
		);
	});

	it('reports the provider as not configured when the env is empty', () => {
		const empty = env({});
		expect(isConfigured(empty, PROVIDERS['google-health'])).toBe(false);
		expect(configuredMap(empty)).toEqual({ 'google-health': false });
	});

	it('lets Google Health fall back to the sign-in client', () => {
		const viaFallback = env({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' });
		expect(providerClientId(viaFallback, PROVIDERS['google-health'])).toBe('id');
		expect(isConfigured(viaFallback, PROVIDERS['google-health'])).toBe(true);
	});

	it('prefers Google Health own client when both are set', () => {
		const both = env({
			GOOGLE_CLIENT_ID: 'signin',
			GOOGLE_CLIENT_SECRET: 'signin-secret',
			GOOGLE_HEALTH_CLIENT_ID: 'health',
			GOOGLE_HEALTH_CLIENT_SECRET: 'health-secret',
		});
		expect(providerClientId(both, PROVIDERS['google-health'])).toBe('health');
	});

	it('needs both halves of the client to be configured', () => {
		expect(isConfigured(env({ GOOGLE_HEALTH_CLIENT_ID: 'id' }), PROVIDERS['google-health'])).toBe(
			false,
		);
		expect(
			isConfigured(
				env({ GOOGLE_HEALTH_CLIENT_ID: 'id', GOOGLE_HEALTH_CLIENT_SECRET: 'secret' }),
				PROVIDERS['google-health'],
			),
		).toBe(true);
	});
});
