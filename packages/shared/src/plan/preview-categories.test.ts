import { describe, expect, it } from 'vitest';
import {
	MEDIUM_RUN_MINUTES,
	PREVIEW_CATEGORY_BLURB,
	PREVIEW_CATEGORY_LABEL,
	previewCategory,
} from './preview-categories';
import type { PreviewCategoryInput } from './preview-categories';

function session(over: Partial<PreviewCategoryInput> = {}): PreviewCategoryInput {
	return { modality: 'running', type: 'easy', durationMin: 30, ...over };
}

describe('previewCategory', () => {
	it('reads the long run by archetype, whatever its length', () => {
		expect(previewCategory(session({ type: 'long', durationMin: 150 }))).toBe('long-run');
		expect(previewCategory(session({ type: 'long', durationMin: 40 }))).toBe('long-run');
	});

	it('splits the remaining runs at the medium line: 60 minutes and past it reads Medium, 59 under it reads Short', () => {
		expect(previewCategory(session({ durationMin: MEDIUM_RUN_MINUTES }))).toBe('medium-run');
		expect(previewCategory(session({ durationMin: MEDIUM_RUN_MINUTES - 1 }))).toBe('short-run');
		expect(previewCategory(session({ durationMin: 75 }))).toBe('medium-run');
		expect(previewCategory(session({ durationMin: 25 }))).toBe('short-run');
	});

	it('reads a run with no duration as a Short run', () => {
		expect(previewCategory(session({ durationMin: null }))).toBe('short-run');
	});

	it('reads the quality kinds as Quality run, race day included', () => {
		for (const type of ['tempo', 'threshold', 'interval', 'race-pace', 'hills', 'fartlek', 'strides', 'race']) {
			expect(previewCategory(session({ type, durationMin: 45 })), type).toBe('quality-run');
		}
	});

	it('reads both strength archetypes as Strength, by modality', () => {
		expect(previewCategory(session({ modality: 'strength', type: 'machine-circuit' }))).toBe('strength');
		expect(previewCategory(session({ modality: 'strength', type: 'full-body-strength' }))).toBe('strength');
	});

	it('reads mobility sessions as Mobility, the drills session included', () => {
		expect(previewCategory(session({ modality: 'mobility', type: 'mobility' }))).toBe('mobility');
		expect(previewCategory(session({ modality: 'mobility', type: 'drills' }))).toBe('mobility');
	});

	it('reads walks and cross-training as Recovery', () => {
		expect(previewCategory(session({ modality: 'walking', type: 'walk' }))).toBe('recovery');
		expect(previewCategory(session({ modality: 'recovery', type: 'cross-train' }))).toBe('recovery');
		expect(previewCategory(session({ modality: 'cross-train', type: 'cross-train' }))).toBe('recovery');
	});

	it('reads a recovery jog as Recovery, even at running modality', () => {
		expect(previewCategory(session({ type: 'recovery', durationMin: 20 }))).toBe('recovery');
	});

	it('splits an unknown run kind by duration, so a new archetype never reads as a title', () => {
		expect(previewCategory(session({ type: 'steady', durationMin: 40 }))).toBe('short-run');
		expect(previewCategory(session({ type: 'progression', durationMin: 65 }))).toBe('medium-run');
	});
});

describe('preview category copy', () => {
	it('labels every category the mapper can return', () => {
		expect(Object.keys(PREVIEW_CATEGORY_LABEL).sort()).toEqual(
			['long-run', 'medium-run', 'quality-run', 'recovery', 'short-run', 'strength', 'mobility'].sort(),
		);
	});

	it('carries a one-line blurb per category, with no em dashes', () => {
		for (const blurb of Object.values(PREVIEW_CATEGORY_BLURB)) {
			expect(blurb).not.toMatch(/—/);
			expect(blurb).not.toContain('\n');
		}
	});
});
