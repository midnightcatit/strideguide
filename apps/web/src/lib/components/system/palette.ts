/**
 * The system map's own palette. It is self-contained on purpose: the diagram
 * reads as a document over a long sitting, so it wants near-white tints, strong
 * ink and calm accents, not the app's saturated signal colour. Nothing outside
 * the system folder reads these values.
 *
 * Every value is a plain hex so the contrast is exact and checkable. The ratios
 * below are WCAG 2.1 contrast ratios, computed from these hexes:
 *
 * Light theme (surface #FCFDFF)
 *   ink on surface        16.40
 *   note on surface        7.74
 *   stage    rail/surface 5.38  chip ink/chip bg 7.41
 *   module   rail/surface 4.64  chip ink/chip bg 6.31
 *   boundary rail/surface 4.57  chip ink/chip bg 6.02
 *   decision rail/surface 5.53  chip ink/chip bg 7.22
 *   data     rail/surface 5.14  chip ink/chip bg 6.86
 *   route    rail/surface 4.80  chip ink/chip bg 6.46
 *   test     rail/surface 4.82  chip ink/chip bg 6.34
 *   trigger  rail/surface 4.20  chip ink/chip bg 5.90
 *   edge on surface 4.44, edge label on surface 10.10
 *
 * Dark theme (surface #161A21)
 *   ink on surface        15.15
 *   note on surface        7.99
 *   stage    rail/surface 7.52  chip ink/chip bg 9.83
 *   module   rail/surface 8.63  chip ink/chip bg 9.89
 *   boundary rail/surface 8.02  chip ink/chip bg 9.29
 *   decision rail/surface 7.90  chip ink/chip bg 9.91
 *   data     rail/surface 8.25  chip ink/chip bg 9.88
 *   route    rail/surface 9.04  chip ink/chip bg 10.21
 *   test     rail/surface 8.20  chip ink/chip bg 9.99
 *   trigger  rail/surface 8.43  chip ink/chip bg 9.89
 *   edge on surface 5.63, edge label on surface 12.67
 *
 * Text pairs clear 4.5:1 (AA body); the thin accent rails clear 3:1 (AA
 * non-text). The rail test in palette.test.ts recomputes these and fails if a
 * later tweak drops one below its floor.
 */
import { EDGE_KINDS, NODE_KINDS, type GraphEdgeKind, type GraphNodeKind } from './types';

export type GraphTheme = 'light' | 'dark';

export interface KindColors {
	/** The thin rail down the node's edge and the focus ring. */
	rail: string;
	/** The kind chip's near-white (light) or near-black (dark) background. */
	chipBg: string;
	/** The kind chip's text, dark on the light tint and light on the dark one. */
	chipInk: string;
}

export interface GraphPalette {
	surface: string;
	ink: string;
	note: string;
	hairline: string;
	edge: string;
	edgeLabelInk: string;
	/** One stroke colour per edge kind, so an edge reads by what it stands for. */
	edgeKinds: Record<GraphEdgeKind, string>;
	pattern: string;
	focusRing: string;
	minimapNode: string;
	minimapMask: string;
	kinds: Record<GraphNodeKind, KindColors>;
}

export const GRAPH_PALETTE: Record<GraphTheme, GraphPalette> = {
	light: {
		surface: '#FCFDFF',
		ink: '#1B1E24',
		note: '#4A5260',
		hairline: '#E4E8EE',
		edge: '#6E7787',
		edgeLabelInk: '#3A414D',
		// Each edge kind borrows the accent of the thing it points at, so the
		// diagram reads by meaning rather than one grey for every line.
		edgeKinds: {
			flow: '#6E7787',
			enforced: '#A45A72',
			guarded: '#3F7E74',
			decision: '#6C5CA8',
			'foreign-key': '#3C6FA6',
		},
		pattern: '#C9D0DC',
		focusRing: '#4C5B8A',
		minimapNode: '#C9D0DC',
		minimapMask: 'rgba(252, 253, 255, 0.65)',
		kinds: {
			stage: { rail: '#5566A6', chipBg: '#EEF1FA', chipInk: '#3B4A86' },
			module: { rail: '#3F7E74', chipBg: '#E9F4F1', chipInk: '#2C6159' },
			boundary: { rail: '#9A6B2F', chipBg: '#F7EFE1', chipInk: '#7A521F' },
			decision: { rail: '#6C5CA8', chipBg: '#F0EDF9', chipInk: '#51438A' },
			data: { rail: '#3C6FA6', chipBg: '#E9F1F9', chipInk: '#2B5480' },
			route: { rail: '#4E7C46', chipBg: '#EBF3E8', chipInk: '#3A5F34' },
			test: { rail: '#A45A72', chipBg: '#F8EDF1', chipInk: '#82435A' },
			trigger: { rail: '#AC6B3A', chipBg: '#F9EEE3', chipInk: '#854E25' },
		},
	},
	dark: {
		surface: '#161A21',
		ink: '#EDEFF3',
		note: '#A8B0BE',
		hairline: '#2A303A',
		edge: '#8A93A2',
		edgeLabelInk: '#D7DCE4',
		edgeKinds: {
			flow: '#8A93A2',
			enforced: '#E0A0B6',
			guarded: '#7FC3B7',
			decision: '#B3A6E6',
			'foreign-key': '#8FB6E0',
		},
		pattern: '#2E3642',
		focusRing: '#B3C0EC',
		minimapNode: '#39424F',
		minimapMask: 'rgba(22, 26, 33, 0.65)',
		kinds: {
			stage: { rail: '#9AA8E0', chipBg: '#1E2333', chipInk: '#C3CCEF' },
			module: { rail: '#7FC3B7', chipBg: '#17282A', chipInk: '#A7DAD0' },
			boundary: { rail: '#D6A868', chipBg: '#2A2417', chipInk: '#E6C48F' },
			decision: { rail: '#B3A6E6', chipBg: '#221F33', chipInk: '#CFC6F1' },
			data: { rail: '#8FB6E0', chipBg: '#182430', chipInk: '#B4D0EC' },
			route: { rail: '#94C88A', chipBg: '#1B291A', chipInk: '#B7DEAF' },
			test: { rail: '#E0A0B6', chipBg: '#2C1F26', chipInk: '#EFC2D0' },
			trigger: { rail: '#E0A97E', chipBg: '#2C241A', chipInk: '#EFC9A9' },
		},
	},
};

/**
 * The palette as CSS custom properties for one theme. Set once on the graph
 * root; the node and edge components read them, so a theme change is one string
 * swap and no node object is rebuilt.
 */
export function graphVars(theme: GraphTheme): string {
	const p = GRAPH_PALETTE[theme];
	const lines: string[] = [
		`--g-surface:${p.surface}`,
		`--g-ink:${p.ink}`,
		`--g-note:${p.note}`,
		`--g-hairline:${p.hairline}`,
		`--g-edge:${p.edge}`,
		`--g-edge-label-ink:${p.edgeLabelInk}`,
		`--g-pattern:${p.pattern}`,
		`--g-focus-ring:${p.focusRing}`,
		`--g-minimap-node:${p.minimapNode}`,
		`--g-minimap-mask:${p.minimapMask}`,
	];
	for (const kind of NODE_KINDS) {
		const c = p.kinds[kind];
		lines.push(`--g-${kind}-rail:${c.rail}`);
		lines.push(`--g-${kind}-chip-bg:${c.chipBg}`);
		lines.push(`--g-${kind}-chip-ink:${c.chipInk}`);
	}
	for (const kind of EDGE_KINDS) lines.push(`--g-edge-${kind}:${p.edgeKinds[kind]}`);
	return lines.join(';');
}

/**
 * Svelte Flow's own variables, pointed at the diagram palette so its edges,
 * background, minimap and controls match without per-element overrides.
 */
export function xyflowVars(theme: GraphTheme): string {
	const p = GRAPH_PALETTE[theme];
	return [
		`--xy-edge-stroke:${p.edge}`,
		'--xy-edge-stroke-width:1.5',
		`--xy-background-color:${p.surface}`,
		`--xy-edge-label-background-color:${p.surface}`,
		`--xy-edge-label-color:${p.edgeLabelInk}`,
		`--xy-background-pattern-dots-color:${p.pattern}`,
		`--xy-minimap-background-color:${p.surface}`,
		`--xy-minimap-node-background-color:${p.minimapNode}`,
		`--xy-minimap-mask-background-color:${p.minimapMask}`,
		`--xy-controls-button-background-color:${p.surface}`,
		`--xy-controls-button-background-color-hover:${p.pattern}`,
		`--xy-controls-button-color:${p.ink}`,
		`--xy-controls-button-border-color:${p.hairline}`,
		'--xy-attribution-background-color:transparent',
		`color-scheme:${theme}`,
	].join(';');
}

/** The inline variables a node sets to bind its own kind's colours. */
export function kindVars(kind: GraphNodeKind): string {
	return [
		`--g-rail:var(--g-${kind}-rail)`,
		`--g-chip-bg:var(--g-${kind}-chip-bg)`,
		`--g-chip-ink:var(--g-${kind}-chip-ink)`,
	].join(';');
}

/** The stroke colour for one edge kind in a theme, for the canvas and the legend. */
export function edgeKindColor(theme: GraphTheme, kind: GraphEdgeKind): string {
	return GRAPH_PALETTE[theme].edgeKinds[kind] ?? GRAPH_PALETTE[theme].edge;
}
