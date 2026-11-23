import type { Env } from '../env';

export interface AiMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface AiResult {
	text: string;
	model: string;
	provider: 'cloudflare' | 'openrouter';
	tokensIn?: number;
	tokensOut?: number;
}

const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CF_TIMEOUT_MS = 8000;
const OPENROUTER_TIMEOUT_MS = 12000;

interface CfAiResponse {
	response?: string;
}

/** Reject if a promise does not settle in time, so a slow model never hangs a request. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) => setTimeout(() => reject(new Error('ai_timeout')), ms)),
	]);
}

/**
 * Model router (PLAN.md section 6.1): Cloudflare Workers AI first,
 * OpenRouter on error/limit/timeout. Both paths are time-boxed. Callers persist
 * results and degrade gracefully on total failure.
 */
export async function runAi(
	env: Env,
	messages: AiMessage[],
	opts: { maxTokens?: number } = {},
): Promise<AiResult> {
	const maxTokens = opts.maxTokens ?? 1024;

	try {
		const res = (await withTimeout(
			env.AI.run(CF_MODEL as never, { messages, max_tokens: maxTokens }) as Promise<unknown>,
			CF_TIMEOUT_MS,
		)) as CfAiResponse | string;
		const text = typeof res === 'string' ? res : (res.response ?? '');
		if (text.trim()) {
			return { text, model: CF_MODEL, provider: 'cloudflare' };
		}
	} catch {
		// timeout, daily limit, or error: fall through to OpenRouter
	}

	if (!env.OPENROUTER_API_KEY) {
		throw new Error('AI unavailable: Cloudflare AI failed and no OpenRouter key configured');
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
	try {
		const res = await fetch(OPENROUTER_URL, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
				'content-type': 'application/json',
			},
			body: JSON.stringify({ model: OPENROUTER_MODEL, messages, max_tokens: maxTokens }),
			signal: controller.signal,
		});

		if (!res.ok) {
			throw new Error(`OpenRouter error ${res.status}`);
		}

		const data = (await res.json()) as {
			choices?: { message?: { content?: string } }[];
			usage?: { prompt_tokens?: number; completion_tokens?: number };
		};

		const text = data.choices?.[0]?.message?.content ?? '';
		return {
			text,
			model: OPENROUTER_MODEL,
			provider: 'openrouter',
			tokensIn: data.usage?.prompt_tokens,
			tokensOut: data.usage?.completion_tokens,
		};
	} finally {
		clearTimeout(timer);
	}
}
