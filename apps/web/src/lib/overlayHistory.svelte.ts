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
 *   const { release } = overlayHistory(() => !!target, () => (target = null));
 *
 * `isOpen` is read reactively; `closeTop` must clear whichever overlay is open.
 *
 * `release` is for a momentary confirm. Its action often navigates (sign out,
 * delete, discard, go back), and that navigation has to run against the page's
 * own entry, not the one the dialog pushed on top. `release` drops the entry and
 * resolves once the browser has left it, so the action then runs on a clean
 * stack. See ConfirmSheet and HoldConfirmDialog.
 */
export function overlayHistory(
	isOpen: () => boolean,
	closeTop: () => void,
): { release: () => Promise<void> } {
	function newToken(): string {
		return Math.random().toString(36).slice(2);
	}

	// A fresh token per push marks the entry as ours, so a popstate from another
	// source never closes an overlay, and Forward back into an older entry of ours
	// (with a stale token) is not mistaken for a close.
	let token = newToken();
	let pushed = false;
	// True while `release` is dropping the entry on purpose, so the popstate it
	// causes is not also read as the user closing the overlay.
	let releasing = false;

	// True when the current history entry is the one this host pushed. SvelteKit's
	// `pushState` keeps the value we pass under its own key, so look there, and
	// fall back to a flat read for safety.
	function isOurs(): boolean {
		const state = (history.state ?? {}) as {
			sgOverlay?: string;
			'sveltekit:states'?: { sgOverlay?: string };
		};
		return state.sgOverlay === token || state['sveltekit:states']?.sgOverlay === token;
	}

	function onPopState() {
		if (releasing) return;
		if (!pushed) return;
		const stillOurs = isOurs();
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
				token = newToken();
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

	async function release(): Promise<void> {
		if (!pushed) return;
		pushed = false;
		releasing = true;
		await new Promise<void>((resolve) => {
			const settle = () => {
				window.removeEventListener('popstate', settle);
				clearTimeout(timer);
				resolve();
			};
			window.addEventListener('popstate', settle);
			// A safety net, in case a popstate never arrives for any reason.
			const timer = setTimeout(settle, 300);
			history.back();
		});
		releasing = false;
	}

	return { release };
}
