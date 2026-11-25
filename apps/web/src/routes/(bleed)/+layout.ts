/**
 * A route group for pages that render full-bleed. The shell reads `bleed` from
 * the merged page data and drops its centred, padded column for these routes, so
 * a page does not have to break out of it by hand with `100vw` and negative
 * margins. Route groups do not affect the URL, so the paths are unchanged.
 */
export const load = () => ({ bleed: true });
