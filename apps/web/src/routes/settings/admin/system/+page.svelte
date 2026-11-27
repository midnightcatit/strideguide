<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { modal } from '$lib/actions';
	import { overlayHistory } from '$lib/overlayHistory.svelte';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import { api } from '$lib/api';
	import type { EdgeKind, GraphView } from '@strideguide/shared/system-graph';
	import type { GraphNodeKind } from '$lib/components/system/types';
	import { edgeKindColor, GRAPH_PALETTE } from '$lib/components/system/palette';
	import { graphTheme } from '$lib/components/system/graphTheme.svelte';
	import graphJson from '$lib/system-graph.generated.json';

	/**
	 * The admin system map. The graph itself is produced from the repository at
	 * build time and imported as data, so the page never fetches it and never
	 * draws it from a model. The canvas is a separate chunk, imported only after
	 * the admin check, so this route does not pull the drawing code into the
	 * bundle everyone else loads.
	 */

	// One cast at the boundary: the generated JSON is plain data with widened
	// string types, and the shared types describe the shape it was written in.
	const graph = graphJson as unknown as {
		fingerprint: string;
		generatedAt: string;
		views: GraphView[];
	};
	const views = graph.views;

	type GraphNode = GraphView['nodes'][number];
	type GraphLink = NonNullable<GraphNode['links']>[number];
	type SystemGraphCanvas = (typeof import('$lib/components/system/SystemGraph.svelte'))['default'];

	// Links whose label is data (a file name, a test name, a PR number) read in the
	// mono face; a decision entry's label is its title, so it stays in the body face.
	const MONO_KINDS = new Set(['code', 'test', 'pr', 'doc']);

	let loading = $state(true);
	let isAdmin = $state(false);
	let error = $state('');
	let canvasFailed = $state(false);
	let Canvas = $state<SystemGraphCanvas | null>(null);
	let diagramOpen = $state(false);

	// The URL carries the view and the node, so a link like
	// `#view=paths&node=load-ease` reopens the same spot. The selected view and
	// node are held in state and the hash is written for the deep link; a real
	// hash navigation (Back, Forward, a pasted link) is read back through the
	// `hashchange` listener. Reading `page.url.hash` back after the shallow
	// `replaceState` does not re-run a derive, so the state is the source of truth
	// and the hash follows it, not the other way around.
	const firstViewId = views[0]?.id ?? '';
	let viewId = $state<string>(firstViewId);
	let focusedId = $state<string | null>(null);
	const currentView = $derived(views.find((v) => v.id === viewId) ?? views[0]);
	const focusedNode = $derived(currentView?.nodes.find((n) => n.id === focusedId) ?? null);

	function readHash(): { view: string | null; node: string | null } {
		if (typeof window === 'undefined') return { view: null, node: null };
		const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
		return { view: params.get('view'), node: params.get('node') };
	}

	function syncFromHash() {
		const { view, node } = readHash();
		const nextView = view && views.some((v) => v.id === view) ? view : firstViewId;
		viewId = nextView;
		const target = views.find((v) => v.id === nextView);
		focusedId = node && target?.nodes.some((n) => n.id === node) ? node : null;
	}

	function setHash(nextView: string, nextNode: string | null) {
		const target = views.find((v) => v.id === nextView);
		viewId = nextView;
		focusedId = nextNode && target?.nodes.some((n) => n.id === nextNode) ? nextNode : null;
		const params = new URLSearchParams();
		params.set('view', nextView);
		if (nextNode) params.set('node', nextNode);
		const url = new URL(window.location.href);
		url.hash = params.toString();
		replaceState(url, {});
	}

	function selectView(id: string) {
		setHash(id, null);
	}

	function focusNode(id: string) {
		setHash(viewId, id);
	}

	function clearNode() {
		setHash(viewId, null);
	}

	const viewIndex = $derived(views.findIndex((v) => v.id === viewId));

	function onTabKeydown(event: KeyboardEvent) {
		const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
		if (!keys.includes(event.key) || views.length === 0) return;
		event.preventDefault();
		const from = viewIndex < 0 ? 0 : viewIndex;
		const next =
			event.key === 'ArrowRight'
				? (from + 1) % views.length
				: event.key === 'ArrowLeft'
					? (from - 1 + views.length) % views.length
					: event.key === 'Home'
						? 0
						: views.length - 1;
		const target = views[next];
		if (!target) return;
		selectView(target.id);
		requestAnimationFrame(() => document.getElementById(`tab-${target.id}`)?.focus());
	}

	// Escape and the phone Back button both leave the diagram, alongside the
	// on-screen Close, so there is always a way out.
	overlayHistory(
		() => diagramOpen,
		() => (diagramOpen = false),
	);

	const theme = graphTheme();
	const nodeKinds = $derived([...new Set((currentView?.nodes ?? []).map((n) => n.kind))]);
	const edgeKinds = $derived([...new Set((currentView?.edges ?? []).map((e) => e.kind))]);

	/** The legend swatches read the diagram's own palette, so the key and the
	 * canvas name the same colour. */
	function nodeSwatch(kind: string): string {
		return GRAPH_PALETTE[theme.current].kinds[kind as GraphNodeKind]?.rail ?? GRAPH_PALETTE[theme.current].note;
	}
	function edgeSwatch(kind: string): string {
		return edgeKindColor(theme.current, kind as EdgeKind);
	}

	const nodeGroups = $derived.by(() => {
		const groups: { kind: string; nodes: GraphNode[] }[] = [];
		for (const node of currentView?.nodes ?? []) {
			let group = groups.find((g) => g.kind === node.kind);
			if (!group) {
				group = { kind: node.kind, nodes: [] };
				groups.push(group);
			}
			group.nodes.push(node);
		}
		return groups;
	});

	function humanize(value: string): string {
		const spaced = value.replace(/[-_]/g, ' ');
		return spaced.charAt(0).toUpperCase() + spaced.slice(1);
	}

	const isExternal = (href: string) => /^https?:\/\//i.test(href);

	function formatGenerated(iso: string): string {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return iso;
		return date.toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	onMount(() => {
		syncFromHash();
		const onHash = () => syncFromHash();
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	});

	onMount(async () => {
		try {
			const me = await api.adminMe();
			isAdmin = me.isAdmin;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not check admin access.';
			loading = false;
			return;
		}
		loading = false;
		if (!isAdmin) return;
		void import('$lib/components/system/SystemGraph.svelte')
			.then((m) => (Canvas = m.default))
			.catch(() => (canvasFailed = true));
	});
</script>

{#snippet linkChips(links: GraphLink[])}
	<ul class="mt-2 flex flex-wrap gap-2">
		{#each links as link, i (i)}
			<li>
				<a
					href={link.href}
					title={link.href}
					target={isExternal(link.href) ? '_blank' : undefined}
					rel={isExternal(link.href) ? 'noreferrer noopener' : undefined}
					class="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2 py-0.5 text-xs hover:border-signal hover:text-signal-ink"
				>
					<span class="uppercase tracking-wide text-steel">{link.kind}</span>
					<span class={MONO_KINDS.has(link.kind) ? 'tabular' : ''}>{link.label}</span>
				</a>
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet nodeDetail(node: GraphNode)}
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="text-xs uppercase tracking-wider text-steel">{humanize(node.kind)}</p>
			<h4 class="font-display mt-1 text-base font-semibold">{node.label}</h4>
		</div>
		<button
			type="button"
			class="shrink-0 rounded-md border border-hairline-strong px-2.5 py-1 text-xs hover:border-signal hover:text-signal-ink"
			onclick={clearNode}
		>
			Close
		</button>
	</div>
	{#if node.note}
		<p class="mt-2 text-sm leading-relaxed text-steel">{node.note}</p>
	{/if}
	{#if node.links?.length}
		{@render linkChips(node.links)}
	{:else}
		<p class="mt-2 text-xs text-steel">This node has no links yet.</p>
	{/if}
{/snippet}

<SettingsHeader title="System map" />

{#if loading}
	<p class="text-sm text-steel">Loading.</p>
{:else if !isAdmin}
	<p class="text-sm text-steel">This page is only for admins.</p>
{:else if error}
	<div class="rounded-xl border border-hairline bg-paper p-4">
		<p role="alert" class="text-sm text-steel">{error}</p>
	</div>
{:else if !currentView}
	<p class="text-sm text-steel">The system map has no views yet.</p>
{:else}
	<section class="mb-8">
		<p class="mb-2 text-sm">
			<a href="/settings/admin" class="text-signal-ink hover:underline">Back to admin</a>
		</p>

		<h2 class="font-display mb-1 text-lg font-semibold">System map</h2>
		<p class="mb-2 text-sm leading-relaxed text-steel">
			Six views of how the pieces fit together: the pipeline a request runs through, the paths a
			decision can take, the rules it must hold, where a reason comes from, the data it stores, and
			the step-level detail. Each node points at the file, test, decision or pull request behind it.
		</p>
		<p class="mb-4 text-xs text-steel">
			Generated from the repository at build time, not read live. Fingerprint
			<span class="tabular">{graph.fingerprint}</span>, generated {formatGenerated(graph.generatedAt)}.
		</p>

		<div
			role="tablist"
			aria-label="System map views"
			class="mb-4 flex flex-wrap gap-1 rounded-xl border border-hairline p-1"
		>
			{#each views as view (view.id)}
				<button
					role="tab"
					id={`tab-${view.id}`}
					type="button"
					aria-selected={view.id === viewId}
					tabindex={view.id === viewId ? 0 : -1}
					class="rounded-lg px-3 py-1.5 text-sm {view.id === viewId
						? 'bg-signal-wash text-signal-ink'
						: 'text-steel hover:text-ink'}"
					onclick={() => selectView(view.id)}
					onkeydown={onTabKeydown}
				>
					{view.title}
				</button>
			{/each}
		</div>

		<div role="tabpanel" aria-labelledby={`tab-${viewId}`} tabindex="-1">
			<h3 class="font-display text-base font-semibold">{currentView.title}</h3>
			<p class="mb-4 text-sm leading-relaxed text-steel">{currentView.lede}</p>

			<div class="mb-4 grid gap-4 rounded-xl border border-hairline bg-paper p-4 sm:grid-cols-2">
				<div>
					<p class="mb-2 text-xs uppercase tracking-wider text-steel">Node kinds</p>
					{#if nodeKinds.length}
						<ul class="flex flex-wrap gap-x-4 gap-y-2">
							{#each nodeKinds as kind (kind)}
								<li class="flex items-center gap-2 text-sm">
									<span
										class="inline-block h-3 w-3 shrink-0 rounded-full"
										style="background: {nodeSwatch(kind)}"
									></span>
									{humanize(kind)}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-sm text-steel">This view has no nodes.</p>
					{/if}
				</div>
				<div>
					<p class="mb-2 text-xs uppercase tracking-wider text-steel">Edge kinds</p>
					{#if edgeKinds.length}
						<ul class="flex flex-wrap gap-x-4 gap-y-2">
							{#each edgeKinds as kind (kind)}
								<li class="flex items-center gap-2 text-sm">
									<span
										class="inline-block h-0.5 w-5 shrink-0 rounded-full"
										style="background: {edgeSwatch(kind)}"
									></span>
									{humanize(kind)}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-sm text-steel">This view has no edges.</p>
					{/if}
				</div>
			</div>

			{#if Canvas}
				<button
					type="button"
					class="mb-4 w-full rounded-lg border border-hairline-strong px-4 py-3 text-sm hover:border-signal hover:text-signal-ink"
					onclick={() => (diagramOpen = true)}
				>
					Open the map full screen
				</button>
			{/if}

			<div class="lg:grid lg:grid-cols-2 lg:gap-8">
				<div class="hidden lg:block">
					{#if Canvas}
						<div
							class="overflow-hidden rounded-xl border border-hairline bg-paper"
							style="height: clamp(24rem, 60svh, 40rem)"
						>
							<Canvas view={currentView} onNode={(node) => focusNode(node.id)} focusedId={focusedId} />
						</div>
					{:else if canvasFailed}
						<p class="rounded-xl border border-hairline bg-paper p-4 text-sm text-steel">
							The diagram could not load. The list beside it still has every node and its links.
						</p>
					{/if}
				</div>

				<div>
					{#if focusedNode}
						<div class="mb-4 rounded-xl border border-hairline bg-sunken p-4">
							{@render nodeDetail(focusedNode)}
						</div>
					{/if}

					<div class="max-h-[40rem] overflow-y-auto pr-1">
						{#each nodeGroups as group (group.kind)}
							<section class="mb-5">
								<h4 class="mb-2 text-xs uppercase tracking-wider text-steel">
									{humanize(group.kind)}
								</h4>
								<ul class="grid gap-2">
									{#each group.nodes as node (node.id)}
										<li
											class="rounded-lg border bg-paper p-3 {focusedId === node.id
												? 'border-signal'
												: 'border-hairline'}"
										>
											<button
												type="button"
												class="block w-full text-left"
												aria-pressed={focusedId === node.id}
												onclick={() => focusNode(node.id)}
											>
												<span class="block font-medium text-ink">{node.label}</span>
												{#if node.note}
													<span class="mt-1 block text-sm leading-relaxed text-steel">
														{node.note}
													</span>
												{/if}
											</button>
											{#if node.links?.length}
												{@render linkChips(node.links)}
											{/if}
										</li>
									{/each}
								</ul>
							</section>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>
{/if}

{#if diagramOpen && currentView}
	<div
		class="fixed inset-0 flex flex-col bg-paper"
		style="z-index: var(--z-overlay)"
		role="dialog"
		aria-modal="true"
		aria-label={`${currentView.title} diagram`}
		use:modal={() => (diagramOpen = false)}
	>
		<header
			class="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3"
			data-modal-panel
			tabindex="-1"
		>
			<div>
				<p class="text-sm font-medium">{currentView.title}</p>
				<p class="text-xs text-steel">Tap a node for its note and links.</p>
			</div>
			<button
				type="button"
				class="shrink-0 rounded-md border border-hairline-strong px-3 py-1.5 text-xs hover:border-signal hover:text-signal-ink"
				onclick={() => (diagramOpen = false)}
			>
				Close
			</button>
		</header>

		<div class="min-h-0 flex-1">
			{#if Canvas}
				<Canvas view={currentView} onNode={(node) => focusNode(node.id)} focusedId={focusedId} fill />
			{/if}
		</div>

		{#if focusedNode}
			<div class="max-h-[45%] overflow-y-auto border-t border-hairline bg-paper p-4">
				{@render nodeDetail(focusedNode)}
			</div>
		{/if}
	</div>
{/if}
