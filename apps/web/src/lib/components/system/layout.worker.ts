/**
 * The ELK worker. It is a module worker; `elkjs` is pulled in with a dynamic
 * import so the engine is bundled into this worker and never into the app.
 *
 * The bundled build carries its own in-process worker, so nothing is nested:
 * `elk.layout` runs here, off the main thread.
 *
 * The scope is typed with a local interface rather than `DedicatedWorkerGlobalScope`
 * so the file does not pull the webworker lib into the app's DOM type set.
 */
import { buildElkGraph, type LayoutPositions, type LayoutReply, type LayoutRequest } from './layout-graph';

interface WorkerScope {
	postMessage(message: LayoutReply): void;
	addEventListener(
		type: 'message',
		listener: (event: MessageEvent<LayoutRequest>) => void,
	): void;
}

const ctx = self as unknown as WorkerScope;

ctx.addEventListener('message', async (event) => {
	const request = event.data;
	try {
		const { default: ELK } = await import('elkjs/lib/elk.bundled.js');
		const elk = new ELK();
		const result = await elk.layout(buildElkGraph(request));
		const positions: LayoutPositions = {};
		for (const child of result.children ?? []) {
			positions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
		}
		ctx.postMessage({ id: request.id, positions });
	} catch (error) {
		ctx.postMessage({
			id: request.id,
			error: error instanceof Error ? error.message : 'layout failed',
		});
	}
});

export {};
