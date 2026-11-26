/**
 * Pure parsing and merge for the system map.
 *
 * Plain JavaScript with JSDoc types, not TypeScript, so the same module can be
 * imported by the Node generator (`scripts/system-graph.mjs`) and by the Vitest
 * suite (`system-graph-parse.test.ts`) with no build step. It reads no files and
 * writes none: every function takes text or data and returns data, so the tests
 * can hand it small fixtures. The public shapes it returns are declared in
 * `system-graph.ts`.
 *
 * The sources it parses are the ones the repo already keeps machine-readable:
 *   - SYSTEM.md: the invariants table and the boundaries section.
 *   - docs/decisions.md: the decision log.
 *   - packages/shared/src/db/schema.ts: the Drizzle tables and their references.
 */
import { createHash } from 'node:crypto';

/** Bumped when the parsed shape or the merged view shape changes on purpose. */
export const GRAPH_SCHEMA_VERSION = 2;

/** The exact five-column header SYSTEM.md's invariants table must carry, in order. */
const INVARIANT_HEADER = ['id', 'invariant', 'enforced by', 'test file', 'kind'];

/** The repository, so a decision entry's pull request links resolve. */
export const GITHUB_REPO_URL = 'https://github.com/midnightcatit/strideguide';

/** SYSTEM.md's two sections the map links into: the boundaries and the invariants. */
const SYSTEM_MD_BOUNDARIES = 'SYSTEM.md#boundaries-everyone-must-hold';
const SYSTEM_MD_INVARIANTS = 'SYSTEM.md#invariants';

/** The file every data-view table node points at. */
const SCHEMA_FILE = 'packages/shared/src/db/schema.ts';

/**
 * The last segment of a path, for a link label. A fragment is dropped, so a
 * file link shortened to its name never repeats the file itself.
 * @param {string} path
 * @returns {string}
 */
export function basename(path) {
	const withoutFragment = path.split('#')[0] ?? path;
	const parts = withoutFragment.split('/').filter((part) => part.length > 0);
	return parts[parts.length - 1] ?? path;
}

/**
 * @typedef {{ id: string, invariant: string, enforcedBy: string, testFile: string, kind: string }} InvariantRow
 * @typedef {{ id: string, title: string, body: string }} BoundaryBullet
 * @typedef {{ id: string, title: string, date: string, decided: string, why: string, rulesOut: string, anchor: string, href: string, pullRequests: GraphLink[] }} DecisionEntry
 * @typedef {{ name: string, varName: string }} SchemaTable
 * @typedef {{ from: string, to: string, column: string | null }} SchemaRef
 * @typedef {{ tables: SchemaTable[], refs: SchemaRef[] }} SchemaGraph
 * @typedef {{ id: string, label: string, kind?: string, computes: string, mayDecide: string, href: string, guardedBy?: string[] }} ModuleEntry
 * @typedef {{ label?: string, group?: string }} TableOverride
 * @typedef {{ kind: 'code' | 'test' | 'decision' | 'pr' | 'doc', label: string, href: string }} GraphLink
 * @typedef {{ id: string, label: string, kind: string, note?: string, links?: GraphLink[] }} GraphNode
 * @typedef {{ from: string, to: string, label?: string }} GraphEdge
 * @typedef {{ id: string, title: string, lede: string, layout: { engine: string, algorithm: string, direction: string, edgeRouting: string }, nodes: GraphNode[], edges: GraphEdge[] }} GraphView
 * @typedef {{ version: number, pipeline: GraphView, paths: GraphView, modules: ModuleEntry[], tableOverrides?: Record<string, TableOverride> }} AuthoredGraph
 * @typedef {{ version: number, generatedAt: string, fingerprint: string, views: GraphView[] }} SystemGraph
 */

/* ------------------------------- small helpers ------------------------------- */

/** A markdown table cell that is only an alignment rule, not data. */
/**
 * @param {string[]} line
 * @returns {boolean}
 */
function isSeparator(line) {
	return line.length > 0 && line.every((c) => /^:?-{2,}:?$/.test(c));
}

/** Split one markdown table line into trimmed cells, without the outer pipes. */
/**
 * @param {string} line
 * @returns {string[]}
 */
function cells(line) {
	return line
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((c) => c.trim().replace(/^`|`$/g, ''));
}

/**
 * The GitHub heading anchor for a title: lowercased, punctuation dropped, spaces
 * to hyphens. This is how a decision entry links back into docs/decisions.md.
 * @param {string} text
 * @returns {string}
 */
export function slugifyAnchor(text) {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s_-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/** Split text into paragraphs on blank lines, each with its lines joined by a space. */
/**
 * @param {string} text
 * @returns {string[]}
 */
function paragraphs(text) {
	return text
		.split(/\n\s*\n/)
		.map((p) => p.trim().replace(/\s+/g, ' '))
		.filter((p) => p.length > 0);
}

/* ------------------------------ SYSTEM.md parsers ------------------------------ */

/**
 * Parse SYSTEM.md's invariants table. Returns [] when the fixed header is absent,
 * so a missing table is visible rather than silently empty.
 * @param {string} md
 * @returns {InvariantRow[]}
 */
export function parseInvariantTable(md) {
	const lines = md.split('\n');
	const headerIdx = lines.findIndex((line) => {
		const c = cells(line).map((x) => x.toLowerCase());
		return c.length === INVARIANT_HEADER.length && INVARIANT_HEADER.every((h, i) => c[i] === h);
	});
	if (headerIdx === -1) return [];
	/** @type {InvariantRow[]} */
	const rows = [];
	for (let i = headerIdx + 1; i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (!line.trim().startsWith('|')) break;
		const c = cells(line);
		if (isSeparator(c) || c.length !== INVARIANT_HEADER.length) continue;
		rows.push({
			id: c[0] ?? '',
			invariant: c[1] ?? '',
			enforcedBy: c[2] ?? '',
			testFile: c[3] ?? '',
			kind: c[4] ?? '',
		});
	}
	return rows;
}

/**
 * Parse the bullets under SYSTEM.md's boundaries heading. Each bullet reads
 * "**Title.** body", and the body may wrap onto indented continuation lines, so
 * those are joined back onto it rather than dropped.
 * @param {string} md
 * @returns {BoundaryBullet[]}
 */
export function parseBoundaries(md) {
	const lines = md.split('\n');
	const start = lines.findIndex((line) => /^##\s+Boundaries\b/.test(line.trim()));
	if (start === -1) return [];
	/** @type {BoundaryBullet[]} */
	const out = [];
	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (/^##\s+/.test(line.trim())) break;
		const m = /^[-*]\s+\*\*(.+?)\*\*\s*([\s\S]*)$/.exec(line.trim());
		if (!m) continue;
		const title = (m[1] ?? '').trim().replace(/\.$/, '');
		let body = (m[2] ?? '').trim();
		// A wrapped body continues on indented lines until a blank, a heading or a bullet.
		let j = i + 1;
		for (; j < lines.length; j++) {
			const next = lines[j] ?? '';
			if (next.trim() === '' || /^##\s+/.test(next.trim()) || /^[-*]\s+/.test(next.trim())) break;
			if (!/^\s+\S/.test(next)) break;
			body = `${body} ${next.trim()}`.trim();
		}
		i = j - 1;
		out.push({ id: `boundary:${slugifyAnchor(title)}`, title, body });
	}
	return out;
}

/* --------------------------- docs/decisions.md parser --------------------------- */

/**
 * Every pull request a decision entry names, as one link each. The log writes them
 * as "PR #248" or "PR (#244)", so both forms are read, and a number named twice in
 * one entry is linked once.
 * @param {string} text
 * @returns {GraphLink[]}
 */
export function pullRequestLinks(text) {
	/** @type {Set<string>} */
	const seen = new Set();
	/** @type {GraphLink[]} */
	const links = [];
	const re = /\bPR\s*\(?#(\d+)\)?/g;
	/** @type {RegExpExecArray | null} */
	let m;
	while ((m = re.exec(text)) !== null) {
		const number = m[1] ?? '';
		if (number === '' || seen.has(number)) continue;
		seen.add(number);
		links.push({
			kind: 'pr',
			label: `PR #${number}`,
			href: `${GITHUB_REPO_URL}/pull/${number}`,
		});
	}
	return links;
}

/**
 * Parse the decision log. Each "## " section is an entry: a title, a date line,
 * then the Decided, Why and Rules out paragraphs.
 * @param {string} md
 * @returns {DecisionEntry[]}
 */
export function parseDecisionLog(md) {
	const lines = md.split('\n');
	/** @type {{ title: string, body: string[] }[]} */
	const sections = [];
	/** @type {{ title: string, body: string[] } | null} */
	let current = null;
	for (const line of lines) {
		const heading = /^##\s+(.+?)\s*$/.exec(line);
		if (heading) {
			current = { title: (heading[1] ?? '').trim(), body: [] };
			sections.push(current);
			continue;
		}
		if (current) current.body.push(line);
	}
	/** @type {DecisionEntry[]} */
	const out = [];
	for (const section of sections) {
		const raw = section.body.join('\n');
		// Drop the horizontal rule that separates entries from the paragraph text.
		const body = raw.replace(/^\s*---\s*$/gm, '').trim();
		const ps = paragraphs(body);
		const dateLine = ps.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p));
		const field = (/** @type {string} */ label) => {
			const found = ps.find((p) => p.startsWith(`${label}:`));
			return found ? found.slice(label.length + 1).trim() : '';
		};
		const anchor = slugifyAnchor(section.title);
		out.push({
			id: `decision:${anchor}`,
			title: section.title,
			date: dateLine ?? '',
			decided: field('Decided'),
			why: field('Why'),
			rulesOut: field('Rules out'),
			anchor,
			href: `docs/decisions.md#${anchor}`,
			pullRequests: pullRequestLinks(raw),
		});
	}
	return out;
}

/* ------------------------------ schema.ts parser ------------------------------ */

/** The local variable name and table name for each Drizzle table. */
/**
 * @param {string} text
 * @returns {{ varName: string, name: string, start: number }[]}
 */
function tableDeclarations(text) {
	const re = /export const (\w+)\s*=\s*sqliteTable\(\s*'([^']+)'/g;
	/** @type {{ varName: string, name: string, start: number }[]} */
	const out = [];
	/** @type {RegExpExecArray | null} */
	let m;
	while ((m = re.exec(text)) !== null) {
		out.push({ varName: m[1] ?? '', name: m[2] ?? '', start: m.index });
	}
	return out;
}

/**
 * Parse the Drizzle schema: each table, and each foreign-key reference it holds.
 * References are read from the table's own slice of the file, and mapped from the
 * local variable to the table name, so an edge points at a table, not a binding.
 * @param {string} text
 * @returns {SchemaGraph}
 */
export function parseSchema(text) {
	const decls = tableDeclarations(text);
	/** @type {Map<string, string>} */
	const varToName = new Map(decls.map((d) => [d.varName, d.name]));
	/** @type {SchemaTable[]} */
	const tables = decls.map((d) => ({ name: d.name, varName: d.varName }));
	/** @type {SchemaRef[]} */
	const refs = [];
	const columnRe = /(\w+)\s*[:=]\s*(?:text|integer|real)\(\s*'([^']+)'/g;
	for (let i = 0; i < decls.length; i++) {
		const decl = decls[i];
		if (!decl) continue;
		const end = i + 1 < decls.length ? (decls[i + 1]?.start ?? text.length) : text.length;
		const slice = text.slice(decl.start, end);
		const refRe = /\.references\(\s*\(\)\s*=>\s*(\w+)\./g;
		/** @type {RegExpExecArray | null} */
		let rm;
		while ((rm = refRe.exec(slice)) !== null) {
			const targetVar = rm[1] ?? '';
			// The nearest column defined before the reference is the foreign key.
			columnRe.lastIndex = 0;
			/** @type {string | null} */
			let column = null;
			/** @type {RegExpExecArray | null} */
			let cm;
			while ((cm = columnRe.exec(slice)) !== null) {
				if (cm.index < rm.index) column = cm[2] ?? null;
				else break;
			}
			refs.push({ from: decl.name, to: varToName.get(targetVar) ?? targetVar, column });
		}
	}
	return { tables, refs };
}

/* --------------------------------- view builders --------------------------------- */

/** Humanise a table name when the hand-kept override gives no label. */
/**
 * @param {string} name
 * @returns {string}
 */
export function humanizeTable(name) {
	return name
		.split('_')
		.map((word) => (word.length ? word.charAt(0).toUpperCase() + word.slice(1) : word))
		.join(' ');
}

/** The id for the test node a SYSTEM.md row names. */
/**
 * @param {InvariantRow} row
 * @returns {string}
 */
function testNodeId(row) {
	return `test:${row.testFile}#${slugifyAnchor(row.enforcedBy)}`;
}

/**
 * The invariant and test nodes, and the edge between them, that both the rules
 * view and the granular view draw. Kept in one place so the two views never
 * disagree about the SYSTEM.md half.
 * @param {InvariantRow[]} invariants
 * @returns {{ nodes: GraphNode[], edges: GraphEdge[] }}
 */
export function invariantTestNodes(invariants) {
	/** @type {GraphNode[]} */
	const nodes = [];
	/** @type {GraphEdge[]} */
	const edges = [];
	for (const row of invariants) {
		const tId = testNodeId(row);
		nodes.push({
			id: `inv:${row.id}`,
			label: row.invariant,
			kind: 'boundary',
			note: `Enforced by: ${row.enforcedBy} (${row.kind}).`,
			links: [
				{ kind: 'doc', label: 'SYSTEM.md', href: SYSTEM_MD_INVARIANTS },
				{ kind: 'test', label: basename(row.testFile), href: row.testFile },
				{
					kind: 'test',
					label: row.enforcedBy,
					href: `${row.testFile}#${slugifyAnchor(row.enforcedBy)}`,
				},
			],
		});
		nodes.push({
			id: tId,
			label: row.enforcedBy,
			kind: 'test',
			note: `Guards the invariant "${row.id}".`,
			links: [{ kind: 'test', label: basename(row.testFile), href: row.testFile }],
		});
		edges.push({ from: `inv:${row.id}`, to: tId, label: 'enforced by' });
	}
	return { nodes, edges };
}

/**
 * The rules view: SYSTEM.md's boundaries section plus its invariants table, each
 * invariant joined to the test that enforces it.
 * @param {{ boundaries: BoundaryBullet[], invariants: InvariantRow[] }} parsed
 * @returns {GraphView}
 */
export function buildRulesView(parsed) {
	const boundaryNodes = parsed.boundaries.map(
		/** @returns {GraphNode} */
		(b) => ({
			id: b.id,
			label: b.title,
			kind: 'boundary',
			note: b.body || undefined,
			links: [{ kind: 'doc', label: 'SYSTEM.md', href: SYSTEM_MD_BOUNDARIES }],
		}),
	);
	const { nodes, edges } = invariantTestNodes(parsed.invariants);
	return {
		id: 'rules',
		title: 'Rules and boundaries',
		lede: 'The boundaries everyone must hold, and every invariant with the test that keeps it true.',
		layout: { engine: 'elk', algorithm: 'layered', direction: 'TB', edgeRouting: 'POLYLINE' },
		nodes: [...boundaryNodes, ...nodes],
		edges,
	};
}

/**
 * The why view: each decision-log entry a node, hung off one root so the log has
 * a spine, newest first as the file is written.
 * @param {DecisionEntry[]} entries
 * @returns {GraphView}
 */
export function buildWhyView(entries) {
	/** @type {GraphNode[]} */
	const nodes = [
		{
			id: 'decision:log',
			label: 'Decision log',
			kind: 'module',
			note: 'Every settled decision and its why, newest first.',
			links: [{ kind: 'doc', label: 'decisions.md', href: 'docs/decisions.md' }],
		},
	];
	/** @type {GraphEdge[]} */
	const edges = [];
	for (const e of entries) {
		const note = [e.date, e.decided].filter((part) => part.length > 0).join('. ');
		nodes.push({
			id: e.id,
			label: e.title,
			kind: 'decision',
			note,
			links: [{ kind: 'decision', label: e.title, href: e.href }, ...e.pullRequests],
		});
		edges.push({ from: 'decision:log', to: e.id, label: e.date });
	}
	return {
		id: 'why',
		title: 'Why things are this way',
		lede: 'Each settled decision from the decision log, linked to its entry and its why.',
		layout: { engine: 'elk', algorithm: 'layered', direction: 'TB', edgeRouting: 'POLYLINE' },
		nodes,
		edges,
	};
}

/**
 * The data view: each table a node, each foreign-key reference an edge from the
 * table that holds it to the table it names.
 * @param {SchemaGraph} schema
 * @param {Record<string, TableOverride>} [overrides]
 * @returns {GraphView}
 */
export function buildDataView(schema, overrides) {
	const tableIds = new Set(schema.tables.map((t) => `table:${t.name}`));
	/** @type {GraphNode[]} */
	const nodes = schema.tables.map((t) => {
		const override = overrides?.[t.name];
		return {
			id: `table:${t.name}`,
			label: override?.label ?? humanizeTable(t.name),
			kind: 'data',
			note: override?.group,
			links: [{ kind: 'code', label: 'schema.ts', href: SCHEMA_FILE }],
		};
	});
	/** @type {GraphEdge[]} */
	const edges = schema.refs
		.filter((r) => tableIds.has(`table:${r.from}`) && tableIds.has(`table:${r.to}`))
		.map((r) => ({ from: `table:${r.from}`, to: `table:${r.to}`, label: r.column ?? undefined }));
	return {
		id: 'data',
		title: 'The data model',
		lede: 'Each stored table, and every foreign key drawn from the table that holds it to the table it names.',
		layout: { engine: 'elk', algorithm: 'layered', direction: 'LR', edgeRouting: 'POLYLINE' },
		nodes,
		edges,
	};
}

/**
 * The granular view: the SYSTEM.md invariant and test nodes, merged with the
 * hand-kept module map. A module links to each test that guards it.
 * @param {{ boundaries: BoundaryBullet[], invariants: InvariantRow[] }} parsed
 * @param {ModuleEntry[]} modules
 * @returns {GraphView}
 */
export function buildGranularView(parsed, modules) {
	const { nodes, edges } = invariantTestNodes(parsed.invariants);
	const moduleNodes = modules.map(
		/** @returns {GraphNode} */
		(m) => ({
			id: `module:${m.id}`,
			label: m.label,
			kind: m.kind ?? 'module',
			note: `Computes: ${m.computes} May decide: ${m.mayDecide}`,
			links: [
				{ kind: 'code', label: basename(m.href), href: m.href },
				...(m.guardedBy ?? []).map(
					/** @returns {GraphLink} */
					(testFile) => ({ kind: 'test', label: basename(testFile), href: testFile }),
				),
			],
		}),
	);
	/** @type {GraphEdge[]} */
	const moduleEdges = [];
	const testNodes = nodes.filter((n) => n.kind === 'test');
	for (const m of modules) {
		const guarded = new Set(m.guardedBy ?? []);
		if (!guarded.size) continue;
		for (const t of testNodes) {
			const guardedFile = t.links?.find((link) => link.kind === 'test')?.href;
			if (guardedFile && guarded.has(guardedFile)) {
				moduleEdges.push({ from: `module:${m.id}`, to: t.id, label: 'guarded by' });
			}
		}
	}
	return {
		id: 'granular',
		title: 'Module by module',
		lede: 'Each module, what it computes and may decide, wired to the invariants and tests that hold it.',
		layout: { engine: 'elk', algorithm: 'layered', direction: 'LR', edgeRouting: 'POLYLINE' },
		nodes: [...moduleNodes, ...nodes],
		edges: [...edges, ...moduleEdges],
	};
}

/* --------------------------------- the merge --------------------------------- */

/**
 * The fingerprint: a hash of the authored file, the generated sources and the
 * schema version, so the map changes when any input does and not otherwise.
 * @param {{ authoredRaw: string, sources: { systemMd: string, decisionsMd: string, schemaTs: string } }} input
 * @returns {string}
 */
export function computeFingerprint(input) {
	const hash = createHash('sha256');
	hash.update(String(GRAPH_SCHEMA_VERSION));
	hash.update('\n--- authored ---\n');
	hash.update(input.authoredRaw);
	hash.update('\n--- SYSTEM.md ---\n');
	hash.update(input.sources.systemMd);
	hash.update('\n--- decisions ---\n');
	hash.update(input.sources.decisionsMd);
	hash.update('\n--- schema ---\n');
	hash.update(input.sources.schemaTs);
	return hash.digest('hex').slice(0, 16);
}

/**
 * Build the whole graph from the authored views and the parsed sources. The
 * generatedAt is kept from an existing graph when the fingerprint is unchanged,
 * so running the generator twice on the same inputs leaves the file byte for
 * byte the same.
 * @param {{ authored: AuthoredGraph, authoredRaw: string, sources: { systemMd: string, decisionsMd: string, schemaTs: string }, existing?: { fingerprint?: string, generatedAt?: string } | null, now: string }} input
 * @returns {SystemGraph}
 */
export function buildSystemGraph(input) {
	const { authored, sources } = input;
	const parsed = {
		boundaries: parseBoundaries(sources.systemMd),
		invariants: parseInvariantTable(sources.systemMd),
	};
	const schema = parseSchema(sources.schemaTs);
	const fingerprint = computeFingerprint({ authoredRaw: input.authoredRaw, sources });
	const generatedAt =
		input.existing && input.existing.fingerprint === fingerprint && input.existing.generatedAt
			? input.existing.generatedAt
			: input.now;
	return {
		version: 1,
		generatedAt,
		fingerprint,
		views: [
			authored.pipeline,
			authored.paths,
			buildRulesView(parsed),
			buildWhyView(parseDecisionLog(sources.decisionsMd)),
			buildDataView(schema, authored.tableOverrides),
			buildGranularView(parsed, authored.modules),
		],
	};
}

/**
 * The serialised graph: stable, two-space JSON with a trailing newline, so the
 * file is reviewable and a no-op run produces identical bytes.
 * @param {SystemGraph} graph
 * @returns {string}
 */
export function serializeGraph(graph) {
	return `${JSON.stringify(graph, null, 2)}\n`;
}

/**
 * Check every view for duplicate node ids and edges that point at a missing
 * node, so a typo in the authored file fails the run instead of drawing a
 * dangling edge.
 * @param {SystemGraph} graph
 * @returns {string[]}
 */
export function validateGraph(graph) {
	/** @type {string[]} */
	const errors = [];
	for (const view of graph.views) {
		const ids = new Set();
		for (const node of view.nodes) {
			if (ids.has(node.id)) errors.push(`[${view.id}] duplicate node id: ${node.id}`);
			ids.add(node.id);
		}
		for (const edge of view.edges) {
			if (!ids.has(edge.from)) errors.push(`[${view.id}] edge from missing node: ${edge.from}`);
			if (!ids.has(edge.to)) errors.push(`[${view.id}] edge to missing node: ${edge.to}`);
		}
	}
	return errors;
}
