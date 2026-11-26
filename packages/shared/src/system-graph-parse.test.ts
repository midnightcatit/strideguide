import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	basename,
	buildDataView,
	buildGranularView,
	buildRulesView,
	buildSystemGraph,
	buildWhyView,
	computeFingerprint,
	GITHUB_REPO_URL,
	invariantTestNodes,
	parseBoundaries,
	parseDecisionLog,
	parseInvariantTable,
	parseSchema,
	pullRequestLinks,
	serializeGraph,
	slugifyAnchor,
	validateGraph,
} from './system-graph-parse.mjs';

/**
 * Tests for the system map's pure parsing and merge.
 *
 * The repo's own SYSTEM.md, docs/decisions.md and schema.ts are used as
 * fixtures where they are the real input, so the tests fail when a real source
 * changes shape; small inline fixtures cover the edges. There are no whole-JSON
 * snapshots: the assertions name the behaviour a regression would break.
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const systemMd = read('SYSTEM.md');
const decisionsMd = read('docs/decisions.md');
const schemaTs = read('packages/shared/src/db/schema.ts');
const authoredRaw = read('docs/system/graph.json');

describe('parseInvariantTable', () => {
	it('reads the real SYSTEM.md table', () => {
		const rows = parseInvariantTable(systemMd);
		expect(rows.length).toBeGreaterThanOrEqual(5);
		for (const row of rows) {
			expect(row.id).not.toBe('');
			expect(row.invariant).not.toBe('');
			expect(row.enforcedBy).not.toBe('');
			expect(row.testFile).toMatch(/\.test\.ts$/);
			expect(['hard', 'soft']).toContain(row.kind);
		}
	});

	it('ignores the alignment rule and stops at the first non-row', () => {
		const md = [
			'| id | invariant | enforced by | test file | kind |',
			'| --- | --- | --- | --- | --- |',
			'| one | a thing holds | keeps a thing | packages/shared/src/plan/engine.test.ts | hard |',
			'',
			'Some prose after the table.',
		].join('\n');
		const rows = parseInvariantTable(md);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.id).toBe('one');
	});

	it('returns nothing when the fixed header is absent', () => {
		expect(parseInvariantTable('# Title\n\nNo table here.')).toEqual([]);
	});
});

describe('parseBoundaries', () => {
	it('reads the real boundaries section, keeping wrapped body text', () => {
		const bullets = parseBoundaries(systemMd);
		expect(bullets.length).toBeGreaterThanOrEqual(5);
		const titles = bullets.map((b) => b.title);
		expect(titles).toContain('Units are presentation and the engine is unit-free');
		for (const bullet of bullets) {
			expect(bullet.id.startsWith('boundary:')).toBe(true);
			expect(bullet.title).not.toBe('');
		}
		// The body wraps onto an indented line, which is joined back on.
		const units = bullets.find((b) => b.title.startsWith('Units are presentation'));
		expect(units?.body).toContain('metric');
	});

	it('stops at the next heading', () => {
		const md = [
			'## Boundaries everyone must hold',
			'',
			'- **First one.** It means this.',
			'- **Second one.** It means that.',
			'',
			'## Invariants',
			'- **Not a boundary.**',
		].join('\n');
		const bullets = parseBoundaries(md);
		expect(bullets.map((b) => b.title)).toEqual(['First one', 'Second one']);
	});
});

describe('slugifyAnchor', () => {
	it('matches the way GitHub anchors a heading', () => {
		expect(
			slugifyAnchor(
				'The load model may ease or hold, never build, and an eased week dips its long run',
			),
		).toBe('the-load-model-may-ease-or-hold-never-build-and-an-eased-week-dips-its-long-run');
		expect(slugifyAnchor('Units are presentation; the engine is unit-free')).toBe(
			'units-are-presentation-the-engine-is-unit-free',
		);
	});
});

describe('parseDecisionLog', () => {
	it('reads every real entry with its fields', () => {
		const entries = parseDecisionLog(decisionsMd);
		expect(entries.length).toBeGreaterThanOrEqual(5);
		for (const entry of entries) {
			expect(entry.title).not.toBe('');
			expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(entry.decided).not.toBe('');
			expect(entry.why).not.toBe('');
			expect(entry.rulesOut).not.toBe('');
			expect(entry.href).toBe(`docs/decisions.md#${entry.anchor}`);
			expect(Array.isArray(entry.pullRequests)).toBe(true);
		}
		// At least one real entry names a pull request, and it links to that PR.
		const withPr = entries.find((entry) => entry.pullRequests.length > 0);
		expect(withPr).toBeDefined();
		expect(withPr?.pullRequests[0]?.href).toMatch(
			new RegExp(`^${GITHUB_REPO_URL}/pull/\\d+$`),
		);
		expect(withPr?.pullRequests[0]?.kind).toBe('pr');
	});

	it('parses a small fixture into decided, why and rules out', () => {
		const md = [
			'# Decision log',
			'',
			'---',
			'',
			'## Keep it simple',
			'',
			'2026-01-02',
			'',
			'Decided: we keep it simple. The code stays small.',
			'',
			'Why: a small system is easier to reason about (PR #123).',
			'',
			'Rules out: a second code path.',
			'',
			'---',
			'',
			'## Later one',
			'',
			'2025-12-01',
			'',
			'Decided: an older call.',
			'',
			'Why: it was fine then.',
			'',
			'Rules out: nothing.',
		].join('\n');
		const entries = parseDecisionLog(md);
		expect(entries).toHaveLength(2);
		expect(entries[0]?.title).toBe('Keep it simple');
		expect(entries[0]?.anchor).toBe('keep-it-simple');
		expect(entries[0]?.decided).toContain('we keep it simple');
		expect(entries[0]?.rulesOut).toBe('a second code path.');
		expect(entries[0]?.pullRequests).toEqual([
			{ kind: 'pr', label: 'PR #123', href: `${GITHUB_REPO_URL}/pull/123` },
		]);
		expect(entries[1]?.pullRequests).toEqual([]);
	});
});

describe('pullRequestLinks', () => {
	it('reads PR #n and PR (#n), links each once, and ignores anything else', () => {
		expect(pullRequestLinks('fixed by PR #248 and again in PR #248')).toEqual([
			{ kind: 'pr', label: 'PR #248', href: `${GITHUB_REPO_URL}/pull/248` },
		]);
		expect(pullRequestLinks('the first rubric PR (#244) was closed')).toEqual([
			{ kind: 'pr', label: 'PR #244', href: `${GITHUB_REPO_URL}/pull/244` },
		]);
		expect(pullRequestLinks('PR #238, PLAN.md section 12.1')).toEqual([
			{ kind: 'pr', label: 'PR #238', href: `${GITHUB_REPO_URL}/pull/238` },
		]);
		expect(pullRequestLinks('no pull request here, issue #12 aside')).toEqual([]);
	});
});

describe('basename', () => {
	it('takes the last path segment and drops a fragment', () => {
		expect(basename('packages/shared/src/plan/load.ts')).toBe('load.ts');
		expect(basename('apps/web/src/routes')).toBe('routes');
		expect(basename('packages/shared/src/plan/load.test.ts#keeps-a-thing')).toBe('load.test.ts');
	});
});

describe('parseSchema', () => {
	it('reads the real tables and foreign keys', () => {
		const schema = parseSchema(schemaTs);
		const names = schema.tables.map((t) => t.name);
		expect(names).toContain('users');
		expect(names).toContain('sessions_plan');
		expect(names.length).toBeGreaterThanOrEqual(20);

		// A plan names its goal, and an activity names the session it matched.
		expect(schema.refs).toContainEqual({ from: 'plans', to: 'user_goals', column: 'user_goal_id' });
		expect(schema.refs).toContainEqual({
			from: 'activities',
			to: 'sessions_plan',
			column: 'session_id',
		});
		// The local variable maps to the real table name.
		expect(schema.tables.find((t) => t.varName === 'sessionsPlan')?.name).toBe('sessions_plan');
	});

	it('reads tables and a reference out of a small fixture', () => {
		const ts = [
			"export const users = sqliteTable('users', { id: text('id').primaryKey() });",
			"export const notes = sqliteTable('notes', {",
			"  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),",
			'});',
		].join('\n');
		const schema = parseSchema(ts);
		expect(schema.tables.map((t) => t.name)).toEqual(['users', 'notes']);
		expect(schema.refs).toEqual([{ from: 'notes', to: 'users', column: 'author_id' }]);
	});
});

describe('the view builders', () => {
	it('joins each invariant to the test that enforces it', () => {
		const { nodes, edges } = invariantTestNodes([
			{
				id: 'one',
				invariant: 'a thing holds',
				enforcedBy: 'keeps a thing',
				testFile: 'packages/shared/src/plan/engine.test.ts',
				kind: 'hard',
			},
		]);
		expect(nodes.map((n) => n.kind).sort()).toEqual(['boundary', 'test']);
		// The invariant points at the SYSTEM.md section, its test file and the test.
		const invariant = nodes.find((n) => n.id === 'inv:one');
		expect(invariant?.links).toEqual([
			{ kind: 'doc', label: 'SYSTEM.md', href: 'SYSTEM.md#invariants' },
			{
				kind: 'test',
				label: 'engine.test.ts',
				href: 'packages/shared/src/plan/engine.test.ts',
			},
			{
				kind: 'test',
				label: 'keeps a thing',
				href: 'packages/shared/src/plan/engine.test.ts#keeps-a-thing',
			},
		]);
		// The test node points at its own test file.
		const test = nodes.find((n) => n.id.startsWith('test:'));
		expect(test?.links).toEqual([
			{
				kind: 'test',
				label: 'engine.test.ts',
				href: 'packages/shared/src/plan/engine.test.ts',
			},
		]);
		expect(edges).toEqual([
			{
				from: 'inv:one',
				to: 'test:packages/shared/src/plan/engine.test.ts#keeps-a-thing',
				label: 'enforced by',
			},
		]);
	});

	it('builds the rules view from boundaries and invariants', () => {
		const view = buildRulesView({
			boundaries: [{ id: 'boundary:one', title: 'One', body: 'It means this.' }],
			invariants: [
				{
					id: 'inv-one',
					invariant: 'a thing holds',
					enforcedBy: 'keeps a thing',
					testFile: 'apps/api/src/lib/coach-safety.test.ts',
					kind: 'hard',
				},
			],
		});
		expect(view.id).toBe('rules');
		expect(view.layout.direction).toBe('TB');
		expect(view.nodes.filter((n) => n.kind === 'boundary')).toHaveLength(2);
		expect(view.nodes.filter((n) => n.kind === 'test')).toHaveLength(1);
		expect(view.nodes.find((n) => n.id === 'boundary:one')?.links).toEqual([
			{ kind: 'doc', label: 'SYSTEM.md', href: 'SYSTEM.md#boundaries-everyone-must-hold' },
		]);
		expect(view.edges).toHaveLength(1);
	});

	it('hangs every decision off one root in the why view', () => {
		const view = buildWhyView([
			{
				id: 'decision:one',
				title: 'One',
				date: '2026-01-01',
				decided: 'We did it.',
				why: 'It was right.',
				rulesOut: 'The other.',
				anchor: 'one',
				href: 'docs/decisions.md#one',
				pullRequests: [
					{ kind: 'pr', label: 'PR #42', href: `${GITHUB_REPO_URL}/pull/42` },
				],
			},
		]);
		expect(view.id).toBe('why');
		expect(view.nodes.find((n) => n.id === 'decision:log')?.links).toEqual([
			{ kind: 'doc', label: 'decisions.md', href: 'docs/decisions.md' },
		]);
		// A why node links to its decision-log anchor and the pull request it names.
		expect(view.nodes.find((n) => n.id === 'decision:one')?.links).toEqual([
			{ kind: 'decision', label: 'One', href: 'docs/decisions.md#one' },
			{ kind: 'pr', label: 'PR #42', href: `${GITHUB_REPO_URL}/pull/42` },
		]);
		expect(view.edges).toEqual([{ from: 'decision:log', to: 'decision:one', label: '2026-01-01' }]);
	});

	it('uses the table override for a terse table and drops references to unknown tables', () => {
		const view = buildDataView(
			{
				tables: [
					{ name: 'users', varName: 'users' },
					{ name: 'ai_jobs', varName: 'aiJobs' },
				],
				refs: [
					{ from: 'ai_jobs', to: 'users', column: 'user_id' },
					{ from: 'ai_jobs', to: 'ghost', column: 'ghost_id' },
				],
			},
			{ ai_jobs: { label: 'AI jobs', group: 'Content and AI' } },
		);
		expect(view.id).toBe('data');
		expect(view.layout.direction).toBe('LR');
		expect(view.nodes.find((n) => n.id === 'table:ai_jobs')?.label).toBe('AI jobs');
		expect(view.nodes.find((n) => n.id === 'table:ai_jobs')?.note).toBe('Content and AI');
		expect(view.nodes.find((n) => n.id === 'table:ai_jobs')?.links).toEqual([
			{ kind: 'code', label: 'schema.ts', href: 'packages/shared/src/db/schema.ts' },
		]);
		expect(view.edges).toEqual([{ from: 'table:ai_jobs', to: 'table:users', label: 'user_id' }]);
	});

	it('links a module to the tests that guard it in the granular view', () => {
		const view = buildGranularView(
			{
				boundaries: [],
				invariants: [
					{
						id: 'one',
						invariant: 'a thing holds',
						enforcedBy: 'keeps a thing',
						testFile: 'packages/shared/src/plan/load.test.ts',
						kind: 'hard',
					},
				],
			},
			[
				{
					id: 'load',
					label: 'Load model',
					computes: 'the curves',
					mayDecide: 'to ease or hold',
					href: 'packages/shared/src/plan/load.ts',
					guardedBy: ['packages/shared/src/plan/load.test.ts'],
				},
			],
		);
		expect(view.id).toBe('granular');
		expect(view.nodes.filter((n) => n.kind === 'module')).toHaveLength(1);
		// A module node links to its code and each test that guards it.
		expect(view.nodes.find((n) => n.id === 'module:load')?.links).toEqual([
			{ kind: 'code', label: 'load.ts', href: 'packages/shared/src/plan/load.ts' },
			{ kind: 'test', label: 'load.test.ts', href: 'packages/shared/src/plan/load.test.ts' },
		]);
		expect(view.edges).toContainEqual({
			from: 'module:load',
			to: 'test:packages/shared/src/plan/load.test.ts#keeps-a-thing',
			label: 'guarded by',
		});
	});
});

describe('the merge', () => {
	const authored = JSON.parse(authoredRaw);
	const sources = { systemMd, decisionsMd, schemaTs };

	it('builds all six views from the real sources with no dangling edges', () => {
		const graph = buildSystemGraph({
			authored,
			authoredRaw,
			sources,
			existing: null,
			now: '2026-01-01T00:00:00.000Z',
		});
		expect(graph.version).toBe(1);
		expect(graph.views.map((v) => v.id)).toEqual([
			'pipeline',
			'paths',
			'rules',
			'why',
			'data',
			'granular',
		]);
		for (const view of graph.views) {
			expect(view.layout.engine).toBe('elk');
			expect(view.layout.edgeRouting).toBe('POLYLINE');
			for (const node of view.nodes) {
				expect([
					'stage',
					'module',
					'boundary',
					'decision',
					'data',
					'route',
					'test',
					'trigger',
				]).toContain(node.kind);
				for (const link of node.links ?? []) {
					expect(['code', 'test', 'decision', 'pr', 'doc']).toContain(link.kind);
					expect(link.label).not.toBe('');
					expect(link.href).not.toBe('');
				}
			}
		}
		expect(validateGraph(graph)).toEqual([]);
	});

	it('keeps the timestamp when the inputs are unchanged and bumps it when they change', () => {
		const first = buildSystemGraph({
			authored,
			authoredRaw,
			sources,
			existing: null,
			now: '2026-01-01T00:00:00.000Z',
		});
		const second = buildSystemGraph({
			authored,
			authoredRaw,
			sources,
			existing: first,
			now: '2026-02-02T00:00:00.000Z',
		});
		expect(second.fingerprint).toBe(first.fingerprint);
		expect(second.generatedAt).toBe('2026-01-01T00:00:00.000Z');

		const changed = buildSystemGraph({
			authored,
			authoredRaw,
			sources: { ...sources, systemMd: `${systemMd}\n\nchanged` },
			existing: first,
			now: '2026-02-02T00:00:00.000Z',
		});
		expect(changed.fingerprint).not.toBe(first.fingerprint);
		expect(changed.generatedAt).toBe('2026-02-02T00:00:00.000Z');
	});

	it('makes the fingerprint from the authored file, the sources and the schema version', () => {
		const base = computeFingerprint({ authoredRaw, sources });
		expect(base).toMatch(/^[0-9a-f]{16}$/);
		expect(computeFingerprint({ authoredRaw: `${authoredRaw} `, sources })).not.toBe(base);
		expect(computeFingerprint({ authoredRaw, sources: { ...sources, schemaTs: 'x' } })).not.toBe(
			base,
		);
	});

	it('serialises to stable JSON that round-trips', () => {
		const graph = buildSystemGraph({
			authored,
			authoredRaw,
			sources,
			existing: null,
			now: '2026-01-01T00:00:00.000Z',
		});
		const text = serializeGraph(graph);
		expect(text.endsWith('\n')).toBe(true);
		expect(JSON.parse(text)).toEqual(graph);
	});
});
