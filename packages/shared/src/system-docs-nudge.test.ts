import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The system-doc nudge guard.
 *
 * scripts/check-system-docs.sh fails a pull request that changes a rule-carrying
 * part of the system without also touching SYSTEM.md or docs/decisions.md. This
 * check runs the script itself over a path that must trip it and a path that must
 * not, so its path list cannot be emptied or broken without the gate going red.
 * It is a test on purpose: it runs inside the existing gate with everything else,
 * like the SYSTEM.md invariants check next to it, rather than being something to
 * remember to run by hand.
 */

/** The repo root: this file lives at packages/shared/src/system-docs-nudge.test.ts. */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SCRIPT = fileURLToPath(new URL('../../../scripts/check-system-docs.sh', import.meta.url));

interface NudgeResult {
	status: number;
	stdout: string;
	stderr: string;
}

/** Run the nudge over a set of changed paths, from the repo root, and read its exit. */
function runNudge(changed: string[], labels = ''): NudgeResult {
	const res = spawnSync('bash', [SCRIPT], {
		cwd: ROOT,
		input: changed.join('\n'),
		encoding: 'utf8',
		env: { ...process.env, PR_LABELS: labels },
	});
	return { status: res.status ?? -1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

describe('the system-doc nudge guards the rule-carrying paths', () => {
	it('fails a change to a path that carries a rule, naming the path and a document', () => {
		const res = runNudge(['apps/api/src/lib/session-why.ts']);
		expect(res.status).toBe(1);
		expect(res.stderr).toContain('apps/api/src/lib/session-why.ts');
		expect(res.stderr).toMatch(/SYSTEM\.md|docs\/decisions\.md/);
	});

	it('passes a change to a path that carries no rule', () => {
		const res = runNudge(['apps/web/src/lib/components/ConnectNudge.svelte']);
		expect(res.status).toBe(0);
	});

	it('trips on each AI path that carries a rule', () => {
		for (const path of [
			'apps/api/src/lib/plan-shape.ts',
			'packages/shared/src/plan/why.ts',
			'packages/shared/src/plan/why-rephrase.ts',
			'apps/api/src/lib/session-why.ts',
		]) {
			const res = runNudge([path]);
			expect(res.status, `${path} should trip the nudge`).toBe(1);
			expect(res.stderr).toContain(path);
		}
	});

	it('trips on the system graph paths', () => {
		for (const path of ['docs/system/graph.json', 'packages/shared/src/system-graph.ts']) {
			const res = runNudge([path]);
			expect(res.status, `${path} should trip the nudge`).toBe(1);
			expect(res.stderr).toContain(path);
		}
	});

	it('passes a change to the generated graph output, which is derived', () => {
		const res = runNudge(['docs/system/graph.generated.json']);
		expect(res.status).toBe(0);
	});

	it('passes when a guarded path is changed together with SYSTEM.md', () => {
		const res = runNudge(['apps/api/src/lib/session-why.ts', 'SYSTEM.md']);
		expect(res.status).toBe(0);
	});

	it('still waives on the no-system-change label', () => {
		const res = runNudge(['apps/api/src/lib/session-why.ts'], 'no-system-change');
		expect(res.status).toBe(0);
	});
});
