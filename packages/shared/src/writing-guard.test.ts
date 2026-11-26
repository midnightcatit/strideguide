import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The writing-rules guard.
 *
 * Every path where a model writes text a person reads must put WRITING_RULES in
 * the prompt it sends and run the reply through sanitizeText before it is stored
 * or shown (AGENTS.md, SYSTEM.md). Those two things are cheap to forget when a
 * new path is added, so this check finds every prose model call in the repo and
 * fails the build when one is missing them.
 *
 * It is a test on purpose: it runs inside the existing gate with everything
 * else, like the SYSTEM.md invariants check next to it, rather than being
 * something to remember to run by hand.
 *
 * How it works. The one thing that asks a model for prose is the chat router
 * `runAi` in apps/api. Jev (`decideChoice`, the coach safety classifier and the
 * plan-change pipeline) returns typed choices and never prose, so it is out of
 * scope. The check walks the source, takes every file that CALLS `runAi`, and
 * requires each to interpolate the rules into a prompt and to run the sanitizer,
 * in the file itself or in a prompt builder it imports by name. A new file that
 * calls `runAi` without either fails here, and the failure names the file.
 *
 * What it would miss, so the limit is written down:
 *   - A path that reaches a model without going through `runAi`, such as a
 *     direct provider fetch. There is none today; a new one would not be seen.
 *   - A path that builds its prompt through `import * as` or a builder reached
 *     indirectly, so the scan cannot tie the prompt back to a named import. It
 *     checks the marker is present, not that the reply is used correctly.
 *   - A path that imports any symbol from a module which itself carries the
 *     rules (for example another export of why-rephrase.ts). The marker is found
 *     in the imported module and the path is treated as covered.
 */

/** The repo root: this file lives at packages/shared/src/writing-guard.test.ts. */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Directories that never hold the repo's own source. */
const SKIP_DIRS = new Set([
	'node_modules',
	'.git',
	'dist',
	'build',
	'.svelte-kit',
	'.wrangler',
	'coverage',
]);

/** The rules must be interpolated into a prompt, not merely imported. */
const RULES_IN_PROMPT = /\$\{\s*WRITING_RULES\s*\}|writingSystemPrompt\s*\(/;
/** Model text must be cleaned before it is stored or shown. */
const SANITIZER = /\bsanitizeText\s*\(/;
/** A call to the prose router. Matches the definition line too, which is filtered. */
const RUN_AI_CALL = /\brunAi\s*\(/;
/** The router's own definition, which is not a call site to guard. */
const RUN_AI_DEF = /export\s+(?:async\s+)?function\s+runAi\b/;

export interface SourceFile {
	/** Repo-relative path, with forward slashes. */
	path: string;
	text: string;
}

/** Walk `dir` for non-test .ts files, skipping build and dependency directories. */
function walk(dir: string, out: string[]): string[] {
	for (const name of readdirSync(dir)) {
		if (SKIP_DIRS.has(name)) continue;
		const path = join(dir, name);
		const st = statSync(path);
		if (st.isDirectory()) walk(path, out);
		else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(path);
	}
	return out;
}

/** Every source file the guard reads, as repo-relative paths with their text. */
export function repoFiles(): SourceFile[] {
	const paths = [...walk(join(ROOT, 'apps'), []), ...walk(join(ROOT, 'packages'), [])];
	return paths.map((p) => ({
		path: relative(ROOT, p).split(sep).join('/'),
		text: readFileSync(p, 'utf8'),
	}));
}

/** The files that call the prose router, excluding the router's own definition. */
export function proseSites(files: SourceFile[]): string[] {
	return files
		.filter((f) => RUN_AI_CALL.test(f.text) && !RUN_AI_DEF.test(f.text))
		.map((f) => f.path);
}

/**
 * The names one file imports by value, so a builder it calls can be checked.
 * Type-only imports are dropped: a type cannot build a prompt. A namespace
 * import is not readable here, which is one of the documented gaps.
 */
function valueImports(text: string): string[] {
	const names: string[] = [];
	const re = /import\s+([^;]+?)\s+from\s+['"][^'"]+['"]/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const clause = (m[1] ?? '').trim();
		if (/^type\b/.test(clause)) continue;
		const brace = clause.match(/\{([\s\S]*)\}/);
		if (!brace) continue;
		for (const raw of (brace[1] ?? '').split(',')) {
			const part = raw.trim();
			if (!part || /^type\b/.test(part)) continue;
			const name = part.split(/\s+as\s+/)[0]!.trim();
			if (/^[A-Za-z_$][\w$]*$/.test(name)) names.push(name);
		}
	}
	return names;
}

/** A map of every exported name to the files that declare it, for delegation. */
function definitions(files: SourceFile[]): Map<string, string[]> {
	const index = new Map<string, string[]>();
	const re = /export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g;
	for (const file of files) {
		let m: RegExpExecArray | null;
		while ((m = re.exec(file.text)) !== null) {
			const name = m[1]!;
			const list = index.get(name) ?? [];
			list.push(file.path);
			index.set(name, list);
		}
	}
	return index;
}

/**
 * Audit a set of source files. Returns the path of each prose file that does not
 * carry both the rules and the sanitizer, in the file itself or in a prompt
 * builder it imports by name. An empty result means every prose path is covered.
 */
export function audit(files: SourceFile[]): string[] {
	const byPath = new Map(files.map((f) => [f.path, f]));
	const declared = definitions(files);
	const missing: string[] = [];

	for (const file of files) {
		if (!RUN_AI_CALL.test(file.text) || RUN_AI_DEF.test(file.text)) continue;

		let hasRules = RULES_IN_PROMPT.test(file.text);
		let hasSanitizer = SANITIZER.test(file.text);

		if (!hasRules || !hasSanitizer) {
			for (const name of valueImports(file.text)) {
				for (const defPath of declared.get(name) ?? []) {
					const def = byPath.get(defPath);
					if (!def) continue;
					if (!hasRules && RULES_IN_PROMPT.test(def.text)) hasRules = true;
					if (!hasSanitizer && SANITIZER.test(def.text)) hasSanitizer = true;
				}
			}
		}

		if (!hasRules || !hasSanitizer) missing.push(file.path);
	}

	return missing;
}

describe('the writing-rules guard covers every prose path', () => {
	it('fails a prose path whose prompt omits the writing rules or the sanitizer', () => {
		// The real repo. If a path is missing either, this fails and names it.
		const files = repoFiles();
		const sites = proseSites(files);
		expect(
			sites.length,
			'no prose call sites found: the scan walked nothing, so it guards nothing',
		).toBeGreaterThanOrEqual(5);
		expect(
			audit(files),
			'a prose model path is missing the writing rules or the sanitizer',
		).toEqual([]);

		// A fresh prose file that omits both must be caught, so the guard is shown
		// to fail on exactly the mistake it exists to stop.
		const bad: SourceFile[] = [
			{ path: 'apps/api/src/lib/ai.ts', text: 'export async function runAi() {}\n' },
			{
				path: 'apps/api/src/lib/new-prose.ts',
				text: "import { runAi } from './ai';\nawait runAi(env, [{ role: 'system', content: 'You are a coach.' }]);\n",
			},
		];
		expect(audit(bad)).toEqual(['apps/api/src/lib/new-prose.ts']);

		// The same file with the rules in the prompt and the sanitizer run passes.
		const good: SourceFile[] = [
			{ path: 'apps/api/src/lib/ai.ts', text: 'export async function runAi() {}\n' },
			{
				path: 'apps/api/src/lib/new-prose.ts',
				text:
					"import { runAi } from './ai';\n" +
					"const system = '${WRITING_RULES}\\n\\nYou are a coach.';\n" +
					"const reply = sanitizeText('ok');\n" +
					'await runAi(env, [{ role: \'system\', content: system }]);\n',
			},
		];
		expect(audit(good)).toEqual([]);

		// A prose file that delegates to a named builder carries both through it,
		// which is how apps/api/src/lib/session-why.ts reaches the shared builder.
		const delegated: SourceFile[] = [
			{
				path: 'packages/shared/src/plan/why-rephrase.ts',
				text:
					'export function buildWhyRephrasePrompt() {\n' +
					"	return `${WRITING_RULES}\n\nReword the notes.`;\n" +
					'}\n' +
					'export function gateReason(candidate) {\n' +
					'	return sanitizeText(candidate);\n' +
					'}\n',
			},
			{
				path: 'apps/api/src/lib/new-prose.ts',
				text:
					"import { buildWhyRephrasePrompt, gateReason } from '@strideguide/shared/plan';\n" +
					"import { runAi } from './ai';\n" +
					'const { system, user } = buildWhyRephrasePrompt();\n' +
					'gateReason(system);\n' +
					"await runAi(env, [{ role: 'system', content: system }, { role: 'user', content: user }]);\n",
			},
		];
		expect(audit(delegated)).toEqual([]);
	});
});
