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
	const previouslyFocused = (
		typeof document !== 'undefined' ? document.activeElement : null
	) as HTMLElement | null;

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
 * Svelte action for the week strip: a horizontal swipe across the strip steps a
 * whole week and rolls the strip like a wheel. A horizontal wheel or trackpad
 * gesture over the strip steps a week too. Vertical gestures stay native, so the
 * page below scrolls as usual. Under prefers-reduced-motion the week changes
 * without the roll.
 */
export function weekSwipe(node: HTMLElement, onStep: ((delta: 1 | -1) => void) | undefined) {
	const threshold = 40; // finger travel before a swipe counts as a step
	const follow = 0.5; // the strip trails the finger, so the roll feels weighted
	const cooldown = 260; // one wheel gesture, one step
	const reduced =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	let pointerId: number | null = null;
	let startX = 0;
	let startY = 0;
	let axis: 'none' | 'x' | 'y' = 'none';
	let lastStep = 0;
	let wheelTotal = 0;
	let wheelTimer: ReturnType<typeof setTimeout> | undefined;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;
	let suppressClick = false;
	let clickTimer: ReturnType<typeof setTimeout> | undefined;

	node.style.touchAction = 'pan-y';
	// Suppress the iOS callout across the whole strip, so a swipe never pops it.
	node.style.setProperty('-webkit-touch-callout', 'none');

	function roll(px: number) {
		if (reduced) return;
		const deg = Math.max(-4, Math.min(4, px * 0.06));
		node.style.transform = `translate3d(${px}px, 0, 0) rotate(${deg}deg)`;
	}

	function settle() {
		if (settleTimer) clearTimeout(settleTimer);
		if (reduced) {
			node.style.transform = '';
			return;
		}
		node.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
		node.style.transform = '';
		settleTimer = setTimeout(() => {
			node.style.transition = '';
		}, 300);
	}

	function step(delta: 1 | -1) {
		if (!onStep) return;
		onStep(delta);
	}

	function down(e: PointerEvent) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		pointerId = e.pointerId;
		startX = e.clientX;
		startY = e.clientY;
		axis = 'none';
		node.style.transition = '';
	}

	function move(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		if (axis === 'none') {
			if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
			// Only a clearly horizontal drag is ours, so a vertical scroll stays native.
			axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
			if (axis === 'x') {
				node.style.userSelect = 'none';
				try {
					node.setPointerCapture(e.pointerId);
				} catch {
					// capture is a nicety, the roll works without it
				}
			}
		}
		if (axis === 'x') roll(dx * follow);
	}

	function up(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		pointerId = null;
		node.style.userSelect = '';
		const dx = e.clientX - startX;
		const wasHorizontal = axis === 'x';
		axis = 'none';
		if (wasHorizontal && Math.abs(dx) >= threshold) {
			step(dx < 0 ? 1 : -1);
			// A drag across the day buttons must not also click one of them.
			suppressClick = true;
			if (clickTimer) clearTimeout(clickTimer);
			clickTimer = setTimeout(() => {
				suppressClick = false;
			}, 350);
		}
		settle();
	}

	function cancel(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		pointerId = null;
		axis = 'none';
		node.style.userSelect = '';
		settle();
	}

	function click(e: MouseEvent) {
		if (!suppressClick) return;
		suppressClick = false;
		e.preventDefault();
		e.stopPropagation();
	}

	function wheel(e: WheelEvent) {
		// A vertical wheel belongs to the page. Only a horizontal gesture over the
		// strip steps a week.
		if (!onStep || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
		e.preventDefault();
		wheelTotal += e.deltaX;
		if (wheelTimer) clearTimeout(wheelTimer);
		wheelTimer = setTimeout(() => {
			wheelTotal = 0;
		}, 200);
		if (Math.abs(wheelTotal) < 40) return;
		const dir: 1 | -1 = wheelTotal > 0 ? 1 : -1;
		wheelTotal = 0;
		const now = performance.now();
		if (now - lastStep < cooldown) return;
		lastStep = now;
		step(dir);
		// A short roll in the direction of travel, then the snap back.
		if (!reduced) {
			node.style.transition = '';
			roll(dir * -8);
			requestAnimationFrame(settle);
		}
	}

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', cancel);
	node.addEventListener('click', click, true);
	node.addEventListener('wheel', wheel, { passive: false });

	return {
		update(next: ((delta: 1 | -1) => void) | undefined) {
			onStep = next;
		},
		destroy() {
			if (settleTimer) clearTimeout(settleTimer);
			if (wheelTimer) clearTimeout(wheelTimer);
			if (clickTimer) clearTimeout(clickTimer);
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', cancel);
			node.removeEventListener('click', click, true);
			node.removeEventListener('wheel', wheel);
			node.style.transform = '';
			node.style.transition = '';
			node.style.touchAction = '';
			node.style.userSelect = '';
			node.style.removeProperty('-webkit-touch-callout');
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
	// Suppress the iOS callout across the whole surface, so a press-and-hold to
	// start a drag never pops the copy menu.
	node.style.setProperty('-webkit-touch-callout', 'none');

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
		// Once the drag is live, keep the browser from claiming the gesture as a
		// scroll, so the card keeps moving with the pointer.
		node.style.touchAction = 'none';
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
			node.style.touchAction = '';
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
			const moved =
				Math.abs(e.clientX - startX) > moveTol || Math.abs(e.clientY - startY) > moveTol;
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
			node.style.touchAction = '';
			node.style.removeProperty('-webkit-touch-callout');
		},
	};
}
