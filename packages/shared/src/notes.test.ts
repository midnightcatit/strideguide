import { describe, expect, it } from 'vitest';
import { SESSION_NOTES_MAX, normalizeSessionNotes } from './notes';

describe('normalizeSessionNotes', () => {
	it('trims surrounding whitespace', () => {
		expect(normalizeSessionNotes('  felt strong today\n')).toBe('felt strong today');
	});

	it('caps a long note at the maximum length', () => {
		const long = 'x'.repeat(SESSION_NOTES_MAX + 500);
		expect(normalizeSessionNotes(long)).toHaveLength(SESSION_NOTES_MAX);
	});

	it('treats a non-string as an empty note', () => {
		expect(normalizeSessionNotes(null)).toBe('');
		expect(normalizeSessionNotes({ text: 'hi' })).toBe('');
	});

	it('keeps a note that is exactly the maximum length', () => {
		const exact = 'y'.repeat(SESSION_NOTES_MAX);
		expect(normalizeSessionNotes(exact)).toHaveLength(SESSION_NOTES_MAX);
	});
});
