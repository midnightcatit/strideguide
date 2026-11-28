import { expect, it } from 'vitest';
import { goalSlugSchema, availableDaysSchema, targetDateSchema } from './goal-schema';
import { equipmentPrefsPatchSchema } from './prefs-schema';
import { prescriptionSchema } from './prescription-schema';

it('rejects an unknown goal profile slug but accepts a real one', () => {
	expect(goalSlugSchema.safeParse('marathon').success).toBe(true);
	expect(goalSlugSchema.safeParse('ultra-100-mile').success).toBe(false);
});

it('rejects a target date that is not YYYY-MM-DD', () => {
	expect(targetDateSchema.safeParse('2026-04-19').success).toBe(true);
	expect(targetDateSchema.safeParse('19/04/2026').success).toBe(false);
	expect(targetDateSchema.safeParse('2026-04-19T00:00:00Z').success).toBe(false);
});

it('rejects out-of-range or too many available days', () => {
	expect(availableDaysSchema.safeParse([0, 2, 4]).success).toBe(true);
	expect(availableDaysSchema.safeParse([7]).success).toBe(false);
	expect(availableDaysSchema.safeParse([0, 1, 2, 3, 4, 5, 6, 0]).success).toBe(false);
});

it('rejects an unknown equipment value and an oversized machine list', () => {
	expect(equipmentPrefsPatchSchema.safeParse({ equipment: 'barbell' }).success).toBe(true);
	expect(equipmentPrefsPatchSchema.safeParse({ equipment: 'spaceship' }).success).toBe(false);
	expect(
		equipmentPrefsPatchSchema.safeParse({ machineItems: Array(61).fill('leg press') }).success,
	).toBe(false);
});

it('drops unknown prescription keys and rejects an oversized string', () => {
	const parsed = prescriptionSchema.parse({ summary: 'Easy run.', evil: 'payload' });
	expect('evil' in parsed).toBe(false);
	expect(prescriptionSchema.safeParse({ summary: 'x'.repeat(601) }).success).toBe(false);
});

it('keeps the strength lean pill through validation', () => {
	const parsed = prescriptionSchema.parse({ summary: 'Machine circuit.', focus: 'quads + glutes + hamstrings' });
	expect(parsed.focus).toBe('quads + glutes + hamstrings');
	expect(prescriptionSchema.safeParse({ focus: 'x'.repeat(121) }).success).toBe(false);
});
