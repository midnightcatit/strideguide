import type { Env } from '../env';

/**
 * Connector provider registry. Everything the OAuth flow needs to know about a
 * provider lives here as data, so adding one is a new entry, not new branches.
 * The endpoints and scopes come from each provider's docs:
 *   Google Health: Google OAuth 2.0, https://developers.google.com/health/setup
 *   Strava:        https://developers.strava.com/docs/authentication
 */
export type ProviderId = 'google-health' | 'strava';

export interface ProviderConfig {
	id: ProviderId;
	/** Shown in the settings UI. */
	label: string;
	authorizeUrl: string;
	tokenUrl: string;
	/** Scopes in the provider's own form: space separated for Google, comma for Strava. */
	scopes: string;
	/** Where to read the linked account's id after the token exchange. */
	userIdUrl: string;
	/** The JSON field in that response that holds the id. */
	userIdField: string;
	/** Which env vars hold this provider's OAuth client. */
	clientIdEnv: keyof Env;
	clientSecretEnv: keyof Env;
	/** Used when the primary var is unset (Google Health reuses the sign-in client). */
	clientIdFallback?: keyof Env;
	clientSecretFallback?: keyof Env;
	/** Extra params on the authorize URL. */
	authorizeParams?: Record<string, string>;
	/** Where to revoke the grant on disconnect, when the provider supports it. */
	revokeUrl?: string;
	/** How the revoke endpoint takes the token. */
	revokeStyle?: 'query-token' | 'body-access-token';
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
	'google-health': {
		id: 'google-health',
		label: 'Google Health',
		authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
		tokenUrl: 'https://oauth2.googleapis.com/token',
		scopes:
			'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly https://www.googleapis.com/auth/googlehealth.profile.readonly',
		userIdUrl: 'https://health.googleapis.com/v4/users/me/identity',
		userIdField: 'healthUserId',
		clientIdEnv: 'GOOGLE_HEALTH_CLIENT_ID',
		clientSecretEnv: 'GOOGLE_HEALTH_CLIENT_SECRET',
		clientIdFallback: 'GOOGLE_CLIENT_ID',
		clientSecretFallback: 'GOOGLE_CLIENT_SECRET',
		// offline + consent are what make Google return a refresh token.
		authorizeParams: {
			access_type: 'offline',
			prompt: 'consent',
			include_granted_scopes: 'true',
		},
		revokeUrl: 'https://oauth2.googleapis.com/revoke',
		revokeStyle: 'query-token',
	},
	strava: {
		id: 'strava',
		label: 'Strava',
		authorizeUrl: 'https://www.strava.com/oauth/authorize',
		tokenUrl: 'https://www.strava.com/oauth/token',
		scopes: 'read,activity:read_all',
		userIdUrl: 'https://www.strava.com/api/v3/athlete',
		userIdField: 'id',
		clientIdEnv: 'STRAVA_CLIENT_ID',
		clientSecretEnv: 'STRAVA_CLIENT_SECRET',
		authorizeParams: { approval_prompt: 'auto' },
		revokeUrl: 'https://www.strava.com/oauth/deauthorize',
		revokeStyle: 'body-access-token',
	},
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function isProviderId(value: string): value is ProviderId {
	return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

function envValue(env: Env, key: keyof Env | undefined): string | undefined {
	if (!key) return undefined;
	const value = env[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function providerClientId(env: Env, cfg: ProviderConfig): string | undefined {
	return envValue(env, cfg.clientIdEnv) ?? envValue(env, cfg.clientIdFallback);
}

export function providerClientSecret(env: Env, cfg: ProviderConfig): string | undefined {
	return envValue(env, cfg.clientSecretEnv) ?? envValue(env, cfg.clientSecretFallback);
}

/** A provider is usable only when both halves of its OAuth client are set. */
export function isConfigured(env: Env, cfg: ProviderConfig): boolean {
	return Boolean(providerClientId(env, cfg) && providerClientSecret(env, cfg));
}

/** Which known providers are configured, keyed by provider id. */
export function configuredMap(env: Env): Record<ProviderId, boolean> {
	const out = {} as Record<ProviderId, boolean>;
	for (const id of PROVIDER_IDS) out[id] = isConfigured(env, PROVIDERS[id]);
	return out;
}
