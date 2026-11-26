import { describe, expect, it } from 'vitest';
import { GRAPH_PALETTE, type GraphTheme } from './palette';
import { NODE_KINDS } from './types';

/** WCAG 2.1 relative luminance for a hex colour. */
function luminance(hex: string): number {
	const value = hex.replace('#', '');
	const channel = (i: number) => {
		const c = parseInt(value.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** WCAG contrast ratio between two opaque hex colours. */
function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const themes: GraphTheme[] = ['light', 'dark'];

describe('graph palette contrast', () => {
	it.each(themes)('%s: body text clears AA on the node surface', (theme) => {
		const p = GRAPH_PALETTE[theme];
		expect(contrast(p.ink, p.surface)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(p.note, p.surface)).toBeGreaterThanOrEqual(4.5);
	});

	it.each(themes)('%s: every kind chip text clears AA', (theme) => {
		const p = GRAPH_PALETTE[theme];
		for (const kind of NODE_KINDS) {
			const c = p.kinds[kind];
			expect(contrast(c.chipInk, c.chipBg), `${theme} ${kind}`).toBeGreaterThanOrEqual(4.5);
		}
	});

	it.each(themes)('%s: every accent rail clears AA non-text', (theme) => {
		const p = GRAPH_PALETTE[theme];
		for (const kind of NODE_KINDS) {
			expect(contrast(p.kinds[kind].rail, p.surface), `${theme} ${kind}`).toBeGreaterThanOrEqual(
				3,
			);
		}
	});

	it.each(themes)('%s: edges and their labels stay legible', (theme) => {
		const p = GRAPH_PALETTE[theme];
		expect(contrast(p.edge, p.surface)).toBeGreaterThanOrEqual(3);
		expect(contrast(p.edgeLabelInk, p.surface)).toBeGreaterThanOrEqual(4.5);
	});
});
