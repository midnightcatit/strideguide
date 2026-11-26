/**
 * How the canvas tells its nodes and edges what to highlight, without touching
 * the node objects. Svelte Flow keeps a node's measured size only while the node
 * object identity is stable, so highlight state cannot ride on the nodes; it
 * rides on this context instead. A node reads `activeId` and compares it to its
 * own id, so hovering one node never rebuilds any of them.
 */
export const GRAPH_FOCUS = Symbol('system-graph-focus');

export interface GraphFocus {
	/** The node under the pointer or keyboard focus, or the pinned focus, or null. */
	readonly activeId: string | null;
	/** The pinned focus from the `focusedId` prop, or null. Only this dims the rest. */
	readonly focusedId: string | null;
	/** True for a node next to the active one. */
	isNeighbor(id: string): boolean;
	/** True for an edge touching the active node. */
	isEdgeActive(from: string, to: string): boolean;
	/** True for an edge to leave dimmed while a focus is pinned. */
	isEdgeDimmed(from: string, to: string): boolean;
	/** A node was focused by the keyboard. */
	setLocalFocus(id: string): void;
	/** That node lost focus. */
	clearLocalFocus(id: string): void;
}
