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
