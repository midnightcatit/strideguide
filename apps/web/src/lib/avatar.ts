/**
 * The header avatar. A solid, coloured circle carrying the runner's first
 * initial, the way Google draws a profile photo it does not have. The colour
 * comes from a small fixed palette, chosen by hashing a seed, so one runner
 * keeps the same colour between visits and across devices, and a name is all it
 * takes to pick it. With no name there is nothing to draw, and the caller shows
 * a neutral person icon instead.
 */

/**
 * Eight deep hues, the chart family. Each one clears 4.5:1 against white text,
 * so the initial stays legible and the set reads as deliberate rather than
 * random. Kept literal (not theme tokens) because the circle is its own painted
 * surface and must not flip with the light or dark theme.
 */
export const AVATAR_COLORS = [
	'#4f46e5',
	'#2563eb',
	'#0f766e',
	'#15803d',
	'#b45309',
	'#be185d',
	'#7c3aed',
	'#c2410c',
] as const;

/**
 * The upper-case first letter of the runner's first name, or null when there is
 * no name to draw one from. Grabs a whole code point, so an accented or emoji
 * lead character is not split in half.
 */
export function initialFor(name?: string | null): string | null {
	const trimmed = name?.trim();
	if (!trimmed) return null;
	const first = trimmed.split(/\s+/)[0] ?? '';
	const ch = Array.from(first)[0];
	return ch ? ch.toUpperCase() : null;
}

/**
 * A stable colour for a seed string (the name, or the user id when the name is
 * empty). Same seed, same colour, every time: a plain string hash folded onto
 * the palette, no randomness.
 */
export function avatarColorFor(seed: string): string {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	}
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}
