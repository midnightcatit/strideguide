import { eq, inArray } from 'drizzle-orm';
import {
	buildWhyRephrasePrompt,
	gateWhyDetail,
	parseWhyRephraseReply,
	type WhyRejectReason,
	type WhyRephraseInput,
} from '@strideguide/shared/plan';
import type { SessionWhy } from '@strideguide/shared';
import { schema } from '../db';
import type { Db } from '../db';
import type { Env } from '../env';
import { runAi, type AiMessage } from './ai';

/**
 * The session-reason rewording pass, on the API side. It builds a model request
 * for the sessions in a plan, runs it through the shared chat model, and hands
 * each reply to the pure gate in @strideguide/shared/plan. Every failure (no key,
 * a timeout, an unusable reply) leaves those lines on their deterministic reason.
 *
 * The sessions go to the model in batches, not as one call. A plan can hold well
 * over a hundred sessions, and a single reply for all of them runs past the
 * model's output cap, comes back cut off before the closing bracket, and reads
 * as no reply at all. A batch keeps each reply small enough to finish.
 */

/** Sessions per model call, chosen so a full reply stays well inside maxTokens. */
export const WHY_BATCH_SIZE = 40;

/** Token budget: a short line per session, with headroom for the JSON frame. */
function tokenBudget(sessions: number): number {
	return Math.min(6000, 300 + sessions * 90);
}

/** Keep IN(...) statements under D1's bound-parameter cap. */
function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

/** What one batch of the pass did, so the whole run can be judged. */
interface BatchReport {
	/** Set when the batch never reached the gate: the model failed or its reply did not read. */
	failed?: 'model' | 'parse';
	/** Lines the model handed back unchanged. */
	unchanged: number;
	/** Lines a gate rule rejected, one entry each. */
	rejects: WhyRejectReason[];
}

/** The whole pass's result: one entry per input, plus what happened to the rest. */
export interface WhyPassReport {
	/** One entry per input, in order; undefined when nothing was kept for it. */
	results: (SessionWhy | undefined)[];
	sessions: number;
	batches: number;
	modelErrors: number;
	parseErrors: number;
	/** Lines the model returned unchanged across all batches. */
	unchanged: number;
	/** Lines a gate rule rejected, counted by rule. */
	rejects: Record<string, number>;
	accepted: number;
}

/** Reword one batch and gate every line, reporting what the batch did. */
async function rephraseBatch(
	env: Env,
	inputs: WhyRephraseInput[],
): Promise<{ results: (SessionWhy | undefined)[]; report: BatchReport }> {
	const report: BatchReport = { unchanged: 0, rejects: [] };
	const { system, user } = buildWhyRephrasePrompt(inputs);
	const messages: AiMessage[] = [
		{ role: 'system', content: system },
		{ role: 'user', content: user },
	];
	try {
		const res = await runAi(env, messages, {
			maxTokens: tokenBudget(inputs.length),
			timeoutMs: 20000,
		});
		const reply = parseWhyRephraseReply(res.text);
		if (!reply) {
			report.failed = 'parse';
			return { results: inputs.map(() => undefined), report };
		}
		const results = inputs.map((input, i) => {
			const row = reply[i];
			if (!row) return undefined;
			const verdict = gateWhyDetail(input.reason, row);
			report.unchanged += verdict.unchanged;
			for (const r of verdict.rejected) report.rejects.push(r.reason);
			return verdict.why;
		});
		return { results, report };
	} catch {
		report.failed = 'model';
		return { results: inputs.map(() => undefined), report };
	}
}

/**
 * Reword every session's reason, in batches, and report the whole run. Returns
 * one accepted reason per input, in order, where each is undefined when the
 * session had nothing to reword or its line was not kept.
 */
export async function rephraseSessionWhysDetailed(
	env: Env,
	inputs: WhyRephraseInput[],
): Promise<WhyPassReport> {
	const batches = chunk(inputs, WHY_BATCH_SIZE);
	const results: (SessionWhy | undefined)[] = [];
	const rejects: Record<string, number> = {};
	const report: WhyPassReport = {
		results,
		sessions: inputs.length,
		batches: batches.length,
		modelErrors: 0,
		parseErrors: 0,
		unchanged: 0,
		rejects,
		accepted: 0,
	};
	for (const part of batches) {
		const out = await rephraseBatch(env, part);
		if (out.report.failed === 'model') report.modelErrors++;
		else if (out.report.failed === 'parse') report.parseErrors++;
		report.unchanged += out.report.unchanged;
		for (const r of out.report.rejects) rejects[r] = (rejects[r] ?? 0) + 1;
		results.push(...out.results);
	}
	report.accepted = results.filter((r): r is SessionWhy => !!r).length;
	return report;
}

/**
 * Reword every session's reason, in batches. Returns null only when every batch
 * failed to reach or read the model, so the deterministic reasons stand; a run
 * that partly failed still returns the reasons it kept.
 */
export async function rephraseSessionWhys(
	env: Env,
	inputs: WhyRephraseInput[],
): Promise<(SessionWhy | undefined)[] | null> {
	if (!inputs.length) return null;
	const report = await rephraseSessionWhysDetailed(env, inputs);
	if (report.batches > 0 && report.modelErrors + report.parseErrors === report.batches) return null;
	return report.results;
}

export interface StoredWhyInput {
	sessionId: string;
	input: WhyRephraseInput;
}

/** The request context a failure record is filed under, so it can be triaged. */
export interface WhyPassMeta {
	userId?: string | null;
	path?: string;
}

/**
 * Write one plain failure row to the app's error table, the recent-errors table
 * the admin ops view reads. It carries counts and the stage that failed, never
 * any runner text: the fact worth recording is which stage fell over, not what
 * the runner was told.
 */
async function recordWhyPassFailure(
	db: Db,
	report: WhyPassReport,
	meta: WhyPassMeta,
): Promise<void> {
	const stage =
		report.modelErrors && report.parseErrors
			? 'model+parse'
			: report.modelErrors
				? 'model'
				: report.parseErrors
					? 'parse'
					: 'gate';
	const gate =
		Object.entries(report.rejects)
			.map(([reason, n]) => `${reason}=${n}`)
			.join(',') || 'none';
	const message = (
		`the session-reason pass ${
			report.accepted === 0 ? 'kept no reasons' : 'lost reasons'
		}: stage=${stage} ` +
		`sessions=${report.sessions} accepted=${report.accepted} ` +
		`batches=${report.batches} modelErrors=${report.modelErrors} ` +
		`parseErrors=${report.parseErrors} unchanged=${report.unchanged} gate=${gate}`
	).slice(0, 300);
	await db
		.insert(schema.appErrors)
		.values({
			id: crypto.randomUUID(),
			name: 'SessionWhyPass',
			message,
			path: meta.path ?? '/api/plans/generate',
			method: 'POST',
			userId: meta.userId ?? null,
			requestId: null,
		})
		.catch(() => {});
}

/**
 * The second pass, run after the plan is saved (via waitUntil), so onboarding
 * never waits on it. It rewords the reasons and updates each session's
 * prescription with the accepted text on `whyText`, leaving `whyStructured` in
 * place as the fallback. Best effort: on any failure the stored plan keeps the
 * deterministic reasons, and a run that kept nothing is written to the error
 * table, so a silent failure becomes a visible one.
 */
export async function rephraseAndStore(
	env: Env,
	db: Db,
	rows: StoredWhyInput[],
	meta: WhyPassMeta = {},
): Promise<void> {
	const usable = rows.filter((r) => Object.keys(r.input.reason).length > 0);
	if (!usable.length) return;
	try {
		const report = await rephraseSessionWhysDetailed(
			env,
			usable.map((r) => r.input),
		);
		const accepted = usable
			.map((r, i) => ({ sessionId: r.sessionId, whyText: report.results[i] }))
			.filter((x): x is { sessionId: string; whyText: SessionWhy } => !!x.whyText);

		// A batch that never reached or read the model, or a run that kept nothing,
		// is a failure worth recording. A line the gate simply declined on its own
		// terms is not: that is the gate doing its job, not the pass falling over.
		const hardFailure = report.modelErrors + report.parseErrors > 0;
		if (!accepted.length || hardFailure) await recordWhyPassFailure(db, report, meta);
		if (!accepted.length) return;

		const ids = [...new Set(accepted.map((a) => a.sessionId))];
		const stored = (
			await Promise.all(
				chunk(ids, 90).map((part) =>
					db
						.select({ id: schema.sessionsPlan.id, prescription: schema.sessionsPlan.prescription })
						.from(schema.sessionsPlan)
						.where(inArray(schema.sessionsPlan.id, part)),
				),
			)
		).flat();
		const prescriptionById = new Map(stored.map((s) => [s.id, s.prescription]));

		for (const { sessionId, whyText } of accepted) {
			const prescription = prescriptionById.get(sessionId);
			if (!prescription) continue;
			await db
				.update(schema.sessionsPlan)
				.set({ prescription: { ...prescription, whyText } })
				.where(eq(schema.sessionsPlan.id, sessionId));
		}
	} catch {
		// The deterministic reasons already stand.
	}
}
