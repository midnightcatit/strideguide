import type { D1Database, Ai } from '@cloudflare/workers-types';

/**
 * Worker bindings + secrets. Secrets come from `.dev.vars` locally and
 * `wrangler secret put` in production (PLAN.md section 12.1).
 */
export interface Env {
	DB: D1Database;
	AI: Ai;

	// Vars
	ENVIRONMENT: string;
	APP_ORIGIN: string;
	WEB_ORIGIN: string;
	/**
	 * Comma-separated root admin email addresses, matched case-insensitively.
	 * Root admins are always admin and cannot be demoted or removed through the
	 * admin UI. Unset (or empty) means there are no root admins, so the admin
	 * surface fails closed if the var is missing.
	 */
	ADMIN_EMAILS?: string;

	// Secrets (never committed)
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	SESSION_SECRET: string;
	OPENROUTER_API_KEY: string;

	// Health connector secrets. All optional: when the client id and secret are
	// unset the provider shows as not configured and stays inert.
	GOOGLE_HEALTH_CLIENT_ID?: string;
	GOOGLE_HEALTH_CLIENT_SECRET?: string;
	/** Base64-encoded 32-byte key for AES-GCM token encryption. */
	CONNECTIONS_KEY?: string;
	/**
	 * The exact Authorization header value Google sends with Health API push
	 * notifications, set as the subscriber's endpoint secret. Unset by default, so
	 * the webhook stays inert until an operator registers a subscriber.
	 */
	GOOGLE_HEALTH_WEBHOOK_SECRET?: string;
}
