import { z } from 'zod';
import { GOAL_PROFILES } from '@strideguide/shared';

/**
 * A goal profile slug that names a profile the engine can actually build. Bounded
 * and checked against the catalogue, so an unknown slug is rejected before it is
 * stored or passed to the plan engine.
 */
export const goalSlugSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.refine((slug) => GOAL_PROFILES.some((p) => p.slug === slug), {
		message: 'Unknown goal profile.',
	});

/** A calendar date in YYYY-MM-DD form. */
export const targetDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

/** Days of the week a plan may use, 0 = Monday to 6 = Sunday. */
export const availableDaysSchema = z.array(z.number().int().min(0).max(6)).max(7);
