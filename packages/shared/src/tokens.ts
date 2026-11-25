/**
 * Design tokens (PLAN.md section 11.1).
 * World: precision instrument + field notebook. Accent: amber "signal".
 * These are the single source of truth; the web app consumes the CSS below.
 */

export const color = {
	paper: { light: '#F4F5F2', dark: '#101318' },
	ink: { light: '#191C22', dark: '#E9EAE6' },
	steel: { light: '#5A6473', dark: '#98A0AE' },
	hairline: { light: '#D8DBD6', dark: '#2A2F38' },
	signal: { light: '#E8A33D', dark: '#F2B451' },
} as const;

export const font = {
	display: "'Space Grotesk', system-ui, sans-serif",
	body: "'IBM Plex Sans', system-ui, sans-serif",
	data: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

export const typeScale = [12, 14, 16, 20, 24, 32, 44] as const;
export const fontWeights = [400, 500, 700] as const;

/**
 * Categorical chart palette. Distinct hues so a metric keeps one colour on every
 * surface, chosen to read on paper (light) and on the dark background. Emitted as
 * --chart-1 .. --chart-N in document order, so an index maps to a stable swatch.
 */
export const chartColor = {
	indigo: { light: '#4f46e5', dark: '#a5b4fc' },
	blue: { light: '#2563eb', dark: '#93c5fd' },
	teal: { light: '#0d9488', dark: '#5eead4' },
	green: { light: '#15803d', dark: '#4ade80' },
	amber: { light: '#b45309', dark: '#fbbf24' },
	pink: { light: '#be185d', dark: '#f9a8d4' },
	violet: { light: '#7c3aed', dark: '#c4b5fd' },
	red: { light: '#dc2626', dark: '#fca5a5' },
} as const;

/** Document order of the chart palette; index + 1 is the --chart-N number. */
export const chartOrder = [
	'indigo',
	'blue',
	'teal',
	'green',
	'amber',
	'pink',
	'violet',
	'red',
] as const;

export type ChartColorName = (typeof chartOrder)[number];

/** The emitted custom properties for one theme, as `name: value` lines. */
function chartVars(theme: 'light' | 'dark'): string {
	return chartOrder
		.map((name, i) => `  --chart-${i + 1}: ${chartColor[name][theme]};`)
		.join('\n');
}

/** Emit the token CSS custom properties for both themes. */
export function tokensCss(): string {
	return `:root {
  --paper: ${color.paper.light};
  --ink: ${color.ink.light};
  --steel: ${color.steel.light};
  --hairline: ${color.hairline.light};
  --signal: ${color.signal.light};
${chartVars('light')}
  --font-display: ${font.display};
  --font-body: ${font.body};
  --font-data: ${font.data};
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: ${color.paper.dark};
    --ink: ${color.ink.dark};
    --steel: ${color.steel.dark};
    --hairline: ${color.hairline.dark};
    --signal: ${color.signal.dark};
${chartVars('dark')}
  }
}

:root[data-theme='light'] {
  --paper: ${color.paper.light};
  --ink: ${color.ink.light};
  --steel: ${color.steel.light};
  --hairline: ${color.hairline.light};
  --signal: ${color.signal.light};
${chartVars('light')}
}

:root[data-theme='dark'] {
  --paper: ${color.paper.dark};
  --ink: ${color.ink.dark};
  --steel: ${color.steel.dark};
  --hairline: ${color.hairline.dark};
  --signal: ${color.signal.dark};
${chartVars('dark')}
}
`;
}
