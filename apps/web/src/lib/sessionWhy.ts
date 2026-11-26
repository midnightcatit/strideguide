/**
 * The one definition of the reason to show for a session. The plan composes a
 * structured reason (`whyStructured`) and, once the plan is saved, the model
 * rewords it part by part (`whyText`). Every surface that shows a session's why
 * reads it through here, so the model's wording appears wherever the
 * deterministic one does and the two can never drift apart.
 */

import type { SessionWhy } from '@strideguide/shared';
import type { ClientPrescription } from './plan';

/**
 * The merged reason, in parts. The model's rewording of a part wins over the
 * plan's own, since it is only stored when it passed the writing gate. Null when
 * the session carries no reason at all, so `{#if}` still falls through to the
 * static one-liner.
 */
export function mergeSessionWhy(p?: ClientPrescription | null): SessionWhy | null {
	if (p?.whyStructured) return { ...p.whyStructured, ...(p.whyText ?? {}) };
	return p?.whyText ?? null;
}

/**
 * The reason as one line, for a card or a compact section: the first structured
 * part, then the static amount note as the last fallback. Empty when the session
 * carries none, so the caller can fall back further (to the session's purpose or
 * the type's one-liner).
 */
export function sessionWhyLine(p?: ClientPrescription | null): string {
	const why = mergeSessionWhy(p);
	return why?.role ?? why?.dayReason ?? p?.why ?? '';
}
