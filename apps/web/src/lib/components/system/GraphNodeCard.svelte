<script lang="ts">
	/**
	 * One node on the system map. The look is driven by the node's `kind`: a
	 * thin accent rail down the left, a small kind chip, the label in strong ink
	 * and an optional note under it. The body is a real button, so a keyboard can
	 * reach and activate it; the click bubbles to the canvas, which calls
	 * `onNode`.
	 *
	 * Highlight state comes from context, not from the node data, so hovering one
	 * node never rebuilds the node objects (Svelte Flow would drop their measured
	 * sizes and re-measure).
	 *
	 * The two invisible handles give Svelte Flow an anchor at each end of an edge
	 * without drawing anything; connections are off, so they never react.
	 */
	import { getContext } from 'svelte';
	import { Handle, Position, type NodeProps, type Node } from '@xyflow/svelte';
	import type { GraphNode, GraphNodeData } from './types';
	import { kindVars } from './palette';
	import { GRAPH_FOCUS, type GraphFocus } from './focus';

	let {
		id,
		data,
		sourcePosition,
		targetPosition,
	}: NodeProps<Node<GraphNodeData>> = $props();

	const fallback: GraphFocus = {
		activeId: null,
		focusedId: null,
		isNeighbor: () => false,
		isEdgeActive: () => false,
		isEdgeDimmed: () => false,
		setLocalFocus: () => {},
		clearLocalFocus: () => {},
	};
	const focus = getContext<GraphFocus>(GRAPH_FOCUS) ?? fallback;

	const node = $derived<GraphNode>(data.node);
	const active = $derived(focus.activeId === id);
	const neighbor = $derived(!active && focus.activeId !== null && focus.isNeighbor(id));
	const dimmed = $derived(focus.focusedId !== null && focus.focusedId !== id);
	const label = $derived(`${node.label}, ${node.kind}${node.note ? `. ${node.note}` : ''}`);
</script>

<div class="sg-node" style={kindVars(node.kind)} data-kind={node.kind}>
	<Handle type="target" position={targetPosition ?? Position.Top} isConnectable={false} style="opacity:0" />
	<button
		type="button"
		class="card"
		class:is-active={active}
		class:is-neighbor={neighbor}
		class:is-dimmed={dimmed}
		aria-label={label}
		onfocus={() => focus.setLocalFocus(id)}
		onblur={() => focus.clearLocalFocus(id)}
	>
		<span class="rail" aria-hidden="true"></span>
		<span class="content">
			<span class="chip">{node.kind}</span>
			<span class="label">{node.label}</span>
			{#if node.note}<span class="note">{node.note}</span>{/if}
		</span>
	</button>
	<Handle
		type="source"
		position={sourcePosition ?? Position.Bottom}
		isConnectable={false}
		style="opacity:0"
	/>
</div>

<style>
	.sg-node {
		position: relative;
		display: flex;
		width: fit-content;
	}

	.card {
		display: flex;
		align-items: stretch;
		min-width: 11rem;
		max-width: 17rem;
		min-height: var(--tap-min, 44px);
		padding: 0;
		border: 1px solid var(--g-hairline);
		border-radius: 10px;
		background: var(--g-surface);
		color: var(--g-ink);
		text-align: left;
		overflow: hidden;
		box-shadow: 0 1px 2px rgba(15, 18, 24, 0.06);
	}

	.card:active {
		transform: none;
	}

	.card:hover {
		border-color: var(--g-rail);
	}

	.rail {
		flex: 0 0 4px;
		background: var(--g-rail);
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
		padding: 8px 10px;
	}

	.chip {
		align-self: flex-start;
		padding: 1px 7px;
		border-radius: 999px;
		background: var(--g-chip-bg);
		color: var(--g-chip-ink);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.06em;
		line-height: 1.5;
		text-transform: uppercase;
	}

	.label {
		display: block;
		font-size: 13px;
		font-weight: 500;
		line-height: 1.25;
	}

	.note {
		display: block;
		color: var(--g-note);
		font-size: 11px;
		line-height: 1.35;
	}

	.card.is-active {
		border-color: var(--g-rail);
		box-shadow:
			0 0 0 2px var(--g-rail),
			0 8px 20px -12px rgba(15, 18, 24, 0.5);
	}

	.card.is-neighbor {
		border-color: var(--g-rail);
	}

	.card.is-dimmed {
		opacity: 0.28;
		box-shadow: none;
	}

	.card:focus-visible {
		outline: 2px solid var(--g-rail);
		outline-offset: 2px;
	}
</style>
