/**
 * The layout runner for the system map. ELK runs in a web worker created on
 * demand, which pulls `elkjs` in with a dynamic import, so the ~1.6 MB engine
 * never reaches the main bundle: it loads in the worker only when a graph is
 * drawn. The pure shapes and graph builder live in `layout-graph.ts` and are
 * re-exported here.
 */
import {
	fallbackLayout,
	type LayoutInput,
	type LayoutOutput,
	type LayoutPositions,
	type LayoutReply,
	type LayoutRequest,
} from './layout-graph';

export * from './layout-graph';

export interface LayoutRunner {
	layout(input: LayoutInput): Promise<LayoutOutput>;
	dispose(): void;
}

interface Pending {
	resolve: (positions: LayoutPositions) => void;
	reject: (error: Error) => void;
}

/**
 * Owns one lazily created module worker. If the worker is missing or throws, the
 * request falls back to `fallbackLayout` and the worker is dropped so later
 * requests do not keep paying for it.
 */
export function createLayoutRunner(): LayoutRunner {
	let worker: Worker | null = null;
	let sequence = 0;
	let disposed = false;
	const pending = new Map<number, Pending>();

	function failAll(error: Error) {
		for (const [, p] of pending) p.reject(error);
		pending.clear();
	}

	function ensureWorker(): Worker | null {
		if (disposed || worker) return worker;
		if (typeof Worker === 'undefined') return null;
		try {
			const created = new Worker(new URL('./layout.worker.ts', import.meta.url), {
				type: 'module',
			});
			created.onmessage = (event: MessageEvent<LayoutReply>) => {
				const reply = event.data;
				const p = pending.get(reply.id);
				if (!p) return;
				pending.delete(reply.id);
				if (reply.error) p.reject(new Error(reply.error));
				else p.resolve(reply.positions ?? {});
			};
			created.onerror = () => {
				// A worker that will not start is no worker at all; drop it so the
				// next request takes the fallback path instead of hanging.
				worker?.terminate();
				worker = null;
				failAll(new Error('layout worker failed'));
			};
			worker = created;
		} catch {
			worker = null;
		}
		return worker;
	}

	async function layout(input: LayoutInput): Promise<LayoutOutput> {
		const active = ensureWorker();
		if (!active) return { positions: fallbackLayout(input), engine: 'fallback' };
		const id = ++sequence;
		try {
			const positions = await new Promise<LayoutPositions>((resolve, reject) => {
				pending.set(id, { resolve, reject });
				active.postMessage({ id, ...input } satisfies LayoutRequest);
			});
			return { positions, engine: 'elk' };
		} catch {
			return { positions: fallbackLayout(input), engine: 'fallback' };
		}
	}

	return {
		layout,
		dispose() {
			disposed = true;
			failAll(new Error('layout runner disposed'));
			worker?.terminate();
			worker = null;
		},
	};
}
