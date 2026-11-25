import { expect, it } from 'vitest';
import { weekRowValues } from './plans';

it('keeps the phase on the week rows the plan route inserts', () => {
	// A plan week row carries its phase through the insert. Dropping it here left
	// GET /current returning a null phase and the web app guessing every week.
	const rows = [
		{
			id: 'w24',
			planId: 'p1',
			weekNumber: 24,
			phase: 'recovery',
			focus: 'Recovery',
			summaryText: 'Week 24: recovery.',
			startDate: '2026-11-16',
			endDate: '2026-11-22',
			targetVolumeKm: 32,
			sessionRows: [{ day: 0 }],
		},
	];
	const [values] = weekRowValues(rows);
	expect(values).toMatchObject({ weekNumber: 24, phase: 'recovery' });
	expect(values).not.toHaveProperty('sessionRows');
	expect(values).not.toHaveProperty('targetVolumeKm');
});
