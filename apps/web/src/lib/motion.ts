import { prefersReducedMotion } from 'svelte/motion';

/**
 * JS-driven motion for the shared sheet transition. Svelte's `transition:`
 * runs on the Web Animations API, so it is not covered by the global CSS
 * reduced-motion rule; the functions here check `prefersReducedMotion` and drop
 * to a zero duration instead, and the layout's reduced-motion rule keeps CSS
 * motion still. The overlay fades, the panel rises and settles with a slight
 * scale, and both play the same curve in and out, so opening and closing read as
 * one movement.
 */

/**
 * A cubic-bezier easing evaluator, so a JS transition can run the exact curve of
 * a CSS token instead of a lookalike. `x1, y1, x2, y2` are the control points,
 * the same numbers as the CSS `cubic-bezier(...)`.
 */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
	const ax = 3 * x1 - 3 * x2 + 1;
	const bx = 3 * x2 - 6 * x1;
	const cx = 3 * x1;
	const ay = 3 * y1 - 3 * y2 + 1;
	const by = 3 * y2 - 6 * y1;
	const cy = 3 * y1;

	const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
	const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
	const sampleDx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

	return (x: number) => {
		let t = x;
		for (let i = 0; i < 8; i++) {
			const dx = sampleX(t) - x;
			if (Math.abs(dx) < 1e-4) return sampleY(t);
			const slope = sampleDx(t);
			if (Math.abs(slope) < 1e-6) break;
			t -= dx / slope;
		}
		return sampleY(t);
	};
}

/** The --ease-out token (0.22, 1, 0.36, 1) as a JS curve. */
const easeOut = cubicBezier(0.22, 1, 0.36, 1);
/** The --ease-emphasized token (0.2, 0, 0, 1) as a JS curve. */
const easeEmphasized = cubicBezier(0.2, 0, 0, 1);

/**
 * Durations mirror the --dur-* custom properties in app.css, read at call time
 * so app.css stays the single source of truth. The fallbacks match the same
 * numbers for the server and for any context where the property is missing.
 */
const DURATION_FALLBACK = { '--dur-1': 140, '--dur-2': 220, '--dur-3': 340 } as const;

function durationMs(token: keyof typeof DURATION_FALLBACK): number {
	const fallback = DURATION_FALLBACK[token];
	if (typeof window === 'undefined') return fallback;
	const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
	const value = Number.parseFloat(raw);
	if (!Number.isFinite(value)) return fallback;
	return raw.endsWith('ms') ? value : value * 1000;
}

/** The backdrop: a plain fade, on the standard curve. */
export function sheetOverlay(_node: Element, _params?: unknown) {
	return {
		duration: prefersReducedMotion.current ? 0 : durationMs('--dur-2'),
		easing: easeOut,
		css: (t: number) => `opacity: ${t}`,
	};
}

/** The panel: rises a few pixels and settles with a slight scale. */
export function sheetPanel(_node: Element, _params?: unknown) {
	const rise = 16;
	return {
		duration: prefersReducedMotion.current ? 0 : durationMs('--dur-3'),
		easing: easeEmphasized,
		css: (t: number, u: number) =>
			`opacity: ${t}; transform: translateY(${u * rise}px) scale(${1 - u * 0.01})`,
	};
}

/**
 * The header account menu: a quick fade with a small drop from the trigger, on
 * the short duration. Driven here rather than in CSS because a `transition:`
 * runs on the Web Animations API, which the global reduced-motion rule does not
 * reach, so the check has to live in the function.
 */
export function menuPanel(_node: Element, _params?: unknown) {
	const drop = -6;
	return {
		duration: prefersReducedMotion.current ? 0 : durationMs('--dur-1'),
		easing: easeOut,
		css: (t: number, u: number) =>
			`opacity: ${t}; transform: translateY(${u * drop}px) scale(${1 - u * 0.02})`,
	};
}
