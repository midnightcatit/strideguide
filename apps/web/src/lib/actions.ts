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

/**
 * Svelte action for a swipeable day view: a horizontal drag steps one day. The
 * panel trails the finger at a fraction of its travel and glides back with a slow
 * ease, so a swipe reads as deliberate rather than like a fast scroll. A mostly
 * vertical drag is left to the page. Under prefers-reduced-motion the day changes
 * with no movement at all.
 */
export function daySwipe(node: HTMLElement, onStep: (delta: 1 | -1) => void) {
	const threshold = 60; // real finger travel before a swipe counts as a step
	const follow = 0.35; // how far the panel follows, below 1 so it feels heavy
	const settleMs = 380; // deliberately slow glide back to rest
	const reduced =
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	let pointerId: number | null = null;
	let startX = 0;
	let startY = 0;
	let axis: 'none' | 'x' | 'y' = 'none';
	let offset = 0;
	let raf = 0;

	// Leave a horizontal scroller inside the panel (the session carousel) alone,
	// so its own swipe keeps working and only the rest of the day view is ours.
	function inHorizontalScroller(target: EventTarget | null): boolean {
		let el = target instanceof HTMLElement ? target : null;
		while (el && el !== node) {
			const style = getComputedStyle(el);
			if (
				(style.overflowX === 'auto' || style.overflowX === 'scroll') &&
				el.scrollWidth > el.clientWidth + 1
			) {
				return true;
			}
			el = el.parentElement;
		}
		return false;
	}

	function setOffset(px: number) {
		offset = px;
		node.style.transform = px ? `translate3d(${px}px, 0, 0)` : '';
	}

	function easeOutCubic(t: number) {
		return 1 - (1 - t) ** 3;
	}

	function stopRaf() {
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
	}

	function settle(to: number) {
		stopRaf();
		const from = offset;
		if (reduced || from === to) {
			setOffset(to);
			return;
		}
		const start = performance.now();
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / settleMs);
			setOffset(from + (to - from) * easeOutCubic(t));
			raf = t < 1 ? requestAnimationFrame(tick) : 0;
		};
		raf = requestAnimationFrame(tick);
	}

	function down(e: PointerEvent) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		if (inHorizontalScroller(e.target)) return;
		stopRaf();
		pointerId = e.pointerId;
		startX = e.clientX;
		startY = e.clientY;
		axis = 'none';
	}

	function move(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		if (axis === 'none') {
			if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
			// Only a clearly horizontal drag is ours, so a scroll always wins.
			axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
			if (axis === 'x') {
				node.style.userSelect = 'none';
				try {
					node.setPointerCapture(e.pointerId);
				} catch {
					// capture is a nicety, the swipe works without it
				}
			}
		}
		if (axis === 'x' && !reduced) setOffset(dx * follow);
	}

	function up(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		pointerId = null;
		node.style.userSelect = '';
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		const horizontal = axis === 'x';
		axis = 'none';
		if (horizontal && Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.3) {
			onStep(dx < 0 ? 1 : -1);
		}
		settle(0);
	}

	function cancel(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		pointerId = null;
		axis = 'none';
		node.style.userSelect = '';
		settle(0);
	}

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', cancel);

	return {
		update(next: (delta: 1 | -1) => void) {
			onStep = next;
		},
		destroy() {
			stopRaf();
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', cancel);
			node.style.transform = '';
			node.style.userSelect = '';
		},
	};
}

export interface DragToDayOptions {
	/** Called with the day the card was dropped on. */
	onDropDay: (day: number) => void;
	/** How long a touch must be held (ms) before the drag starts. */
	holdMs?: number;
}

/**
 * Svelte action for moving a card to another day with one pointer interaction.
 * On a mouse or pen a drag starts as soon as the pointer clearly moves; on a
 * touch screen the runner presses and holds for a moment, then drags, so a
 * plain swipe still scrolls the page and a short tap still opens the card.
 * The card lifts while it is held and the day under the pointer highlights.
 * The drop day is read from the `data-drop-day` attribute on the day rows.
 *
 * Only transform and opacity move the lifted card, so nothing reflows, and the
 * lift is left out under prefers-reduced-motion.
 */
export function dragToDay(node: HTMLElement, options: DragToDayOptions) {
	const holdMs = options.holdMs ?? 250;
	const moveTol = 8; // px of travel that counts as a scroll, not a hold
	let onDropDay = options.onDropDay;

	let pointerId: number | null = null;
	let startX = 0;
	let startY = 0;
	let active = false;
	let holdTimer: ReturnType<typeof setTimeout> | undefined;
	let target: HTMLElement | null = null;

	/** The day row under a viewport point, or null when the pointer is elsewhere. */
	function dropRowAt(x: number, y: number): HTMLElement | null {
		let el = document.elementFromPoint(x, y);
		// The lifted card can overlap a neighbour; look through it to the row.
		if (el && node.contains(el)) {
			const previous = node.style.pointerEvents;
			node.style.pointerEvents = 'none';
			el = document.elementFromPoint(x, y);
			node.style.pointerEvents = previous;
		}
		return el instanceof HTMLElement ? el.closest<HTMLElement>('[data-drop-day]') : null;
	}

	function highlight(row: HTMLElement | null) {
		if (row === target) return;
		target?.classList.remove('is-drop-target');
		target = row;
		target?.classList.add('is-drop-target');
	}

	function activate(pointer: number, x: number, y: number) {
		active = true;
		node.classList.add('is-dragging');
		node.style.userSelect = 'none';
		try {
			node.setPointerCapture(pointer);
		} catch {
			// capture is a nicety; the drag still works without it
		}
		highlight(dropRowAt(x, y));
	}

	function clearHold() {
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = undefined;
		}
	}

	function endDrag() {
		clearHold();
		if (active) {
			node.classList.remove('is-dragging');
			node.style.userSelect = '';
		}
		active = false;
		highlight(null);
	}

	/** Swallow the click the browser fires after a drag, so a tap does not open. */
	function suppressNextClick() {
		const swallow = (e: MouseEvent) => {
			e.preventDefault();
			e.stopImmediatePropagation();
			document.removeEventListener('click', swallow, true);
		};
		document.addEventListener('click', swallow, true);
		setTimeout(() => document.removeEventListener('click', swallow, true), 400);
	}

	function down(e: PointerEvent) {
		if (pointerId !== null) return;
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		pointerId = e.pointerId;
		startX = e.clientX;
		startY = e.clientY;
		// A touch waits for a hold, so a swipe scrolls and a tap opens the card.
		if (e.pointerType === 'touch') {
			clearHold();
			holdTimer = setTimeout(() => {
				holdTimer = undefined;
				activate(e.pointerId, startX, startY);
			}, holdMs);
		}
	}

	function move(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		if (!active) {
			const moved = Math.abs(e.clientX - startX) > moveTol || Math.abs(e.clientY - startY) > moveTol;
			if (!moved) return;
			if (holdTimer) {
				// Moved before the hold completed: this is a scroll, not a drag.
				clearHold();
				pointerId = null;
			} else if (e.pointerType !== 'touch') {
				// A mouse or pen drag starts as soon as the pointer moves.
				activate(e.pointerId, e.clientX, e.clientY);
			}
			return;
		}
		highlight(dropRowAt(e.clientX, e.clientY));
	}

	function up(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		const wasActive = active;
		const day = target ? Number(target.dataset.dropDay) : null;
		endDrag();
		try {
			node.releasePointerCapture(e.pointerId);
		} catch {
			// already released
		}
		pointerId = null;
		if (wasActive) {
			suppressNextClick();
			if (day != null && Number.isInteger(day)) onDropDay(day);
		}
	}

	function cancel(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		endDrag();
		pointerId = null;
	}

	// While a touch drag is active, stop the page from scrolling under it.
	function onTouchMove(e: TouchEvent) {
		if (active) e.preventDefault();
	}

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', cancel);
	node.addEventListener('touchmove', onTouchMove, { passive: false });

	return {
		update(next: DragToDayOptions) {
			onDropDay = next.onDropDay;
		},
		destroy() {
			endDrag();
			pointerId = null;
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', cancel);
			node.removeEventListener('touchmove', onTouchMove);
			node.style.userSelect = '';
		},
	};
}
