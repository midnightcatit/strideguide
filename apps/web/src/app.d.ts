// See https://svelte.dev/docs/kit/types#app
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** The signed-in user resolved on the server, or null when signed out. */
			user: { id: string; email: string; name?: string | null; avatarUrl?: string | null } | null;
			/**
			 * Whether the server reached a definitive answer. False when the
			 * session read could not run, so the client keeps its own check as
			 * the fallback.
			 */
			authResolved: boolean;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
