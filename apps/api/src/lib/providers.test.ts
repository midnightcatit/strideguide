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
	it('knows exactly the two shipped providers', () => {
		expect(PROVIDER_IDS).toEqual(['google-health', 'strava']);
		expect(isProviderId('strava')).toBe(true);
		expect(isProviderId('garmin')).toBe(false);
	});

	it('carries the real endpoints from each provider docs', () => {
		expect(PROVIDERS.strava.authorizeUrl).toBe('https://www.strava.com/oauth/authorize');
		expect(PROVIDERS.strava.tokenUrl).toBe('https://www.strava.com/oauth/token');
		expect(PROVIDERS['google-health'].authorizeUrl).toBe(
			'https://accounts.google.com/o/oauth2/v2/auth',
		);
		expect(PROVIDERS['google-health'].tokenUrl).toBe('https://oauth2.googleapis.com/token');
		expect(PROVIDERS['google-health'].userIdUrl).toBe(
			'https://health.googleapis.com/v4/users/me/identity',
		);
	});

	it('reports every provider as not configured when the env is empty', () => {
		const empty = env({});
		expect(isConfigured(empty, PROVIDERS.strava)).toBe(false);
		expect(isConfigured(empty, PROVIDERS['google-health'])).toBe(false);
		expect(configuredMap(empty)).toEqual({ 'google-health': false, strava: false });
	});

	it('configures Strava only with its own client id and secret', () => {
		expect(isConfigured(env({ STRAVA_CLIENT_ID: 'id' }), PROVIDERS.strava)).toBe(false);
		expect(isConfigured(env({ STRAVA_CLIENT_SECRET: 'secret' }), PROVIDERS.strava)).toBe(false);
		expect(
			isConfigured(env({ STRAVA_CLIENT_ID: 'id', STRAVA_CLIENT_SECRET: 'secret' }), PROVIDERS.strava),
		).toBe(true);
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
});
