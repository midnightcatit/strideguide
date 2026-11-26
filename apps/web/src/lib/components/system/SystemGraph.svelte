<script lang="ts">
	/**
	 * The system map canvas. It draws one `GraphView` and knows nothing about the
	 * tabs above it or the file the view came from: give it a view, it lays the
	 * nodes out and draws them.
	 *
	 * Layout is two passes. First the nodes render at provisional spots so Svelte
	 * Flow can measure them; then those measured sizes go to ELK in a web worker,
	 * and the returned positions are applied. Nothing is guessed.
	 *
	 * The palette is the diagram's own (see palette.ts), set as variables on the
	 * root so a theme change is one string swap and no node is rebuilt.
	 */
	import { setContext } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		SvelteFlow,
		Controls,
		MiniMap,
		Background,
		BackgroundVariant,
		Panel,
		MarkerType,
		Position,
		type Node,
		type Edge,
		type NodeTypes,
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import type { GraphNode, GraphNodeData, GraphView } from './types';
	import { GRAPH_FOCUS, type GraphFocus } from './focus';
	import { graphTheme } from './graphTheme.svelte';
	import { graphVars, xyflowVars } from './palette';
	import {
		createLayoutRunner,
		provisionalPositions,
		type LayoutInput,
		type LayoutNode,
		type LayoutPositions,
	} from './layout';
	import GraphNodeCard from './GraphNodeCard.svelte';
	import GraphLayoutBridge from './GraphLayoutBridge.svelte';

	let {
		view,
		onNode,
		focusedId = null,
		onClose,
	}: {
		view: GraphView;
		onNode: (node: GraphNode) => void;
		focusedId?: string | null;
		onClose?: () => void;
	} = $props();

	const theme = graphTheme();
	const reduced = $derived(prefersReducedMotion.current);

	const runner = createLayoutRunner();
	$effect(() => () => runner.dispose());

	const nodeTypes: NodeTypes = { system: GraphNodeCard };

	// Per-view caches so switching back to a laid-out view is instant.
	let positionsByView = $state.raw<Record<string, LayoutPositions>>({});
	let sizesByView = $state.raw<Record<string, LayoutNode[]>>({});
	let engineByView = $state.raw<Record<string, 'elk' | 'fallback'>>({});
	let hoveredId = $state<string | null>(null);
	let localFocusId = $state<string | null>(null);

	const provisional = $derived(provisionalPositions(view.nodes.map((n) => n.id)));
	const positions = $derived(positionsByView[view.id] ?? provisional);
	const laidOut = $derived(view.nodes.length === 0 || !!positionsByView[view.id]);
	const engine = $derived(engineByView[view.id] ?? null);
	const sizesById = $derived.by(() => {
		const sizes = sizesByView[view.id];
		return sizes ? new Map(sizes.map((s) => [s.id, s])) : null;
	});

	const activeId = $derived(hoveredId ?? localFocusId ?? focusedId ?? null);
	const focusId = $derived(focusedId ?? null);
	const neighborSet = $derived(neighborsOf(view, activeId));

	const focus: GraphFocus = {
		get activeId() {
			return activeId;
		},
		get focusedId() {
			return focusId;
		},
		isNeighbor: (id) => neighborSet.has(id),
		isEdgeActive: (from, to) => activeId !== null && (from === activeId || to === activeId),
		isEdgeDimmed: (from, to) => focusId !== null && from !== focusId && to !== focusId,
		setLocalFocus: (id) => {
			localFocusId = id;
		},
		clearLocalFocus: (id) => {
			if (localFocusId === id) localFocusId = null;
		},
	};
	setContext(GRAPH_FOCUS, focus);

	const fitIds = $derived(focusId ? [focusId, ...neighborsOf(view, focusId)] : []);
	const horizontal = $derived(view.layout.direction === 'LR');

	const nodes = $derived<Node<GraphNodeData>[]>(
		view.nodes.map((node) => {
			const size = sizesById?.get(node.id);
			return {
				id: node.id,
				type: 'system',
				position: positions[node.id] ?? { x: 0, y: 0 },
				data: { node },
				measured: size ? { width: size.width, height: size.height } : undefined,
				sourcePosition: horizontal ? Position.Right : Position.Bottom,
				targetPosition: horizontal ? Position.Left : Position.Top,
				draggable: false,
				focusable: false,
				ariaRole: 'presentation',
			};
		}),
	);

	const edges = $derived<Edge[]>(
		view.edges.map((edge, i) => ({
			id: `${edge.from}->${edge.to}:${i}`,
			source: edge.from,
			target: edge.to,
			type: 'smoothstep',
			animated: !reduced,
			markerEnd: MarkerType.ArrowClosed,
			label: edge.label,
			labelStyle: 'font-family: var(--font-data); font-size: 10px;',
			style: focus.isEdgeDimmed(edge.from, edge.to)
				? 'opacity:0.16'
				: focus.isEdgeActive(edge.from, edge.to)
					? 'stroke-width:2.25'
					: '',
		})),
	);

	async function handleMeasured(target: GraphView, sizes: LayoutNode[]) {
		const input: LayoutInput = {
			direction: target.layout.direction,
			edgeRouting: target.layout.edgeRouting,
			nodes: sizes,
			edges: target.edges.map((edge) => ({ from: edge.from, to: edge.to })),
		};
		const result = await runner.layout(input);
		sizesByView = { ...sizesByView, [target.id]: sizes };
		positionsByView = { ...positionsByView, [target.id]: result.positions };
		engineByView = { ...engineByView, [target.id]: result.engine };
	}

	function neighborsOf(target: GraphView, id: string | null): Set<string> {
		const set = new Set<string>();
		if (!id) return set;
		for (const edge of target.edges) {
			if (edge.from === id) set.add(edge.to);
			else if (edge.to === id) set.add(edge.from);
		}
		return set;
	}
</script>

<div
	class="sg-graph"
	style="{graphVars(theme.current)};{xyflowVars(theme.current)}"
	data-engine={engine ?? 'pending'}
>
	<div class="sg-stage" class:is-ready={laidOut}>
		<SvelteFlow
			{nodes}
			{edges}
			{nodeTypes}
			forceColorMode={theme.current}
			onnodeclick={({ node }) => onNode(node.data.node)}
			onnodepointerenter={({ node }) => (hoveredId = node.id)}
			onnodepointerleave={({ node }) => (hoveredId = hoveredId === node.id ? null : hoveredId)}
			nodesDraggable={false}
			nodesConnectable={false}
			elementsSelectable={false}
			selectNodesOnDrag={false}
			nodesFocusable={false}
			edgesFocusable={false}
			panOnScroll={false}
			zoomOnScroll={true}
			zoomOnPinch={true}
			zoomOnDoubleClick={false}
			minZoom={0.2}
			maxZoom={2}
			fitView={false}
			defaultMarkerColor={null}
		>
			<Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
			<Controls position="bottom-left" />
			<MiniMap pannable zoomable position="bottom-right" />
			<GraphLayoutBridge
				{view}
				{laidOut}
				{reduced}
				{focusedId}
				{fitIds}
				onMeasured={handleMeasured}
			/>
			{#if onClose}
				<Panel position="top-right">
					<button type="button" class="sg-leave" onclick={onClose}>Close the map</button>
				</Panel>
			{/if}
		</SvelteFlow>
	</div>
	{#if view.nodes.length === 0}
		<p class="sg-status">This view has no nodes yet.</p>
	{:else if !laidOut}
		<p class="sg-status" role="status">Laying out the map</p>
	{/if}
</div>

<style>
	.sg-graph {
		position: relative;
		width: 100%;
		height: clamp(22rem, 60svh, 42rem);
		border: 1px solid var(--g-hairline);
		border-radius: 12px;
		background: var(--g-surface);
		color: var(--g-ink);
		overflow: hidden;
		touch-action: none;
	}

	.sg-stage {
		position: absolute;
		inset: 0;
	}

	.sg-stage:not(.is-ready) {
		visibility: hidden;
	}

	.sg-status {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		color: var(--g-note);
		font-size: 0.8125rem;
	}

	.sg-leave {
		min-height: var(--tap-min, 44px);
		padding: 0 12px;
		border: 1px solid var(--g-hairline);
		border-radius: 8px;
		background: var(--g-surface);
		color: var(--g-ink);
		font-size: 0.8125rem;
	}

	.sg-leave:hover {
		border-color: var(--g-rail, var(--g-focus-ring));
	}

	@media (max-width: 640px) {
		.sg-graph :global(.svelte-flow__minimap) {
			display: none;
		}
	}
</style>
