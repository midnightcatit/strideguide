import { z } from 'zod';

/**
 * The bounded shape of a stored session prescription. The engine produces this
 * shape, and the preview rebuild lets the runner send an edited week one back, so
 * validating here keeps an unbounded or malformed payload from being stored
 * verbatim. Unknown keys are dropped and every string and array is bounded.
 */
const pacePair = z.tuple([z.number().min(0).max(100000), z.number().min(0).max(100000)]);
const rpePair = z.tuple([z.number().min(0).max(10), z.number().min(0).max(10)]);

const strengthSetSchema = z.object({
	exerciseId: z.string().max(60).optional(),
	machine: z.string().max(60).optional(),
	sets: z
		.array(
			z.object({
				reps: z.number().int().min(0).max(1000),
				weightKg: z.number().min(0).max(1000),
				rpe: z.number().min(0).max(10).optional(),
			}),
		)
		.max(100),
});

const workoutStepSchema = z.object({
	kind: z.enum(['warmup', 'work', 'recovery', 'rest', 'cooldown']),
	label: z.string().max(200),
	distanceM: z.number().min(0).max(100000).optional(),
	durationSec: z.number().min(0).max(100000).optional(),
	restSec: z.number().min(0).max(100000).optional(),
	targetPaceSecPerKm: pacePair.optional(),
	targetZone: z.string().max(40).optional(),
	targetRpe: rpePair.optional(),
	note: z.string().max(500).optional(),
	machine: z.string().max(60).optional(),
	sets: z.number().int().min(0).max(100).optional(),
	reps: z.number().int().min(0).max(1000).optional(),
});

const stepBlockSchema = z.object({
	repeat: z.number().int().min(0).max(200),
	label: z.string().max(200).optional(),
	steps: z.array(workoutStepSchema).max(200),
});

const workoutSchema = z.object({
	blocks: z.array(stepBlockSchema).max(100),
	totalDistanceKm: z.number().min(0).max(1000).optional(),
	estimatedDurationMin: z.number().min(0).max(10000).optional(),
});

/** A local "HH:MM" time, 24-hour, as the engine sets a session from the schedule. */
const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** The composed session reason, in parts, as the engine builds it in plan/why.ts. */
const sessionWhySchema = z.object({
	role: z.string().max(600).optional(),
	dayReason: z.string().max(600).optional(),
	planContext: z.string().max(600).optional(),
});

export const prescriptionSchema = z.object({
	summary: z.string().max(600).optional(),
	intensity: z.enum(['easy', 'steady', 'hard']).optional(),
	targetPaceSecPerKm: pacePair.optional(),
	targetZone: z.string().max(40).optional(),
	targetRpe: rpePair.optional(),
	targetDistanceKm: z.number().min(0).max(1000).optional(),
	timeStart: clockSchema.optional(),
	blocks: z.array(strengthSetSchema).max(100).optional(),
	notes: z.string().max(2000).optional(),
	why: z.string().max(2000).optional(),
	whyStructured: sessionWhySchema.optional(),
	workout: workoutSchema.optional(),
	libraryId: z.string().max(60).optional(),
	added: z.boolean().optional(),
	custom: z.boolean().optional(),
});
