/**
 * Palette slots for the surfaces that are not health metrics: the app's own plan,
 * training and pace charts. They read from the same categorical palette as the
 * health charts (`--chart-1` to `--chart-8` in @strideguide/shared/tokens), so
 * every chart in the app comes from one family. Health metrics keep their own
 * mapping in `chartTheme`; this file does not replace it, it only gives the
 * training surfaces the same palette to draw from.
 *
 * Kept pure so it can be imported anywhere and reasoned about on its own.
 */

/** Done, volume, streak and plan progress: the green slot. */
export const TRAINING_PROGRESS = 'var(--chart-4)';

/** The ordered intensity and plan-phase ramps: the blue load slot. */
export const TRAINING_LOAD = 'var(--chart-2)';

/**
 * The four-step load scale for a day or month grid: the load slot at rising
 * strength, each step mixed toward the card surface, so the steps read as one
 * intensity, not four hues. Index 0 is an empty day (a rest day); 1 to 4 are the
 * load steps from lightest to heaviest. Kept here so every load grid draws the
 * same ramp from the shared palette.
 */
export const LOAD_RAMP = [
	'transparent',
	`color-mix(in oklab, ${TRAINING_LOAD} 12%, var(--paper))`,
	`color-mix(in oklab, ${TRAINING_LOAD} 30%, var(--paper))`,
	`color-mix(in oklab, ${TRAINING_LOAD} 52%, var(--paper))`,
	`color-mix(in oklab, ${TRAINING_LOAD} 74%, var(--paper))`,
] as const;

/**
 * Readable text for a load-ramp step. The step backgrounds are `color-mix`es of
 * the load slot into paper, so their lightness swings with the theme and with
 * the step. Rather than pick a text colour by eye, take the two surface tokens
 * the app already contrasts against, `--ink` and `--paper`, and choose the one
 * that clears the higher WCAG contrast against the step's own colour. Pass the
 * resolved values of `--chart-2`, `--paper` and `--ink`, so the choice follows
 * the active theme. Pure and computed, so it can be tested.
 *
 * `load`, `paper` and `ink` accept the `#rgb`/`#rrggbb` or `rgb()/rgba()` forms
 * the tokens resolve to.
 */
export function loadRampTextChoices(
	load: string,
	paper: string,
	ink: string,
): ('ink' | 'paper')[] {
	const loadRgb = parseColor(load);
	const paperRgb = parseColor(paper);
	const inkRgb = parseColor(ink);
	if (!loadRgb || !paperRgb || !inkRgb) return LOAD_RAMP.map(() => 'ink');
	return LOAD_RAMP.map((swatch) => {
		const pct = /([\d.]+)%/.exec(swatch);
		const bg = pct ? mixOklab(loadRgb, paperRgb, Number(pct[1]) / 100) : paperRgb;
		return contrastRgb(bg, inkRgb) >= contrastRgb(bg, paperRgb) ? 'ink' : 'paper';
	});
}

/** One ramp step's resolved colour as `#rrggbb`, for reasoning and tests. */
export function loadRampStepColor(index: number, load: string, paper: string): string | null {
	const loadRgb = parseColor(load);
	const paperRgb = parseColor(paper);
	if (!loadRgb || !paperRgb || index < 0 || index >= LOAD_RAMP.length) return null;
	const pct = /([\d.]+)%/.exec(LOAD_RAMP[index]);
	const rgb = pct ? mixOklab(loadRgb, paperRgb, Number(pct[1]) / 100) : paperRgb;
	return toHex(rgb);
}

/** The WCAG contrast ratio between two `#rrggbb` (or `rgb()`) colours. */
export function contrastRatio(a: string, b: string): number {
	const rgbA = parseColor(a);
	const rgbB = parseColor(b);
	if (!rgbA || !rgbB) return 1;
	return contrastRgb(rgbA, rgbB);
}

function contrastRgb(a: Rgb, b: Rgb): number {
	const lA = relativeLuminance(a);
	const lB = relativeLuminance(b);
	const [hi, lo] = lA >= lB ? [lA, lB] : [lB, lA];
	return (hi + 0.05) / (lo + 0.05);
}

type Rgb = [number, number, number];

/** Parse the hex or `rgb()`/`rgba()` forms the tokens resolve to. */
function parseColor(input: string): Rgb | null {
	const value = input.trim();
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
	if (hex) {
		let h = hex[1];
		if (h.length === 3) h = h.replace(/./g, (c) => c + c);
		return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
	}
	const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
	if (rgb) {
		const parts = rgb[1]
			.split(/[\s,/]+/)
			.filter(Boolean)
			.map(Number);
		if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
			return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
		}
	}
	return null;
}

function toHex([r, g, b]: Rgb): string {
	const byte = (v: number) =>
		Math.round(Math.min(1, Math.max(0, v)) * 255)
			.toString(16)
			.padStart(2, '0');
	return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/** sRGB channel (0..1) to linear light. */
function toLinear(c: number): number {
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Linear light back to an sRGB channel (0..1). */
function fromLinear(c: number): number {
	return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** Oklab, the space CSS `color-mix(in oklab, ...)` interpolates in. */
function srgbToOklab([r, g, b]: Rgb): Rgb {
	const lr = toLinear(r);
	const lg = toLinear(g);
	const lb = toLinear(b);
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

function oklabToSrgb([L, a, b]: Rgb): Rgb {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	];
}

/** Mix `a` into `b` at `weight` of `a`, the way CSS mixes in oklab. */
function mixOklab(a: Rgb, b: Rgb, weight: number): Rgb {
	const okA = srgbToOklab(a);
	const okB = srgbToOklab(b);
	return oklabToSrgb([
		okA[0] * weight + okB[0] * (1 - weight),
		okA[1] * weight + okB[1] * (1 - weight),
		okA[2] * weight + okB[2] * (1 - weight),
	]);
}

/** WCAG relative luminance of an sRGB colour. */
function relativeLuminance([r, g, b]: Rgb): number {
	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** The pace and effort trend: the indigo slot, kept apart from the health hues. */
export const TRAINING_PACE = 'var(--chart-1)';

/** A muted state on a chart, such as a skipped day or a reference line. */
export const CHART_MUTED = 'var(--steel)';

/** A quiet state on a chart, such as an empty heatmap cell. */
export const CHART_EMPTY = 'var(--hairline)';
