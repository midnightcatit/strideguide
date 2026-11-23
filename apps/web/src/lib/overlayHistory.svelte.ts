import { beforeNavigate, pushState } from '$app/navigation';
import { navigating } from '$app/state';

/**
 * Backs a page's full-screen overlays with a single history entry, so the browser
 * and the hardware Back button close them instead of leaving the page.
 *
 * One entry covers the whole overlay session, including moving between overlays
 * (say, from a session's detail into its player), so switching overlays never
 * grows the back stack. When the last overlay closes, the entry is dropped, so
 * the next Back leaves the page as the user expects.
 *
 * Call once per host, during component init:
 *   overlayHistory(() => !!target, () => (target = null));
 *
 * `isOpen` is read reactively; `closeTop` must clear whichever overlay is open.
 */
export function overlayHistory(isOpen: () => boolean, closeTop: () => void): void {
	// A token in the history state marks the entry as ours, so a popstate from
	// another source never closes an overlay, and Forward back into our entry is
	// not mistaken for a close.
	const token = Math.random().toString(36).slice(2);
	let pushed = false;

	function onPopState() {
		if (!pushed) return;
		const state = (history.state ?? {}) as { sgOverlay?: string };
		const stillOurs = state.sgOverlay === token;
		pushed = stillOurs;
		if (!stillOurs) closeTop();
	}

	if (typeof window !== 'undefined') {
		window.addEventListener('popstate', onPopState);
	}

	// Leaving the page with an overlay open: stop tracking, so no stray back() fires.
	beforeNavigate(() => {
		pushed = false;
	});

	$effect(() => {
		if (isOpen()) {
			if (!pushed) {
				pushState(location.href, { sgOverlay: token });
				pushed = true;
			}
		} else if (pushed) {
			pushed = false;
			// When the close is part of a navigation (a link out of the overlay),
			// let that navigation own history instead of racing its own back().
			if (!navigating) history.back();
		}
	});

	$effect(() => {
		return () => {
			if (typeof window !== 'undefined') window.removeEventListener('popstate', onPopState);
		};
	});
}
