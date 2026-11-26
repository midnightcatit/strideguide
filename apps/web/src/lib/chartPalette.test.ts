import { describe, expect, it } from 'vitest';
import { LOAD_RAMP, contrastRatio, loadRampStepColor, loadRampTextChoices } from './chartPalette';

// The resolved token values from app.css, per theme. The ramp is a colour-mix of
// --chart-2 into --paper, so the readable text flips with these.
const LIGHT = { load: '#2563eb', paper: '#fbfcfe', ink: '#14161b' };
const DARK = { load: '#93c5fd', paper: '#0f1218', ink: '#f3f5f9' };

describe('load-ramp text colour', () => {
	it('keeps ink on every step in the light theme', () => {
		expect(loadRampTextChoices(LIGHT.load, LIGHT.paper, LIGHT.ink)).toEqual([
			'ink',
			'ink',
			'ink',
			'ink',
			'ink',
		]);
	});

	it('flips only the strongest step to paper in the dark theme', () => {
		expect(loadRampTextChoices(DARK.load, DARK.paper, DARK.ink)).toEqual([
			'ink',
			'ink',
			'ink',
			'ink',
			'paper',
		]);
	});

	it('clears AA contrast on every step, in both themes', () => {
		for (const theme of [LIGHT, DARK]) {
			const choices = loadRampTextChoices(theme.load, theme.paper, theme.ink);
			LOAD_RAMP.forEach((_, step) => {
				const bg = loadRampStepColor(step, theme.load, theme.paper);
				const text = choices[step] === 'ink' ? theme.ink : theme.paper;
				expect(bg).not.toBeNull();
				expect(contrastRatio(bg as string, text)).toBeGreaterThanOrEqual(4.5);
			});
		}
	});

	it('falls back to ink when a token does not parse', () => {
		expect(loadRampTextChoices('var(--chart-2)', LIGHT.paper, LIGHT.ink)).toEqual([
			'ink',
			'ink',
			'ink',
			'ink',
			'ink',
		]);
	});
});
