import type { GraphTheme } from './palette';

/**
 * The graph's own theme, resolved from the same two signals the app uses:
 * `data-theme` on `<html>` when the runner has picked a side, otherwise the
 * system preference. The initial value is `light` so the server and the first
 * client render agree; the effect settles on the real theme just after mount.
 */
export function graphTheme(): { readonly current: GraphTheme } {
	let theme = $state<GraphTheme>('light');

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const read = () => {
			const attr = document.documentElement.dataset.theme;
			const chosen = attr === 'dark' || attr === 'light' ? attr : null;
			theme = chosen ?? (mq.matches ? 'dark' : 'light');
		};
		read();
		mq.addEventListener('change', read);
		const observer = new MutationObserver(read);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return () => {
			mq.removeEventListener('change', read);
			observer.disconnect();
		};
	});

	return {
		get current() {
			return theme;
		},
	};
}
