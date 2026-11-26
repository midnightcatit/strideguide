import { describe, expect, it } from 'vitest';
import {
	buildElkGraph,
	fallbackLayout,
	provisionalPositions,
	type LayoutInput,
} from './layout-graph';

const input: LayoutInput = {
	direction: 'TB',
	edgeRouting: 'POLYLINE',
	nodes: [
		{ id: 'a', width: 200, height: 80 },
		{ id: 'b', width: 200, height: 80 },
		{ id: 'c', width: 200, height: 80 },
	],
	edges: [
		{ from: 'a', to: 'b' },
		{ from: 'b', to: 'c' },
	],
};

describe('buildElkGraph', () => {
	it('maps the direction to ELK and keeps every node and edge', () => {
		const tb = buildElkGraph(input);
		expect(tb.layoutOptions['elk.direction']).toBe('DOWN');
		expect(tb.layoutOptions['elk.edgeRouting']).toBe('POLYLINE');
		expect(tb.children).toHaveLength(3);
		expect(tb.edges).toHaveLength(2);
		expect(tb.edges[0]).toMatchObject({ sources: ['a'], targets: ['b'] });

		const lr = buildElkGraph({ ...input, direction: 'LR' });
		expect(lr.layoutOptions['elk.direction']).toBe('RIGHT');
	});

	it('never hands ELK a zero size', () => {
		const graph = buildElkGraph({
			...input,
			nodes: [{ id: 'a', width: 0, height: 0 }],
			edges: [],
		});
		expect(graph.children[0]).toMatchObject({ width: 1, height: 1 });
	});
});

describe('fallbackLayout', () => {
	it('layers a chain by longest-path depth', () => {
		const positions = fallbackLayout(input);
		// Top-to-bottom: depth drives y, so the chain steps down the page.
		expect(positions.a.y).toBeLessThan(positions.b.y);
		expect(positions.b.y).toBeLessThan(positions.c.y);
	});

	it('layers left-to-right when the view asks for it', () => {
		const positions = fallbackLayout({ ...input, direction: 'LR' });
		expect(positions.a.x).toBeLessThan(positions.b.x);
		expect(positions.b.x).toBeLessThan(positions.c.x);
	});

	it('is deterministic and gives every node a spot', () => {
		const first = fallbackLayout(input);
		const second = fallbackLayout(input);
		expect(second).toEqual(first);
		expect(Object.keys(first).sort()).toEqual(['a', 'b', 'c']);
	});

	it('ignores an edge to a node that is not in the view', () => {
		const positions = fallbackLayout({
			...input,
			edges: [{ from: 'a', to: 'missing' }],
		});
		expect(Object.keys(positions).sort()).toEqual(['a', 'b', 'c']);
	});
});

describe('provisionalPositions', () => {
	it('spreads nodes out so none overlap before measuring', () => {
		const positions = provisionalPositions(['a', 'b', 'c']);
		const seen = new Set(Object.values(positions).map((p) => `${p.x},${p.y}`));
		expect(seen.size).toBe(3);
	});
});
