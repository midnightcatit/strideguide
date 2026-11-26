/**
 * The shape the system map renders. These mirror the fixed contract owned by
 * `packages/shared/src/system-graph.ts` (built by the data session); the canvas
 * is presentational, so it declares the view it draws rather than importing the
 * generated data file. When the shared module lands, the import can move there
 * without a shape change.
 */

/** The eight kinds a node can carry. One look per kind. */
export type GraphNodeKind =
	| 'stage'
	| 'module'
	| 'boundary'
	| 'decision'
	| 'data'
	| 'route'
	| 'test'
	| 'trigger';

/** Every kind, in a stable order, for palettes and legends. */
export const NODE_KINDS: readonly GraphNodeKind[] = [
	'stage',
	'module',
	'boundary',
	'decision',
	'data',
	'route',
	'test',
	'trigger',
] as const;

/** What one link points at. Mirrors the shared contract. */
export type GraphLinkKind = 'code' | 'test' | 'decision' | 'pr' | 'doc';

export interface GraphLink {
	kind: GraphLinkKind;
	label: string;
	href: string;
}

export interface GraphNode {
	id: string;
	label: string;
	kind: GraphNodeKind;
	note?: string;
	links?: GraphLink[];
}

/** The data Svelte Flow carries on each node object. */
export type GraphNodeData = { node: GraphNode };

/** What an edge stands for. Mirrors the shared contract. */
export type GraphEdgeKind = 'flow' | 'enforced' | 'guarded' | 'decision' | 'foreign-key';

/** Every edge kind, in a stable order, for the palette and the legend. */
export const EDGE_KINDS: readonly GraphEdgeKind[] = [
	'flow',
	'enforced',
	'guarded',
	'decision',
	'foreign-key',
] as const;

export interface GraphEdge {
	from: string;
	to: string;
	kind: GraphEdgeKind;
	label?: string;
}

export interface GraphLayout {
	engine: 'elk';
	algorithm: 'layered';
	direction: 'TB' | 'LR';
	edgeRouting: 'POLYLINE';
}

export interface GraphView {
	id: string;
	title: string;
	lede: string;
	layout: GraphLayout;
	nodes: GraphNode[];
	edges: GraphEdge[];
}
