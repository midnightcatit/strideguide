/**
 * Shared writing guidance and an output filter for model text that reaches the
 * user. The prompts already ask for plain, human prose; this is the safety net,
 * because a prompt is not a guarantee. Kept in the pure domain so the API and the
 * web can both use it (AGENTS.md: no em dashes, no AI tells).
 */

/** Prepended to every user-facing generation prompt. */
export const WRITING_RULES = `Write like a person, plainly:
- No em dashes. Use commas, periods, colons or parentheses instead.
- No emoji, and no markdown: no headings, no bold, no code ticks.
- No hype or buzzwords (unlock, empower, seamless, revolutionary, thrilled, game-changing). No hedging filler, and no generic transitions such as "let's dive in" or "it's worth noting that".
- Short sentences. Be specific and concrete.
- Never invent research, studies or citations. If something is uncertain, say so plainly.
- Never give medical advice. For pain, injury or illness, tell them to see a professional.`;

// Characters and formatting the rules ban, whatever the wording.
const EMOJI =
	/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
const MD_HEADING = /^[ \t]{0,3}#{1,6}[ \t]+/gm;
const MD_EMPHASIS = /(\*\*|__|\*|`)/g;

// Cliché openers and filler to drop entirely.
const FILLER: [RegExp, string][] = [
	[/\b(let'?s|let us)\s+(dive|jump)\s+in[,!:.]?\s*/gi, ''],
	[/\b(it'?s|it is)\s+worth noting that\s*/gi, ''],
	[/\bneedless to say,?\s*/gi, ''],
	[/\bin conclusion,?\s*/gi, ''],
	[/\bto sum up,?\s*/gi, ''],
	[/\bat the end of the day,?\s*/gi, ''],
	[/\bwhen it comes to\b/gi, 'for'],
	[/\bthe fact that\b/gi, 'that'],
];

// Word swaps toward plain language, chosen so meaning stays intact.
const PLAINER: [RegExp, string][] = [
	[/\bleverage\b/gi, 'use'],
	[/\butilize\b/gi, 'use'],
	[/\bcommence\b/gi, 'start'],
	[/\bfacilitate\b/gi, 'help'],
	[/\bin order to\b/gi, 'to'],
	[/\ba myriad of\b/gi, 'many'],
	[/\bplethora of\b/gi, 'many'],
	[/\bsynergy\b/gi, 'teamwork'],
	[/\bholistic\b/gi, 'complete'],
	[/\bseamlessly\b/gi, 'smoothly'],
	[/\bseamless\b/gi, 'smooth'],
	[/\bunlock\b/gi, 'build'],
	[/\bempower\b/gi, 'help'],
	[/\brevolutionary\b/gi, 'new'],
	[/\bthrilled\b/gi, 'glad'],
	[/\bgame[- ]?changing\b/gi, 'useful'],
	[/\bcutting[- ]?edge\b/gi, 'modern'],
];

/** Turn any dash into a comma, but keep an en dash inside a numeric range (4:55–5:05). */
function normalizeDashes(text: string): string {
	text = text.replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, '$1\u0001$2');
	text = text.replace(/\s*[\u2013\u2014]\s*/g, ', ');
	text = text.replace(/\s+--\s+/g, ', ');
	return text.replace(/\u0001/g, '–');
}

/**
 * Clean model text for display. Strips banned characters and formatting, drops
 * filler phrasing, and swaps a few buzzwords for plainer words.
 */
export function sanitizeText(input: string): string {
	let text = input;

	text = text.replace(EMOJI, '');
	text = text.replace(MD_HEADING, '');
	text = text.replace(MD_EMPHASIS, '');
	text = normalizeDashes(text);

	for (const [re, to] of [...FILLER, ...PLAINER]) text = text.replace(re, to);

	// Tidy the result of the edits above.
	text = text.replace(/\s+([,.;:!?])/g, '$1');
	text = text.replace(/([,.;:!?]){2,}/g, '$1');
	text = text.replace(/[ \t]{2,}/g, ' ');
	text = text.replace(/^[,;:\s]+/, '');
	return text.trim();
}

// selftest: exercise the armed nudge path, reverted right after
