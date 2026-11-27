import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EXERCISE_IMAGES, EXERCISE_IMAGES_MISSING } from './exercise-images';

/**
 * The exercise stills are checked in under apps/web/static/exercises and the
 * manifest is generated from the harvest, so a renamed or dropped file would
 * quietly render a broken image. Resolve the static dir from this file and
 * confirm every path exists, and that the keys are real slugs rather than
 * leftovers from a pruned candidate.
 */
const staticDir = join(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
	'..',
	'..',
	'apps',
	'web',
	'static',
);

describe('exercise images', () => {
	it('points every slug at a file that exists', () => {
		const missing: string[] = [];
		for (const [slug, image] of Object.entries(EXERCISE_IMAGES)) {
			if (!existsSync(join(staticDir, image.path.replace(/^\//, '')))) {
				missing.push(`${slug}: ${image.path}`);
			}
		}
		expect(missing).toEqual([]);
	});

	it('names each file /exercises/<group>/<slug>.webp with the slug as the filename', () => {
		for (const [slug, image] of Object.entries(EXERCISE_IMAGES)) {
			expect(image.path, slug).toBe(`/exercises/${image.group}/${slug}.webp`);
			expect(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug), slug).toBe(true);
		}
	});

	it('keeps the missing list out of the image map', () => {
		for (const slug of EXERCISE_IMAGES_MISSING) {
			expect(EXERCISE_IMAGES[slug], slug).toBeUndefined();
		}
	});
});
