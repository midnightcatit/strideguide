import { eq, inArray } from 'drizzle-orm';
import {
	buildWhyRephrasePrompt,
	gateWhy,
	parseWhyRephraseReply,
	type WhyRephraseInput,
} from '@strideguide/shared/plan';
import type { SessionWhy } from '@strideguide/shared';
import { schema } from '../db';
import type { Db } from '../db';
import type { Env } from '../env';
import { runAi, type AiMessage } from './ai';

/**
 * The session-reason rewording pass, on the API side. It builds one batched
 * request for every session in a plan, runs it through the shared chat model,
 * and hands the reply to the pure gate in @strideguide/shared/plan. Every failure
 * (no key, a timeout, an unusable reply) returns null or an empty result, so the
 * caller keeps the deterministic reasons exactly as they are.
 */

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

/**
 * Reword every session's reason in a single call. Returns one accepted reason
 * per input, in order, where each is undefined when the session had nothing to
 * reword or its line did not pass the gate. Returns null when the model is
 * unavailable or the reply cannot be read, so the deterministic reasons stand.
 */
export async function rephraseSessionWhys(
	env: Env,
	inputs: WhyRephraseInput[],
): Promise<(SessionWhy | undefined)[] | null> {
	if (!inputs.length) return null;
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
		if (!reply) return null;
		return inputs.map((input, i) => {
			const row = reply[i];
			return row ? gateWhy(input.reason, row) : undefined;
		});
	} catch {
		return null;
	}
}

export interface StoredWhyInput {
	sessionId: string;
	input: WhyRephraseInput;
}

/**
 * The second pass, run after the plan is saved (via waitUntil), so onboarding
 * never waits on it. It rewords the reasons and updates each session's
 * prescription with the accepted text on `whyText`, leaving `whyStructured` in
 * place as the fallback. Best effort: on any failure the stored plan keeps the
 * deterministic reasons, exactly as it does today.
 */
export async function rephraseAndStore(env: Env, db: Db, rows: StoredWhyInput[]): Promise<void> {
	const usable = rows.filter((r) => Object.keys(r.input.reason).length > 0);
	if (!usable.length) return;
	try {
		const rephrased = await rephraseSessionWhys(
			env,
			usable.map((r) => r.input),
		);
		if (!rephrased) return;
		const accepted = usable
			.map((r, i) => ({ sessionId: r.sessionId, whyText: rephrased[i] }))
			.filter((x): x is { sessionId: string; whyText: SessionWhy } => !!x.whyText);
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
