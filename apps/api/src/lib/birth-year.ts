import { z } from 'zod';

/**
 * A birth year that gives a plausible age: no earlier than 1900, and no later
 * than ten years ago.
 *
 * The current year is read when a value is checked, never when this module
 * loads. Inside a Worker the module-load clock reads the epoch, so an upper
 * bound captured then would be 1960 and would reject every real birth year.
 */
export const birthYearSchema = z
	.number()
	.int()
	.min(1900)
	.refine((year) => year <= new Date().getUTCFullYear() - 10, {
		message: 'Pick a birth year at least ten years ago.',
	});
