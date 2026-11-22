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

	// Secrets (never committed)
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	SESSION_SECRET: string;
	OPENROUTER_API_KEY: string;
}
