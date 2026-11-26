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

/** The pace and effort trend: the indigo slot, kept apart from the health hues. */
export const TRAINING_PACE = 'var(--chart-1)';

/** A muted state on a chart, such as a skipped day or a reference line. */
export const CHART_MUTED = 'var(--steel)';

/** A quiet state on a chart, such as an empty heatmap cell. */
export const CHART_EMPTY = 'var(--hairline)';
