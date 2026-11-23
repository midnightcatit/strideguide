import { describe, expect, it } from 'vitest';
import { sanitizeText, WRITING_RULES } from './writing';

describe('sanitizeText', () => {
	it('leaves plain prose alone', () => {
		const text = 'Easy running builds your aerobic base.';
		expect(sanitizeText(text)).toBe(text);
	});

	it('turns an em dash into a comma', () => {
		expect(sanitizeText('Easy miles \u2014 they build the engine')).toBe(
			'Easy miles, they build the engine',
		);
	});

	it('keeps an en dash inside a numeric range', () => {
		expect(sanitizeText('Goal pace 4:55–5:05 per km')).toContain('4:55–5:05');
	});

	it('treats an en dash used as a dash as a comma', () => {
		expect(sanitizeText('Rest – then quality')).toBe('Rest, then quality');
	});

	it('strips emoji and markdown', () => {
		expect(sanitizeText('**Strong** 💪 week')).toBe('Strong week');
	});

	it('drops filler transitions', () => {
		expect(sanitizeText("It's worth noting that easy days matter")).toBe('easy days matter');
	});

	it('swaps hype words for plain ones', () => {
		expect(sanitizeText('Unlock seamless speed')).toBe('build smooth speed');
	});

	it('leaves no em dash or emoji, even from the rules text', () => {
		expect(sanitizeText(`${WRITING_RULES} \u2014 ok ✅`)).not.toMatch(/[\u2014✅]/);
	});
});
