/**
 * Geometry for the tiny hand-drawn mini widgets: the sparkline and the small bar
 * strip. They need no axes, tooltip or chart library, so they are laid out here
 * as plain SVG. Kept pure and free of any DOM or colour, so the shapes can be
 * reasoned about and tested on their own; the components only place them.
 */

export interface SparklineGeometry {
	/** The SVG line path, in a 0..width by 0..height box. */
	d: string;
	/** The last point, for a marker at the end of the trend. */
	last: { x: number; y: number };
}

/** A point rounded to two decimals, so the path stays short and stable. */
function round(n: number): number {
	return Math.round(n * 100) / 100;
}

/**
 * A line path through the readings, scaled into a box with a little padding so
 * the stroke is never clipped at the edges. Null with fewer than two readings,
 * so a lone day is never drawn as a flat line. A flat series draws a level line
 * through the middle instead of dividing by a zero range.
 */
export function sparklineGeometry(
	values: number[],
	width: number,
	height: number,
	pad = 2,
): SparklineGeometry | null {
	const nums = values.filter((v) => Number.isFinite(v));
	if (nums.length < 2) return null;

	const min = Math.min(...nums);
	const max = Math.max(...nums);
	const range = max - min;
	const innerW = Math.max(0, width - pad * 2);
	const innerH = Math.max(0, height - pad * 2);

	const points = nums.map((v, i) => {
		const x = pad + (i / (nums.length - 1)) * innerW;
		const y = range === 0 ? pad + innerH / 2 : pad + innerH * (1 - (v - min) / range);
		return { x: round(x), y: round(y) };
	});

	const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
	return { d, last: points[points.length - 1] };
}

export interface BarRect {
	x: number;
	y: number;
	w: number;
	h: number;
	r: number;
}

/**
 * The bars for a small strip, one per reading, grown from the bottom and scaled
 * to the tallest. Every bar keeps the same width with a small gap between. A
 * non-finite or negative reading draws no bar, and an all-zero series divides by
 * nothing, so the strip stays a valid, empty set instead of a broken shape.
 */
export function barRects(
	values: number[],
	width: number,
	height: number,
	gap = 1,
	radius = 1,
): BarRect[] {
	if (values.length === 0) return [];
	const max = Math.max(1, ...values.filter((v) => Number.isFinite(v)));
	const n = values.length;
	const w = Math.max(0, (width - gap * (n - 1)) / n);
	return values.map((raw, i) => {
		const v = Number.isFinite(raw) ? Math.max(0, raw) : 0;
		const h = round((v / max) * height);
		return {
			x: round(i * (w + gap)),
			y: round(height - h),
			w: round(w),
			h,
			r: Math.min(radius, w / 2, h / 2),
		};
	});
}
