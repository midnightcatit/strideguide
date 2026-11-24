/**
 * Volume comparisons. A total distance, in kilometres, read back as plain
 * landmarks: parkruns, marathons, the height of Everest. The landmarks are data,
 * so the wording is generated from them rather than written per number, and a new
 * landmark is a new row rather than new prose. Distances are real-world lengths in
 * kilometres; the sentences stay unit-agnostic on purpose.
 */

export interface TrailMark {
	/** Stable id, used as a list key. */
	id: string;
	/** Length of the landmark in kilometres. */
	km: number;
	/** How to name one of it, mid-sentence. */
	one: string;
	/** How to name several, or the thing being multiplied. */
	many: string;
	/**
	 * count: many is a plural noun, so "3 parkruns" reads right.
	 * times: many is a length, so "3 times the River Thames" reads right.
	 */
	kind: 'count' | 'times';
}

/**
 * Real-world lengths, short to long. The set is deliberately mixed: running
 * standards, landmarks you can picture, and a couple that get silly on purpose.
 */
export const TRAIL_MARKS: TrailMark[] = [
	{ id: 'track-lap', km: 0.4, one: 'one lap of a running track', many: 'laps of a running track', kind: 'count' },
	{ id: 'eiffel', km: 0.33, one: 'the height of the Eiffel Tower', many: 'the height of the Eiffel Tower', kind: 'times' },
	{ id: 'parkrun', km: 5, one: 'a parkrun', many: 'parkruns', kind: 'count' },
	{ id: 'everest', km: 8.849, one: 'the height of Everest', many: 'the height of Everest', kind: 'times' },
	{ id: 'tenk', km: 10, one: 'a 10K', many: '10Ks', kind: 'count' },
	{ id: 'half', km: 21.0975, one: 'a half marathon', many: 'half marathons', kind: 'count' },
	{ id: 'channel', km: 33, one: 'the width of the English Channel', many: 'the width of the English Channel', kind: 'times' },
	{ id: 'grand-canyon', km: 34, one: 'a rim-to-rim crossing of the Grand Canyon', many: 'Grand Canyon crossings', kind: 'count' },
	{ id: 'marathon', km: 42.195, one: 'a marathon', many: 'marathons', kind: 'count' },
	{ id: 'comrades', km: 89, one: 'the Comrades Marathon', many: 'Comrades Marathons', kind: 'count' },
	{ id: 'thames', km: 346, one: 'the length of the River Thames', many: 'the length of the River Thames', kind: 'times' },
	{ id: 'britain', km: 1407, one: 'the length of mainland Britain', many: 'the length of mainland Britain', kind: 'times' },
	{ id: 'great-wall', km: 21196, one: 'the length of the Great Wall of China', many: 'the length of the Great Wall of China', kind: 'times' },
	{ id: 'earth', km: 40075, one: 'a lap of the Earth at the equator', many: 'laps of the Earth at the equator', kind: 'count' },
];

export interface VolumeComparison {
	id: string;
	/** One plain sentence, ready to show. */
	text: string;
}

/**
 * Read a total distance as up to `limit` landmarks. Picks the longest landmarks
 * that fit inside the total, so the comparison is always reachable, and rounds
 * the multiple. Below one and a half of a landmark it says "more than" rather
 * than pretending to a count it does not have.
 */
export function volumeComparisons(totalKm: number, limit = 3): VolumeComparison[] {
	if (!(totalKm > 0) || limit < 1) return [];
	const eligible = TRAIL_MARKS.filter((m) => m.km <= totalKm)
		.sort((a, b) => b.km - a.km)
		.slice(0, limit);
	return eligible.map((m) => {
		const multiple = totalKm / m.km;
		if (multiple < 1.5) return { id: m.id, text: `That is more than ${m.one}.` };
		const n = Math.max(2, Math.round(multiple));
		const text =
			m.kind === 'count'
				? `That is about ${n} ${m.many}.`
				: `That is about ${n} times ${m.many}.`;
		return { id: m.id, text };
	});
}
