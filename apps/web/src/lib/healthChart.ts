/**
 * Small pure helpers for the health charts. Geometry only, no DOM and no state:
 * a card draws its own SVG from these, and the maths can be reasoned about on
 * its own. Kept out of the components so two charts share one scale.
 */

export interface ChartPoint {
	x: string;
	y: number | null;
	/** The low bound of a band, when the metric carries one. */
	low?: number | null;
	/** The high bound of a band, when the metric carries one. */
	high?: number | null;
}

/** The lowest and highest value across the points, for scaling the y axis. */
export function valueBounds(points: ChartPoint[]): { min: number; max: number } {
	const nums: number[] = [];
	for (const p of points) {
		for (const v of [p.y, p.low, p.high]) {
			if (typeof v === 'number' && Number.isFinite(v)) nums.push(v);
		}
	}
	if (!nums.length) return { min: 0, max: 1 };
	return { min: Math.min(...nums), max: Math.max(...nums) };
}

/**
 * A polyline for one series of values, as `x,y` pairs in a width by height box.
 * Null when there are fewer than two readings, so a lone point is drawn as a dot
 * rather than a line. Evenly spaced: the series is one reading per day, and the
 * date travels on the point for the tooltip.
 */
export function sparkline(
	values: (number | null | undefined)[],
	width = 100,
	height = 24,
	pad = 3,
): string | null {
	const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
	if (nums.length < 2) return null;
	const min = Math.min(...nums);
	const max = Math.max(...nums);
	const span = max - min || 1;
	return nums
		.map((v, i) => {
			const x = (i / (nums.length - 1)) * width;
			const y = height - pad - ((v - min) / span) * (height - pad * 2);
			return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
		})
		.join(' ');
}
