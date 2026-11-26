import { describe, expect, it } from 'vitest';
import {
	gateReason,
	gateReasonDetail,
	gateWhy,
	gateWhyDetail,
	parseWhyRephraseReply,
} from './why-rephrase';

describe('gateReason', () => {
	it('accepts a faithful reword of the same line', () => {
		const original = "This is the week's anchor run, the longest run of the week.";
		const candidate = 'Your long run anchors the week, the longest run of the week.';
		expect(gateReason(original, candidate)).toBe(candidate);
	});

	it('treats a number word and its digit as the same number', () => {
		const original = 'There are 2 easy days between this and your next hard session.';
		const candidate = 'There are two easy days between this and your next hard session.';
		expect(gateReason(original, candidate)).toBe(candidate);
	});

	it('rejects a line that adds a number the reason did not have', () => {
		const original = 'There are 2 easy days between this and your next hard session.';
		expect(
			gateReason(original, 'There are 3 easy days between your hard sessions.'),
		).toBeUndefined();
	});

	it('rejects a line that is empty after sanitizing', () => {
		expect(gateReason('This is an easy run.', '🙂🙂')).toBeUndefined();
	});

	it('rejects a line far outside the length bound', () => {
		const original = 'This is an easy run.';
		expect(
			gateReason(original, `${original} ${original} ${original} ${original} ${original}`),
		).toBeUndefined();
	});

	it('rejects a line that says something materially different', () => {
		const original = "The long run is the week's anchor.";
		expect(gateReason(original, 'Recovery matters after a hard training block.')).toBeUndefined();
	});

	it('cleans markdown, dashes and buzzwords before returning the line', () => {
		const clean = gateReason('This is an easy run.', 'This is a **seamless** easy run.');
		expect(clean).toBe('This is a smooth easy run.');
		expect(clean).not.toContain('*');
		expect(clean).not.toContain('—');
	});
});

describe('gateWhy', () => {
	it('rewords the parts the deterministic reason had', () => {
		const deterministic = { role: "This is the week's hard session." };
		const out = gateWhy(deterministic, { role: 'Your hard session for the week.' });
		expect(out?.role).toBe('Your hard session for the week.');
	});

	it('never adds a part the deterministic reason did not have', () => {
		const deterministic = { role: "This is the week's hard session." };
		const out = gateWhy(deterministic, {
			role: "This is the week's hard session.",
			planContext: 'Week 5 of 12.',
		});
		// The role is unchanged and the plan context was never given, so nothing
		// is accepted and no whyText is stored.
		expect(out).toBeUndefined();
	});

	it('returns undefined when nothing changed', () => {
		const deterministic = { dayReason: 'The day before is kept easy.' };
		expect(gateWhy(deterministic, { dayReason: 'The day before is kept easy.' })).toBeUndefined();
	});
});

describe('gateReasonDetail', () => {
	it('names the rule that rejected a line', () => {
		expect(gateReasonDetail('This is an easy run.', '🙂🙂')).toEqual({ rejectedBy: 'empty' });
		expect(gateReasonDetail('This is an easy run.', 'This is.')).toEqual({ rejectedBy: 'ratio' });
		expect(
			gateReasonDetail('There are 2 easy days between this and your next hard session.', 'There are 3 easy days between your hard sessions.'),
		).toEqual({ rejectedBy: 'number' });
		expect(
			gateReasonDetail("The long run is the week's anchor.", 'Recovery matters after a hard block.'),
		).toEqual({ rejectedBy: 'overlap' });
	});

	it('returns the cleaned line and no rule when it passes', () => {
		const verdict = gateReasonDetail('This is an easy run.', 'This is an easy run, go steady.');
		expect(verdict.rejectedBy).toBeUndefined();
		expect(verdict.text).toBe('This is an easy run, go steady.');
	});
});

describe('gateWhyDetail', () => {
	it('counts a line the model handed back unchanged', () => {
		const deterministic = { role: 'This is an easy run.' };
		const out = gateWhyDetail(deterministic, { role: 'This is an easy run.' });
		expect(out.why).toBeUndefined();
		expect(out.rejected).toEqual([]);
		expect(out.unchanged).toBe(1);
	});

	it('names the field and rule for a rejected line', () => {
		const deterministic = { role: "This is the week's hard session." };
		const out = gateWhyDetail(deterministic, { role: 'There are 3 hard sessions this week.' });
		expect(out.why).toBeUndefined();
		expect(out.rejected).toEqual([{ field: 'role', reason: 'number' }]);
	});

	it('keeps the accepted lines and reports the rest', () => {
		const deterministic = { role: 'This is an easy run.', dayReason: 'The day before is kept easy.' };
		const out = gateWhyDetail(deterministic, {
			role: 'This is an easy run, go steady.',
			dayReason: 'The day before is kept easy.',
		});
		expect(out.why?.role).toBe('This is an easy run, go steady.');
		expect(out.why?.dayReason).toBeUndefined();
		expect(out.unchanged).toBe(1);
	});
});

describe('parseWhyRephraseReply', () => {
	it('reads an array out of surrounding prose and fences', () => {
		const text = 'Here you go:\n```json\n[{"role":"A"},{"dayReason":"B","planContext":"C"}]\n```';
		expect(parseWhyRephraseReply(text)).toEqual([
			{ role: 'A' },
			{ dayReason: 'B', planContext: 'C' },
		]);
	});

	it('maps a junk row to null and drops empty strings', () => {
		const text = '[{"role":"A"}, 42, {"role":"  "},{"dayReason":"B"}]';
		expect(parseWhyRephraseReply(text)).toEqual([{ role: 'A' }, null, null, { dayReason: 'B' }]);
	});

	it('returns null when there is no array', () => {
		expect(parseWhyRephraseReply('No JSON here.')).toBeNull();
		expect(parseWhyRephraseReply('[not valid json')).toBeNull();
		expect(parseWhyRephraseReply('{"role":"not an array"}')).toBeNull();
	});
});
