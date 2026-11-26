/**
 * The pure half of the system map layout: the shapes, the ELK graph built from
 * a request, and the small fallback used when ELK cannot run. Kept apart from
 * `layout.ts` so the worker and the runner can both import it without pulling
 * the worker URL into the worker bundle.
 */

export interface LayoutNode {
	id: string;
	width: number;
	height: number;
}

export interface LayoutEdge {
	from: string;
	to: string;
}

export interface LayoutInput {
	direction: 'TB' | 'LR';
	edgeRouting: 'POLYLINE';
	nodes: LayoutNode[];
	edges: LayoutEdge[];
}

export type LayoutPositions = Record<string, { x: number; y: number }>;

export interface LayoutOutput {
	positions: LayoutPositions;
	engine: 'elk' | 'fallback';
}

/** The message the worker receives, and the reply it sends back. */
export interface LayoutRequest extends LayoutInput {
	id: number;
}

export interface LayoutReply {
	id: number;
	positions?: LayoutPositions;
	error?: string;
}

/**
 * The ELK graph built from a request. Pure, so the mapping is testable. Edges
 * that point at a node outside the view are dropped, since ELK rejects a
 * dangling edge and the fallback ignores it anyway.
 */
export function buildElkGraph(input: LayoutInput) {
	const known = new Set(input.nodes.map((node) => node.id));
	return {
		id: 'root',
		layoutOptions: {
			'elk.algorithm': 'layered',
			'elk.direction': input.direction === 'TB' ? 'DOWN' : 'RIGHT',
			'elk.edgeRouting': input.edgeRouting,
			'elk.layered.spacing.nodeNodeBetweenLayers': '64',
			'elk.spacing.nodeNode': '44',
			'elk.layered.spacing.edgeNodeBetweenLayers': '24',
			'elk.padding': '[top=8,left=8,bottom=8,right=8]',
		} as Record<string, string>,
		children: input.nodes.map((node) => ({
			id: node.id,
			width: Math.max(1, node.width),
			height: Math.max(1, node.height),
		})),
		edges: input.edges
			.filter((edge) => known.has(edge.from) && known.has(edge.to))
			.map((edge, i) => ({
				id: `e${i}`,
				sources: [edge.from],
				targets: [edge.to],
			})),
	};
}

/**
 * A small layered layout used when ELK cannot run. It places nodes by their
 * longest-path depth from the sources: a column per depth in a top-to-bottom
 * graph, a row per depth left-to-right. Deterministic, so it is also the shape
 * the tests pin.
 */
export function fallbackLayout(input: LayoutInput): LayoutPositions {
	const ids = input.nodes.map((n) => n.id);
	const known = new Set(ids);
	const indegree = new Map(ids.map((id) => [id, 0]));
	const next = new Map(ids.map((id) => [id, [] as string[]]));
	for (const edge of input.edges) {
		if (!known.has(edge.from) || !known.has(edge.to)) continue;
		next.get(edge.from)?.push(edge.to);
		indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
	}

	const depth = new Map(ids.map((id) => [id, 0]));
	const remaining = new Map(indegree);
	const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
	while (queue.length) {
		const id = queue.shift() as string;
		for (const to of next.get(id) ?? []) {
			depth.set(to, Math.max(depth.get(to) ?? 0, (depth.get(id) ?? 0) + 1));
			remaining.set(to, (remaining.get(to) ?? 1) - 1);
			if ((remaining.get(to) ?? 0) === 0) queue.push(to);
		}
	}

	const byDepth = new Map<number, string[]>();
	for (const id of ids) {
		const d = depth.get(id) ?? 0;
		const list = byDepth.get(d);
		if (list) list.push(id);
		else byDepth.set(d, [id]);
	}

	const sizeById = new Map(input.nodes.map((n) => [n.id, n]));
	const GAP = 48;
	const positions: LayoutPositions = {};
	for (const [d, list] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
		list.forEach((id, i) => {
			const size = sizeById.get(id);
			if (input.direction === 'LR') {
				positions[id] = { x: d * (280 + GAP), y: i * ((size?.height ?? 64) + GAP) };
			} else {
				positions[id] = { x: i * ((size?.width ?? 220) + GAP), y: d * (120 + GAP) };
			}
		});
	}
	return positions;
}

/** A node's provisional spot before ELK has run, so it can be measured. */
export function provisionalPositions(ids: string[]): LayoutPositions {
	const columns = Math.max(1, Math.ceil(Math.sqrt(ids.length)));
	const positions: LayoutPositions = {};
	ids.forEach((id, i) => {
		const col = i % columns;
		const row = Math.floor(i / columns);
		positions[id] = { x: col * 260, y: row * 140 };
	});
	return positions;
}
