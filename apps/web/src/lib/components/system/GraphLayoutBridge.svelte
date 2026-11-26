<script lang="ts">
	/**
	 * The measured-size pass. It lives inside Svelte Flow so it can read the
	 * store: once every node has a real width and height, it hands those sizes
	 * back to the canvas, which lays them out with ELK and positions the nodes.
	 * It also owns `fitView`, re-fitting when the view or the focused node
	 * changes.
	 */
	import { useNodesInitialized, useNodes, useSvelteFlow } from '@xyflow/svelte';
	import type { GraphView } from './types';
	import type { LayoutNode } from './layout';

	let {
		view,
		laidOut,
		reduced,
		focusedId,
		fitIds,
		onMeasured,
	}: {
		view: GraphView;
		laidOut: boolean;
		reduced: boolean;
		focusedId: string | null;
		fitIds: string[];
		onMeasured: (view: GraphView, sizes: LayoutNode[]) => void;
	} = $props();

	const initialized = useNodesInitialized();
	const nodes = useNodes();
	const flow = useSvelteFlow();

	$effect(() => {
		if (!initialized.current || laidOut) return;
		const sizes: LayoutNode[] = nodes.current.map((node) => ({
			id: node.id,
			width: node.measured?.width ?? 0,
			height: node.measured?.height ?? 0,
		}));
		if (sizes.length === 0 || sizes.some((s) => !s.width || !s.height)) return;
		onMeasured(view, sizes);
	});

	$effect(() => {
		if (!initialized.current || !laidOut) return;
		const id = view.id;
		const focus = focusedId;
		const ids = fitIds;
		const duration = reduced ? 0 : 320;
		const options =
			focus && ids.length
				? { nodes: ids.map((nodeId) => ({ id: nodeId })), padding: 0.35, duration }
				: { padding: 0.15, duration };
		void id;
		const frame = requestAnimationFrame(() => {
			void flow.fitView(options);
		});
		return () => cancelAnimationFrame(frame);
	});
</script>
