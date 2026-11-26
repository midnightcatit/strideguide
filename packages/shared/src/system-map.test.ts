import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The SYSTEM.md invariants guard.
 *
 * SYSTEM.md carries a machine-readable table of the invariants the system must
 * hold, each naming the exact test that enforces it. This check reads that table
 * and proves the guard still exists: the named test is present in its file, and it
 * has not been skipped or turned into an expected failure. It is the thing that
 * fails when an invariant is quietly dropped, which nearly happened when three
 * plan bugs were briefly recorded as expected failures instead of fixed.
 *
 * It is a test on purpose: it runs inside the existing gate with everything else,
 * so a PR that removes a listed test cannot go green.
 */

/** The repo root: this file lives at packages/shared/src/system-map.test.ts. */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SYSTEM_MD = join(ROOT, 'SYSTEM.md');

/** The exact header the invariant table must carry, in order. */
const HEADER = ['id', 'invariant', 'enforced by', 'test file', 'kind'];

interface InvariantRow {
	id: string;
	invariant: string;
	enforcedBy: string;
	testFile: string;
	kind: string;
}

interface FoundTest {
	name: string;
	/** True when the test is skipped, a todo, or marked as an expected failure. */
	skipped: boolean;
	/** Why it is skipped, for the failure message. Empty for a real, running test. */
	reason: string;
}

/** Directories that never hold the repo's own tests. */
const SKIP_DIRS = new Set([
	'node_modules',
	'.git',
	'dist',
	'build',
	'.svelte-kit',
	'.wrangler',
	'coverage',
]);

/** A cell that is only a markdown alignment rule, not data. */
function isSeparator(cells: string[]): boolean {
	return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

/** Split one markdown table line into trimmed cells, without the outer pipes. */
function cells(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((c) => c.trim().replace(/^`|`$/g, ''));
}

/** Parse the invariants table out of the SYSTEM.md body. */
export function parseInvariantTable(md: string): InvariantRow[] {
	const lines = md.split('\n');
	const headerIdx = lines.findIndex((line) => {
		const c = cells(line).map((x) => x.toLowerCase());
		return c.length === HEADER.length && HEADER.every((h, i) => c[i] === h);
	});
	if (headerIdx === -1) return [];
	const rows: InvariantRow[] = [];
	for (let i = headerIdx + 1; i < lines.length; i++) {
		const line = lines[i]!;
		if (!line.trim().startsWith('|')) break;
		const c = cells(line);
		if (isSeparator(c) || c.length !== HEADER.length) continue;
		rows.push({
			id: c[0]!,
			invariant: c[1]!,
			enforcedBy: c[2]!,
			testFile: c[3]!,
			kind: c[4]!,
		});
	}
	return rows;
}

/** Walk the repo for test files. */
function testFiles(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (SKIP_DIRS.has(name)) continue;
		const path = join(dir, name);
		const st = statSync(path);
		if (st.isDirectory()) testFiles(path, out);
		else if (/\.test\.tsx?$/.test(name)) out.push(path);
	}
	return out;
}

/** Advance past a string literal that starts at `start`, and return the close quote index. */
function skipString(text: string, start: number, quote: string): number {
	for (let i = start + 1; i < text.length; i++) {
		if (text[i] === '\\') {
			i++;
			continue;
		}
		if (text[i] === quote) return i;
	}
	return text.length - 1;
}

/** Match the brace that closes the block opened at `open`, skipping strings and comments. */
function matchBrace(text: string, open: number): number {
	let depth = 0;
	for (let i = open; i < text.length; i++) {
		const ch = text[i];
		const next = text[i + 1];
		if (ch === '/' && next === '/') {
			const nl = text.indexOf('\n', i);
			if (nl === -1) break;
			i = nl;
			continue;
		}
		if (ch === '/' && next === '*') {
			const end = text.indexOf('*/', i + 2);
			if (end === -1) break;
			i = end + 1;
			continue;
		}
		if (ch === "'" || ch === '"' || ch === '`') {
			i = skipString(text, i, ch);
			continue;
		}
		if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return text.length;
}

/** The character spans of `describe.skip`, `describe.fails` and `xdescribe` blocks. */
function skippedDescribeRanges(text: string): [number, number][] {
	const ranges: [number, number][] = [];
	const re = /(?:describe\s*\.\s*(?:skip|fails)|xdescribe)\s*\(/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const open = text.indexOf('{', m.index);
		if (open === -1) continue;
		ranges.push([m.index, matchBrace(text, open)]);
	}
	return ranges;
}

/**
 * Every named test in a file, with whether it is skipped. A test must begin its
 * own line (allowing indentation), which is how they are written, so an `it(` in
 * prose or a comment is not mistaken for a declaration.
 */
export function findTests(text: string): FoundTest[] {
	const ranges = skippedDescribeRanges(text);
	const inSkippedDescribe = (idx: number) => ranges.some(([a, b]) => idx >= a && idx <= b);
	const out: FoundTest[] = [];

	const declared =
		/^[ \t]*(it|test)((?:\s*\.\s*[A-Za-z]+)*)\s*\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/gmu;
	let m: RegExpExecArray | null;
	while ((m = declared.exec(text)) !== null) {
		const name = m[3] ?? m[4] ?? m[5] ?? '';
		const chain = (m[2] ?? '').replace(/[\s.]/g, '').toLowerCase();
		let reason = '';
		if (chain.includes('skip')) reason = 'it.skip';
		else if (chain.includes('fails')) reason = 'it.fails (an expected failure)';
		else if (chain.includes('todo')) reason = 'it.todo';
		else if (inSkippedDescribe(m.index)) reason = 'inside a skipped describe block';
		out.push({ name, skipped: reason !== '', reason });
	}

	// The legacy x-prefixed forms declare a skipped or expected-failure test.
	const legacy = /^[ \t]*(xit|xtest)\s*\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/gmu;
	while ((m = legacy.exec(text)) !== null) {
		const name = m[2] ?? m[3] ?? '';
		const reason = inSkippedDescribe(m.index)
			? 'inside a skipped describe block'
			: m[1] === 'xit'
				? 'xit'
				: 'xtest';
		out.push({ name, skipped: true, reason });
	}

	return out;
}

/** Find a test by exact name within one file, reading each file at most once. */
function findTest(file: string, name: string, cache: Map<string, FoundTest[]>): FoundTest | undefined {
	let tests = cache.get(file);
	if (!tests) {
		tests = findTests(readFileSync(file, 'utf8'));
		cache.set(file, tests);
	}
	return tests.find((t) => t.name.trim() === name.trim());
}

describe('SYSTEM.md invariants table stays true', () => {
	const md = readFileSync(SYSTEM_MD, 'utf8');
	const rows = parseInvariantTable(md);

	it('parses a well-formed invariants table', () => {
		expect(rows.length, 'SYSTEM.md carries no invariant rows, or its header is not the fixed five columns').toBeGreaterThanOrEqual(5);
		for (const row of rows) {
			expect(row.id, 'an invariant row has no id').not.toBe('');
			expect(row.invariant, `invariant ${row.id} has no description`).not.toBe('');
			expect(row.enforcedBy, `invariant ${row.id} names no enforcing test`).not.toBe('');
			expect(row.testFile, `invariant ${row.id} names no test file`).not.toBe('');
			expect(['hard', 'soft'], `invariant ${row.id} has kind "${row.kind}", expected hard or soft`).toContain(row.kind);
		}
	});

	it('names only tests that exist and still run (not skipped, not expected failures)', () => {
		expect(rows.length, 'no invariant rows to check').toBeGreaterThan(0);
		const cache = new Map<string, FoundTest[]>();
		const failures: string[] = [];

		for (const row of rows) {
			const file = resolve(ROOT, row.testFile);
			if (!existsSync(file)) {
				failures.push(`[${row.id}] test file not found: ${row.testFile}`);
				continue;
			}
			const found = findTest(file, row.enforcedBy, cache);
			if (!found) {
				failures.push(
					`[${row.id}] no test named "${row.enforcedBy}" in ${row.testFile}. It was renamed or removed.`,
				);
				continue;
			}
			if (found.skipped) {
				failures.push(
					`[${row.id}] "${row.enforcedBy}" in ${row.testFile} is ${found.reason}. An invariant may not be recorded as skipped or as an expected failure.`,
				);
			}
		}

		expect(
			failures,
			`SYSTEM.md lists invariants whose guard is no longer running:\n${failures.join('\n')}`,
		).toEqual([]);
	});
});
