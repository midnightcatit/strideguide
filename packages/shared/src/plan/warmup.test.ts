import { describe, expect, it } from 'vitest';
import { GOAL_PROFILES } from '../goal-profiles';
import { generatePlan } from './engine';
import { COOLDOWN_STRETCHES, EXTRA_STRETCHES, STRIDES } from './mobility';

const marathon = GOAL_PROFILES.find((p) => p.slug === 'marathon')!;

const plan = generatePlan({
	profile: marathon,
	baseline: { recentTimes: { '5k': '22:00' }, experience: 'intermediate' },
	availableDays: [0, 1, 2, 3, 4, 5, 6],
	startDate: '2026-12-01',
	targetDate: '2027-05-01',
});

const sessions = plan.weeks.flatMap((w) => w.sessions);
const quality = sessions.find((s) =>
	['tempo', 'interval', 'hills', 'race-pace'].includes(s.type),
)!;
const easy = sessions.find((s) => s.type === 'easy')!;
const strength = sessions.find((s) => s.modality === 'strength')!;

describe('run warm-up order', () => {
	it('runs RAMP: the raise, then the dynamic drills, then the strides', () => {
		const blocks = quality.prescription.workout!.blocks;
		const raiseAt = blocks.findIndex((b) => b.steps.some((s) => s.label === 'Warm-up jog'));
		const drillsAt = blocks.findIndex((b) => b.label === 'Dynamic warm-up');
		const stridesAt = blocks.findIndex((b) => b.label === 'Strides');
		expect(raiseAt).toBeGreaterThanOrEqual(0);
		expect(drillsAt).toBeGreaterThan(raiseAt);
		expect(stridesAt).toBeGreaterThan(drillsAt);
	});

	it('gives quality sessions a potentiation block and leaves easy runs without one', () => {
		expect(quality.prescription.workout!.blocks.some((b) => b.label === 'Strides')).toBe(true);
		expect(easy.prescription.workout!.blocks.some((b) => b.label === 'Strides')).toBe(false);
	});

	it('keeps static stretches out of the pre-run warm-up', () => {
		const staticNames = new Set([...COOLDOWN_STRETCHES, ...EXTRA_STRETCHES].map((d) => d.name));
		for (const session of [quality, easy]) {
			const warmBlocks = session.prescription.workout!.blocks.filter(
				(b) => b.label === 'Warm-up' || b.label === 'Dynamic warm-up',
			);
			expect(warmBlocks.length).toBeGreaterThan(0);
			for (const block of warmBlocks) {
				for (const step of block.steps) expect(staticNames.has(step.label)).toBe(false);
			}
		}
	});
});

describe('strength warm-up', () => {
	it('gives a real easy raise before the drills', () => {
		const warm = strength.prescription.workout!.blocks[0]!;
		expect(warm.label).toBe('Warm-up');
		const first = warm.steps[0]!;
		expect(first.label).toMatch(/jog|walk/i);
		expect(first.durationSec ?? 0).toBeGreaterThanOrEqual(120);
	});
});

describe('quality warm-up dose', () => {
	it('extends the dynamic drill dose toward 4 to 6 minutes', () => {
		const drills = quality.prescription.workout!.blocks.find(
			(b) => b.label === 'Dynamic warm-up',
		)!;
		const total = drills.steps.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);
		expect(total).toBeGreaterThanOrEqual(240);
		expect(total).toBeLessThanOrEqual(360);
	});
});

describe('hold policy', () => {
	it('keeps cool-down holds at the 40 second minimum', () => {
		expect(COOLDOWN_STRETCHES.length).toBeGreaterThan(0);
		for (const d of COOLDOWN_STRETCHES) {
			expect(d.durationSec).toBeGreaterThanOrEqual(40);
			expect(d.durationSec).toBeLessThanOrEqual(45);
		}
	});

	it('gives dedicated flexibility stretches a longer total time from short rounds', () => {
		expect(EXTRA_STRETCHES.length).toBeGreaterThan(0);
		const coolDownTotal =
			COOLDOWN_STRETCHES[0]!.durationSec * (COOLDOWN_STRETCHES[0]!.rounds ?? 1);
		for (const d of EXTRA_STRETCHES) {
			const total = d.durationSec * (d.rounds ?? 1);
			expect(total).toBeGreaterThanOrEqual(60);
			expect(total).toBeLessThanOrEqual(90);
			expect(d.durationSec).toBeLessThan(60);
			expect(total).toBeGreaterThan(coolDownTotal);
		}
	});

	it('uses a 15 to 20 second acceleration for each stride', () => {
		const stride = STRIDES.find((d) => d.name === 'Stride')!;
		expect(stride.durationSec).toBeGreaterThanOrEqual(15);
		expect(stride.durationSec).toBeLessThanOrEqual(20);
	});
});
