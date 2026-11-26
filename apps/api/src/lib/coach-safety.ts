import { z } from 'zod';
import { decideChoice, type JevOptions } from './jev';

/**
 * A typed safety read on a coach message, decided by Jev, TypeSafe's decisions
 * model served by OpenRouter. It is a choice among three risks with a calibrated
 * confidence. It is deliberately narrow: it only decides whether the message
 * raises a health or safety concern the coach should not answer alone. It never
 * writes the reply, and it never blocks one unless it is confident, so the coach
 * still answers normally when the model is unsure or unavailable.
 */

export const RISKS = ['none', 'caution', 'urgent'] as const;
export type Risk = (typeof RISKS)[number];

const riskSchema = z.enum(RISKS);

export interface RiskAssessment {
	risk: Risk;
	confidence: number;
}

/** Minimum confidence before a risk read changes the reply. */
export const REDIRECT_CONFIDENCE = 0.6;

/**
 * The plain line shown instead of a coach answer when the input reads as a risk.
 * It points to a professional and offers to help plan afterwards. It states no
 * diagnosis and gives no treatment, so it is not medical advice.
 */
export const SAFETY_REPLY =
	'That sounds like something to talk through with a doctor or physiotherapist before you train. Once you have their advice, I can help you plan around it.';

/**
 * Classify a coach message. Returns the typed risk with its confidence, or null
 * when there is no key, the call fails, or the answer is unusable, in which case
 * the caller answers as usual.
 */
export async function classifyRisk(
	env: { OPENROUTER_API_KEY?: string },
	message: string,
	opts: JevOptions = {},
): Promise<RiskAssessment | null> {
	const decision = await decideChoice<Risk>(
		env,
		message,
		{
			id: 'risk',
			instructions:
				'Does this message raise a health or safety concern that a running coach should not handle alone?',
			options: {
				none: 'A training question or remark with no health or safety concern.',
				caution:
					'A health or safety concern the runner raises, such as pain, a niggle, injury or illness, that is not an emergency.',
				urgent:
					'A clear health or safety concern that needs a medical professional now, such as chest pain, fainting, or an injury that stops training.',
			},
			schema: riskSchema,
		},
		opts,
	);
	return decision ? { risk: decision.value, confidence: decision.confidence } : null;
}

/** True when a risk read is confident enough to replace the coach answer. */
export function shouldRedirect(assessment: RiskAssessment | null): boolean {
	return !!assessment && assessment.risk !== 'none' && assessment.confidence >= REDIRECT_CONFIDENCE;
}
