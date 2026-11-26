import { z } from 'zod';

/**
 * The strength-equipment preference and its item lists. Shared by the settings
 * PUT and the plan adapt rebuild so both accept exactly the same values, and an
 * arbitrary string or an unbounded array can never reach settings.prefs.
 */
export const equipmentPreferenceSchema = z.enum([
	'machines',
	'bodyweight',
	'bodyweight-dumbbells',
	'dumbbells',
	'barbell',
	'kettlebell',
	'bands',
	'both',
	'full-gym',
]);

export const equipmentItemsSchema = z.array(
	z.enum(['machines', 'dumbbells', 'barbell', 'kettlebell', 'bands']),
);

export const gymPresetSchema = z.string().max(40);

export const machineItemsSchema = z.array(z.string().max(60)).max(60);

/** A local time of day as "HH:MM", 24-hour. */
const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected a HH:MM time');

/**
 * One free window the runner blocked out: a weekday (0 = Monday) and a local
 * start and end time. The end must be after the start, and a day may hold at
 * most a handful of windows, so the stored list stays small and sane.
 */
export const scheduleBlockSchema = z
	.object({
		day: z.number().int().min(0).max(6),
		start: clockSchema,
		end: clockSchema,
	})
	.refine((b) => b.start < b.end, { message: 'The end time must be after the start time' });

/** The runner's blocked-out training windows. Optional; a runner may have none. */
export const scheduleSchema = z.array(scheduleBlockSchema).max(50);

/**
 * The equipment prefs a client may change through POST /plans/adapt. Every field
 * is optional, so a rebuild with no equipment change is still a valid body.
 */
export const equipmentPrefsPatchSchema = z.object({
	equipment: equipmentPreferenceSchema.optional(),
	equipmentItems: equipmentItemsSchema.optional(),
	gymPreset: gymPresetSchema.optional(),
	machineItems: machineItemsSchema.optional(),
});
