import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MOVE_MEDIA } from './move-media';

/**
 * The demo frames are checked in as flat static assets under
 * apps/web/static/moves, but nothing at build time notices a path that points
 * at a file we forgot to download, so the UI would quietly render a broken
 * image. Resolve the static dir from this file and confirm every frame exists.
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

describe('move media', () => {
	it('points every frame at a file that exists', () => {
		const missing: string[] = [];
		for (const [name, media] of Object.entries(MOVE_MEDIA)) {
			for (const src of [media.start, media.end]) {
				if (!src) continue;
				if (!existsSync(join(staticDir, src.replace(/^\//, '')))) missing.push(`${name}: ${src}`);
			}
		}
		expect(missing).toEqual([]);
	});

	it('names the frames with the flat /moves/<slug>-<pose> layout', () => {
		const pattern = /^\/moves\/[a-z0-9]+(?:-[a-z0-9]+)*-[01]\.(?:webp|jpg)$/;
		for (const [name, media] of Object.entries(MOVE_MEDIA)) {
			expect(pattern.test(media.start), `${name} start`).toBe(true);
			if (media.end) expect(pattern.test(media.end), `${name} end`).toBe(true);
		}
	});
});
