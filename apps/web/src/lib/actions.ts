/**
 * Shared scroll lock. Nested overlays each lock, and the page is only released
 * when the last one closes. The body is pinned with `position: fixed`, which is
 * what actually stops the background scrolling on iOS.
 */
let locks = 0;
let savedY = 0;

function lockScroll() {
	if (typeof document === 'undefined') return;
	if (locks === 0) {
		savedY = window.scrollY;
		document.body.style.position = 'fixed';
		document.body.style.top = `-${savedY}px`;
		document.body.style.left = '0';
		document.body.style.right = '0';
		document.body.style.width = '100%';
		document.body.style.overflow = 'hidden';
	}
	locks++;
}

function unlockScroll() {
	if (typeof document === 'undefined') return;
	locks = Math.max(0, locks - 1);
	if (locks === 0) {
		document.body.style.position = '';
		document.body.style.top = '';
		document.body.style.left = '';
		document.body.style.right = '';
		document.body.style.width = '';
		document.body.style.overflow = '';
		window.scrollTo(0, savedY);
	}
}

/**
 * Svelte action for full-screen overlays: Escape to close, background scroll lock,
 * focus moved in and returned on close, and a simple focus trap.
 */
export function modal(node: HTMLElement, onClose: () => void) {
	const previouslyFocused = (typeof document !== 'undefined'
		? document.activeElement
		: null) as HTMLElement | null;

	const focusable = () =>
		Array.from(
			node.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
			),
		).filter((el) => el.offsetParent !== null);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
			return;
		}
		if (e.key !== 'Tab') return;
		const els = focusable();
		if (els.length === 0) return;
		const first = els[0]!;
		const last = els[els.length - 1]!;
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	if (typeof document !== 'undefined') {
		document.addEventListener('keydown', onKeydown);
		lockScroll();
		const els = focusable();
		(els[0] ?? node).focus?.();
	}

	return {
		update(next: () => void) {
			onClose = next;
		},
		destroy() {
			if (typeof document !== 'undefined') {
				document.removeEventListener('keydown', onKeydown);
				unlockScroll();
			}
			previouslyFocused?.focus?.();
		},
	};
}
