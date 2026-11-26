/**
 * The hold-to-confirm rule, kept pure so it can be tested without a component.
 * A permanent delete is irreversible, so the button must be held for the full
 * duration before it fires rather than clicked once.
 */

/** How long the destructive button must be held, in milliseconds. */
export const HOLD_MS = 5000;

/** How far a hold has run, from 0 to 1. Guards against a zero or silly total. */
export function holdProgress(elapsed: number, total: number = HOLD_MS): number {
	if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
	if (!Number.isFinite(total) || total <= 0) return 1;
	return Math.min(1, elapsed / total);
}

/** Whether a hold has lasted long enough to fire. */
export function holdComplete(elapsed: number, total: number = HOLD_MS): boolean {
	return holdProgress(elapsed, total) >= 1;
}

/** Whole seconds left in a hold, for the countdown a person sees. */
export function holdSecondsLeft(elapsed: number, total: number = HOLD_MS): number {
	return Math.max(0, Math.ceil((total - Math.max(0, elapsed)) / 1000));
}
