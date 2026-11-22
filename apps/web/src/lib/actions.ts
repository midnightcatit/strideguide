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
		document.body.style.overflow = 'hidden';
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
				document.body.style.overflow = '';
			}
			previouslyFocused?.focus?.();
		},
	};
}
