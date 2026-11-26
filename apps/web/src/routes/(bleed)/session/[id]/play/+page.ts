/**
 * The workout player takes over the screen. It brings its own Back / Close
 * header, so the shell drops its header and its bottom tab bar for this route
 * alone; every other route keeps the normal chrome. The shell reads `fullscreen`
 * from the merged page data.
 */
export const load = () => ({ fullscreen: true });
