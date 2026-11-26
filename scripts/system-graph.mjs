/**
 * Generate the system map's data.
 *
 * Reads the authored views from docs/system/graph.json and the machine-readable
 * sources (SYSTEM.md, docs/decisions.md, packages/shared/src/db/schema.ts),
 * builds all six views, and writes apps/web/src/lib/system-graph.generated.json.
 * The pure parsing and merge live in packages/shared/src/system-graph-parse.mjs,
 * which the Vitest suite imports too.
 *
 * The run is idempotent: the generated file's timestamp is kept when the inputs
 * are unchanged, so running it twice on the same sources leaves the file byte for
 * byte the same.
 *
 * Usage: pnpm system:graph
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	buildSystemGraph,
	serializeGraph,
	validateGraph,
} from '../packages/shared/src/system-graph-parse.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const AUTHORED = 'docs/system/graph.json';
const OUT = 'apps/web/src/lib/system-graph.generated.json';

/** @param {string} path @returns {string} */
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const authoredRaw = read(AUTHORED);
const authored = JSON.parse(authoredRaw);
const sources = {
	systemMd: read('SYSTEM.md'),
	decisionsMd: read('docs/decisions.md'),
	schemaTs: read('packages/shared/src/db/schema.ts'),
};
const outPath = join(ROOT, OUT);
const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : null;

const graph = buildSystemGraph({
	authored,
	authoredRaw,
	sources,
	existing,
	now: new Date().toISOString(),
});

const errors = validateGraph(graph);
if (errors.length) {
	console.error(`system map: ${errors.length} graph problem(s):`);
	for (const error of errors) console.error(`  ${error}`);
	process.exit(1);
}

const text = serializeGraph(graph);
const before = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;

if (before === text) {
	console.log(`system map: unchanged (fingerprint ${graph.fingerprint})`);
} else {
	mkdirSync(dirname(outPath), { recursive: true });
	writeFileSync(outPath, text);
	console.log(`system map: wrote ${OUT} (fingerprint ${graph.fingerprint})`);
}

console.log(`  ${graph.views.length} views`);
for (const view of graph.views) {
	console.log(
		`  ${view.id.padEnd(9)} nodes ${String(view.nodes.length).padStart(3)}  edges ${String(view.edges.length).padStart(3)}  ${view.title}`,
	);
}

const sample = graph.views.find((v) => v.id === 'granular');
if (sample) {
	const withLinks = sample.nodes.filter((n) => n.links?.length).slice(0, 2);
	for (const node of withLinks) {
		const links = (node.links ?? []).map((l) => `${l.kind}:${l.href}`).join(', ');
		console.log(`  sample: [${node.kind}] ${node.label} -> ${links}`);
	}
}
