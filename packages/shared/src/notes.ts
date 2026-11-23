/**
 * Session notes: the runner's own words, saved against one planned session and
 * kept so a later plan rebuild can read what they said. Free text, so it is
 * trimmed and capped rather than run through the model-text filter. Pure, so the
 * API and the web share one rule for what a stored note is.
 */

/** Longest note we store, in characters. Anything past this is dropped. */
export const SESSION_NOTES_MAX = 2000;

/**
 * Shape raw input into the stored note: a trimmed string, capped at
 * SESSION_NOTES_MAX characters. Anything that is not a string becomes empty, so
 * a clearing save is just an empty note.
 */
export function normalizeSessionNotes(input: unknown): string {
	if (typeof input !== 'string') return '';
	const trimmed = input.trim();
	return trimmed.length > SESSION_NOTES_MAX ? trimmed.slice(0, SESSION_NOTES_MAX) : trimmed;
}
