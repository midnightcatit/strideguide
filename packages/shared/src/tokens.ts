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

/** Emit the token CSS custom properties for both themes. */
export function tokensCss(): string {
	return `:root {
  --paper: ${color.paper.light};
  --ink: ${color.ink.light};
  --steel: ${color.steel.light};
  --hairline: ${color.hairline.light};
  --signal: ${color.signal.light};
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
  }
}

:root[data-theme='light'] {
  --paper: ${color.paper.light};
  --ink: ${color.ink.light};
  --steel: ${color.steel.light};
  --hairline: ${color.hairline.light};
  --signal: ${color.signal.light};
}

:root[data-theme='dark'] {
  --paper: ${color.paper.dark};
  --ink: ${color.ink.dark};
  --steel: ${color.steel.dark};
  --hairline: ${color.hairline.dark};
  --signal: ${color.signal.dark};
}
`;
}
