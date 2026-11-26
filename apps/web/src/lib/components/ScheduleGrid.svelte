<script lang="ts">
	/**
	 * A weekly training-window grid: seven day columns, quarter-hour rows.
	 *
	 * Pointer: tap an empty slot to add a window, drag across empty slots to add a
	 * longer one, and tap a saved window's body to remove it. Each saved window has
	 * an arrow strip along its top and bottom edge: tap the top strip to move the
	 * window fifteen minutes earlier, tap the bottom strip to move it later, both
	 * with the same clamping and merge onto a neighbour as before. Drag the body to
	 * move the whole window to any slot; drag the top strip to change only the
	 * start, so the window widens or shrinks upward with the end fixed; drag the
	 * bottom strip to change only the end, with the start fixed. A resize never
	 * crosses the other edge.
	 *
	 * Keyboard: a real button per window body removes it, the two arrow strips are
	 * real buttons that nudge the window earlier or later, and the arrow keys move a
	 * focused window. On a strip, holding Shift with the arrow keys changes that
	 * edge: the top strip sets the start, the bottom strip sets the end. So nothing
	 * here is drag-only.
	 *
	 * The day columns hold a fixed minimum width and the grid scrolls sideways, so
	 * a phone shows a comfortable column and the whole week stays reachable. The
	 * saved windows are listed below it in a bounded, scrollable box; a row can be
	 * swiped left or right to remove it, and its remove button works without a
	 * swipe for keyboard and screen readers.
	 *
	 * An optional `activeDays` list dims the columns of days the runner has not
	 * picked. It is a cue only: every column stays editable, so the touch, keyboard
	 * and bulk-add paths are exactly as before.
	 */
	import {
		DAY_LABELS,
		GRID_START_MIN,
		STEP_MIN,
		addBlock,
		addBulk,
		blockMinutes,
		describeBulk,
		formatHourLabel,
		formatTime,
		formatWindow,
		gridBounds,
		minutesForRow,
		minutesToTime,
		removeBlockAt,
		resizeBlockEnd,
		resizeBlockStart,
		resizeWindowEnd,
		resizeWindowStart,
		rowForMinutes,
		shiftBlock,
		shiftWindow,
		sortBlocks,
		timeToMinutes,
		windowForDrag,
		windowForTap,
	} from '$lib/schedule';
	import type { MinuteWindow } from '$lib/schedule';
	import type { ScheduleBlock } from '@strideguide/shared/units';

	let {
		blocks,
		onChange,
		activeDays = null,
	}: {
		blocks: ScheduleBlock[];
		onChange: (blocks: ScheduleBlock[]) => void;
		// The days the runner can train, when the caller knows them (onboarding).
		// Only a visual cue: those day columns stay fully editable, so this never
		// changes the touch, keyboard or bulk-add behaviour here. Omitted, every
		// column reads the same, which is what Settings does.
		activeDays?: number[] | null;
	} = $props();

	const activeSet = $derived(activeDays ? new Set(activeDays) : null);

	// One cell is 16px tall, so a quarter-hour block is one cell and an hour block
	// is four. The grid is the default 04:00 to 23:00 (76 rows, so 1216px),
	// widened to include any stored window outside that range so nothing is
	// hidden. The maths on a tap or a drag reads straight off the rectangle.
	const CELL_H = 16;
	// The minimum width of a day column, in CSS pixels. Seven of these are wider
	// than a phone, so the grid scrolls sideways instead of squeezing the days
	// below a comfortable width; on a wider screen the columns grow to fill it.
	const DAY_W = 60;
	// The top and bottom arrow strips, in CSS pixels. Each spans the block's full
	// inner width, so on a phone it is a wide bar rather than a small glyph. The
	// two strips plus a tappable body have to fit the shortest block, which is why
	// MIN_BLOCK_H allows for two strips and a body of the same height again.
	const STRIP_H = 20;
	// A block shorter than this still draws tall enough for both arrow strips and a
	// tappable body below and above them.
	const MIN_BLOCK_H = 60;
	// A window must be dragged at least this far sideways before a row swipe takes
	// over, so a vertical scroll of the list is never read as a swipe.
	const SWIPE_REMOVE_PX = 80;
	const DAYS = [0, 1, 2, 3, 4, 5, 6];
	const bounds = $derived(gridBounds(blocks));
	const rowIndexes = $derived(Array.from({ length: bounds.rows }, (_, i) => i));
	// Hour marks from the first hour to the one before the end, so the last label
	// is never cut off at the very bottom.
	const hourMarks = $derived(
		Array.from(
			{ length: (bounds.end - 60 - bounds.start) / 60 + 1 },
			(_, i) => bounds.start + i * 60,
		),
	);
	const slots = $derived(
		Array.from(
			{ length: (bounds.end - bounds.start) / STEP_MIN + 1 },
			(_, i) => bounds.start + i * STEP_MIN,
		),
	);
	const startSlots = $derived(slots.slice(0, -1));
	const endSlots = $derived(slots.slice(1));

	// The bulk path: the same window on every day from one weekday to another, so
	// a whole week, a working stretch or a single day takes one go. A single day is
	// just a range of one, which is why this is the only add control here.
	let bulkFromDay = $state('0');
	let bulkToDay = $state('6');
	let bulkStartTime = $state(minutesToTime(GRID_START_MIN + 60));
	let bulkEndTime = $state(minutesToTime(GRID_START_MIN + 18 * 60));
	let bulkMessage = $state('');

	// What the bulk add will do, shown before it is done. The band above the
	// button waits for a valid time range and names the days it will cover.
	const bulkPreview = $derived.by(() => {
		const start = timeToMinutes(bulkStartTime);
		const end = timeToMinutes(bulkEndTime);
		if (!(end > start)) return '';
		return describeBulk(Number(bulkFromDay), Number(bulkToDay), start, end);
	});

	function addBulkFromForm() {
		const start = timeToMinutes(bulkStartTime);
		const end = timeToMinutes(bulkEndTime);
		if (!(end > start)) {
			bulkMessage = 'Pick an end time after the start time.';
			return;
		}
		onChange(addBulk(blocks, Number(bulkFromDay), Number(bulkToDay), start, end));
		bulkMessage = '';
	}

	// Removing a saved window, with one undo for an accidental swipe or tap. The
	// previous list is kept and offered back for a few seconds, then dropped. The
	// undo line sits with the list but outside its scroll box, next to Clear all.
	let undoBlocks = $state<ScheduleBlock[] | null>(null);
	let undoLabel = $state('');
	let undoTimer: ReturnType<typeof setTimeout> | undefined;

	function clearUndo() {
		if (undoTimer) {
			clearTimeout(undoTimer);
			undoTimer = undefined;
		}
		undoBlocks = null;
		undoLabel = '';
	}

	function removeWindow(block: ScheduleBlock) {
		const label = `${DAY_LABELS[block.day]} ${formatWindow(
			timeToMinutes(block.start),
			timeToMinutes(block.end),
		)}`;
		const before = blocks;
		onChange(removeBlockAt(blocks, block.day, timeToMinutes(block.start)));
		clearUndo();
		undoBlocks = before;
		undoLabel = label;
		undoTimer = setTimeout(() => {
			undoTimer = undefined;
			undoBlocks = null;
			undoLabel = '';
		}, 6000);
	}

	function undoRemove() {
		if (undoBlocks) onChange(undoBlocks);
		clearUndo();
	}

	// Move the block that starts at the given time by `delta` minutes, the same
	// way the arrows, the keyboard and a drag all do.
	function nudge(block: ScheduleBlock, delta: number) {
		onChange(shiftBlock(blocks, block.day, timeToMinutes(block.start), delta, bounds));
	}

	// Pointer painting on the grid. A mouse drag starts as soon as it moves; a
	// touch press-and-holds first, so a swipe still scrolls the page and a tap
	// still adds. The cell is read from the grid's own rectangle, so it stays
	// correct while a window is dragged over.
	let layer = $state<HTMLDivElement | null>(null);
	let pointerId: number | null = null;
	let startCell: { day: number; row: number } | null = null;
	let armed = $state(false);
	let preview = $state<{ day: number; start: number; end: number } | null>(null);
	// The window under an active pointer press, keyed like the each block. Set the
	// moment a press starts on a saved window and cleared on release, so the block
	// reads as picked up before any drag begins. Not drag-only: it is only ever a
	// visual lift over the keyboard-reachable controls.
	let activeKey = $state<string | null>(null);
	let startX = 0;
	let startY = 0;
	let holdTimer: ReturnType<typeof setTimeout> | undefined;

	function cellAt(x: number, y: number) {
		const el = layer;
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return null;
		const day = Math.min(6, Math.max(0, Math.floor((x - rect.left) / (rect.width / 7))));
		const row = Math.min(
			bounds.rows - 1,
			Math.max(0, Math.floor((y - rect.top) / (rect.height / bounds.rows))),
		);
		return { day, row };
	}

	function clearHold() {
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = undefined;
		}
	}

	function arm(id: number) {
		armed = true;
		if (layer) layer.style.touchAction = 'none';
		try {
			layer?.setPointerCapture(id);
		} catch {
			// capture is a nicety; the drag works without it
		}
	}

	function down(e: PointerEvent) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		// A saved window is its own controls; a press on one removes or moves, not paints.
		if ((e.target as Element | null)?.closest('button, [data-block]')) return;
		const cell = cellAt(e.clientX, e.clientY);
		if (!cell) return;
		pointerId = e.pointerId;
		startCell = cell;
		startX = e.clientX;
		startY = e.clientY;
		armed = false;
		preview = null;
		if (e.pointerType === 'touch') {
			clearHold();
			holdTimer = setTimeout(() => {
				holdTimer = undefined;
				arm(e.pointerId);
			}, 250);
		}
	}

	function move(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		if (!armed) {
			const moved = Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8;
			if (!moved) return;
			if (holdTimer) {
				// A touch that moved before the hold completed is a scroll, not a drag.
				clearHold();
				pointerId = null;
				startCell = null;
				return;
			}
			if (e.pointerType !== 'touch') arm(e.pointerId);
			if (!armed) return;
		}
		const cell = cellAt(e.clientX, e.clientY);
		if (!cell || !startCell) return;
		const w = windowForDrag(
			minutesForRow(startCell.row, bounds.start),
			minutesForRow(cell.row, bounds.start),
			bounds,
		);
		preview = { day: startCell.day, start: w.start, end: w.end };
	}

	function release(id: number) {
		if (layer) {
			layer.style.touchAction = '';
			try {
				layer.releasePointerCapture(id);
			} catch {
				// already released
			}
		}
	}

	function finish(e: PointerEvent) {
		// Any pointer release inside the grid ends a press on a saved window too,
		// so the lifted state never sticks.
		activeKey = null;
		if (pointerId === null || e.pointerId !== pointerId) return;
		clearHold();
		const wasArmed = armed;
		const cell = cellAt(e.clientX, e.clientY) ?? startCell;
		if (startCell && cell) {
			// A drag over more than one slot adds the range it covered; a tap, or a
			// hold that never moved, adds the default hour.
			const dragged = wasArmed && cell.row !== startCell.row;
			const w = dragged
				? windowForDrag(
						minutesForRow(startCell.row, bounds.start),
						minutesForRow(cell.row, bounds.start),
						bounds,
					)
				: windowForTap(minutesForRow(startCell.row, bounds.start), bounds);
			onChange(addBlock(blocks, startCell.day, w.start, w.end));
		}
		release(e.pointerId);
		pointerId = null;
		armed = false;
		startCell = null;
		preview = null;
	}

	function cancel(e: PointerEvent) {
		activeKey = null;
		if (pointerId === null || e.pointerId !== pointerId) return;
		clearHold();
		release(e.pointerId);
		pointerId = null;
		armed = false;
		startCell = null;
		preview = null;
	}

	function onTouchMove(e: TouchEvent) {
		if (armed) e.preventDefault();
	}

	// A saved window's three zones: the top arrow strip, the body and the bottom
	// arrow strip. Each is a real button. A press starts a possible drag; a tap
	// that never moves runs the button's click. `kind` decides what a drag does:
	// "start" moves only the start, "end" moves only the end, "move" moves the
	// whole window. The block sets `touch-action: none`, so a press never scrolls
	// the page or the grid and the drag arms at once with no press-and-hold.
	type DragKind = 'start' | 'end' | 'move';
	let dragPid: number | null = null;
	let dragEl: HTMLElement | null = null;
	let dragBlock: ScheduleBlock | null = null;
	let dragKind: DragKind = 'move';
	let dragGrabRow = 0;
	let dragStartY = 0;
	let dragMoved = false;
	// Set when a drag commits, so the click the browser fires on release does not
	// also nudge or remove. Reset on the next press and after one swallowed click.
	let swallowClick = false;
	let dragging = $state<{ day: number; start: number; window: MinuteWindow } | null>(null);

	function startDrag(e: PointerEvent, block: ScheduleBlock, key: string, kind: DragKind) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		if (dragPid !== null) return;
		e.stopPropagation();
		const rect = layer?.getBoundingClientRect();
		if (!rect) return;
		dragPid = e.pointerId;
		dragEl = e.currentTarget as HTMLElement;
		dragBlock = block;
		dragKind = kind;
		dragStartY = e.clientY;
		dragGrabRow = Math.round((e.clientY - rect.top) / CELL_H);
		dragMoved = false;
		swallowClick = false;
		dragging = null;
		activeKey = key;
		try {
			dragEl.setPointerCapture(e.pointerId);
		} catch {
			// capture is a nicety; the drag works without it
		}
	}

	function dragMove(e: PointerEvent) {
		if (dragPid === null || e.pointerId !== dragPid || !dragBlock) return;
		e.stopPropagation();
		const rect = layer?.getBoundingClientRect();
		if (!rect) return;
		if (!dragMoved) {
			if (Math.abs(e.clientY - dragStartY) <= 8) return;
			dragMoved = true;
		}
		const { start, end } = blockMinutes(dragBlock);
		const row = Math.round((e.clientY - rect.top) / CELL_H);
		const delta = (row - dragGrabRow) * STEP_MIN;
		const w =
			dragKind === 'start'
				? resizeWindowStart(start, end, start + delta, bounds)
				: dragKind === 'end'
					? resizeWindowEnd(start, end, end + delta, bounds)
					: shiftWindow(start, end, delta, bounds);
		dragging = { day: dragBlock.day, start, window: w };
	}

	function dragUp(e: PointerEvent) {
		if (dragPid === null || e.pointerId !== dragPid || !dragBlock) return;
		e.stopPropagation();
		const block = dragBlock;
		const live = dragging;
		if (dragMoved && live) {
			if (dragKind === 'start') {
				onChange(resizeBlockStart(blocks, block.day, live.start, live.window.start, bounds));
			} else if (dragKind === 'end') {
				onChange(resizeBlockEnd(blocks, block.day, live.start, live.window.end, bounds));
			} else {
				onChange(shiftBlock(blocks, block.day, live.start, live.window.start - live.start, bounds));
			}
			swallowClick = true;
		}
		releaseDrag(e.pointerId);
		resetDrag();
	}

	function dragCancel(e: PointerEvent) {
		if (dragPid === null || e.pointerId !== dragPid) return;
		releaseDrag(e.pointerId);
		resetDrag();
	}

	function releaseDrag(id: number) {
		try {
			dragEl?.releasePointerCapture(id);
		} catch {
			// already released
		}
	}

	function resetDrag() {
		dragPid = null;
		dragEl = null;
		dragBlock = null;
		dragMoved = false;
		dragging = null;
		activeKey = null;
	}

	function tapStrip(block: ScheduleBlock, delta: number) {
		if (swallowClick) {
			swallowClick = false;
			return;
		}
		nudge(block, delta);
	}

	function tapBody(block: ScheduleBlock) {
		if (swallowClick) {
			swallowClick = false;
			return;
		}
		removeWindow(block);
	}

	// Keyboard on a focused control. The arrow keys move the window one step,
	// earlier or later. On the top strip, Shift with the arrow keys changes only
	// the start; on the bottom strip, only the end. Both clamp to the day range
	// and keep at least one step, exactly as a drag does.
	function onBlockKey(e: KeyboardEvent, block: ScheduleBlock, kind: DragKind) {
		const delta = e.key === 'ArrowUp' ? -STEP_MIN : e.key === 'ArrowDown' ? STEP_MIN : null;
		if (delta === null) return;
		e.preventDefault();
		const blockStart = timeToMinutes(block.start);
		if (e.shiftKey && kind === 'start') {
			onChange(resizeBlockStart(blocks, block.day, blockStart, blockStart + delta, bounds));
			return;
		}
		if (e.shiftKey && kind === 'end') {
			onChange(
				resizeBlockEnd(blocks, block.day, blockStart, timeToMinutes(block.end) + delta, bounds),
			);
			return;
		}
		nudge(block, delta);
	}

	// Geometry for a block's place on the grid, in the same units the cells use.
	function blockTop(start: number) {
		return rowForMinutes(start, bounds.start) * CELL_H;
	}
	function spanHeight(start: number, end: number) {
		return ((end - start) / STEP_MIN) * CELL_H;
	}
	function colLeft(day: number) {
		return (day / 7) * 100;
	}
	const COL_W = 100 / 7;

	// One row per saved window, in weekday then time order, so the list is the
	// windows themselves and a swipe removes exactly one.
	const windowRows = $derived(
		sortBlocks(blocks).map((b) => {
			const { start, end } = blockMinutes(b);
			return {
				key: `${b.day}-${b.start}`,
				block: b,
				label: `${DAY_LABELS[b.day]} ${formatWindow(start, end)}`,
				time: formatWindow(start, end),
				dayLabel: DAY_LABELS[b.day] ?? `Day ${b.day}`,
			};
		}),
	);

	// A row swipe, the way iOS does it: drag sideways to reveal the remove action,
	// and once past the threshold let go to remove. A shorter swipe snaps back and
	// changes nothing. The remove button beside it keeps a non-swipe path.
	let swipePid: number | null = null;
	let swipeKey = $state<string | null>(null);
	let swipeStartX = 0;
	let swipeStartY = 0;
	let swipeActive = false;
	let swipeDx = $state(0);

	function swipeDown(e: PointerEvent, key: string) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		if (swipePid !== null) return;
		swipePid = e.pointerId;
		swipeKey = key;
		swipeStartX = e.clientX;
		swipeStartY = e.clientY;
		swipeActive = false;
		swipeDx = 0;
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			// capture is a nicety; the swipe works without it
		}
	}

	function swipeMove(e: PointerEvent) {
		if (swipePid === null || e.pointerId !== swipePid) return;
		const dx = e.clientX - swipeStartX;
		const dy = e.clientY - swipeStartY;
		if (!swipeActive) {
			// Only take over once the gesture is clearly sideways, so a vertical
			// scroll of the list is never stolen.
			if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) swipeActive = true;
			else return;
		}
		e.preventDefault();
		swipeDx = dx;
	}

	function resetSwipe() {
		swipePid = null;
		swipeKey = null;
		swipeActive = false;
		swipeDx = 0;
	}

	function swipeUp(e: PointerEvent, block: ScheduleBlock) {
		if (swipePid === null || e.pointerId !== swipePid) return;
		const remove = swipeActive && Math.abs(swipeDx) >= SWIPE_REMOVE_PX;
		resetSwipe();
		if (remove) removeWindow(block);
	}

	function swipeCancel(e: PointerEvent) {
		if (swipePid === null || e.pointerId !== swipePid) return;
		resetSwipe();
	}
</script>

<div class="grid min-w-0 gap-3">
	<div class="min-w-0 rounded-xl border border-hairline bg-sunken/60 p-3">
		<p class="text-xs font-medium">Add a window to several days</p>
		<p class="mt-1 text-xs text-steel">
			Adds the same window on every day in the range, from the first day to the last. The range can
			be a single day.
		</p>
		<div class="mt-2 flex flex-wrap items-end gap-2">
			<label class="flex flex-col gap-1">
				<span class="text-[10px] uppercase tracking-wide text-steel">First day</span>
				<select
					bind:value={bulkFromDay}
					class="tabular rounded-lg border border-hairline bg-paper px-2 py-2 text-sm"
				>
					{#each DAY_LABELS as label, d (d)}
						<option value={String(d)}>{label}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[10px] uppercase tracking-wide text-steel">Last day</span>
				<select
					bind:value={bulkToDay}
					class="tabular rounded-lg border border-hairline bg-paper px-2 py-2 text-sm"
				>
					{#each DAY_LABELS as label, d (d)}
						<option value={String(d)}>{label}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[10px] uppercase tracking-wide text-steel">From</span>
				<select
					bind:value={bulkStartTime}
					class="tabular rounded-lg border border-hairline bg-paper px-2 py-2 text-sm"
				>
					{#each startSlots as m (m)}
						<option value={minutesToTime(m)}>{formatTime(m)}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[10px] uppercase tracking-wide text-steel">To</span>
				<select
					bind:value={bulkEndTime}
					class="tabular rounded-lg border border-hairline bg-paper px-2 py-2 text-sm"
				>
					{#each endSlots as m (m)}
						<option value={minutesToTime(m)}>{formatTime(m)}</option>
					{/each}
				</select>
			</label>
			<button
				type="button"
				onclick={addBulkFromForm}
				class="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
			>
				Add to those days
			</button>
		</div>
		{#if bulkPreview}
			<p class="mt-2 text-xs text-steel" aria-live="polite">This adds {bulkPreview}</p>
		{/if}
		{#if bulkMessage}
			<p class="mt-2 text-xs text-warn">{bulkMessage}</p>
		{/if}
	</div>

	<div class="min-w-0 rounded-xl border border-hairline bg-paper p-2">
		<div class="grid-scroll scroll-modern min-w-0 overflow-auto overscroll-contain">
			<div style="min-width: {7 * DAY_W + 44}px">
				<div class="sticky top-0 z-20 flex gap-1 bg-paper pb-1" aria-hidden="true">
					<div class="w-10 shrink-0"></div>
					<div class="grid flex-1" style="grid-template-columns: repeat(7, 1fr)">
						{#each DAY_LABELS as label, d (d)}
							<span
								class="tabular text-center text-[10px] font-medium uppercase tracking-wide {activeSet &&
								!activeSet.has(d)
									? 'text-steel/40'
									: 'text-steel'}"
								>{label.slice(0, 3)}</span
							>
						{/each}
					</div>
				</div>
				<div class="flex gap-1">
					<div
						class="sticky left-0 z-10 w-10 shrink-0 border-r border-hairline bg-paper"
						style="height: {bounds.rows * CELL_H}px"
						aria-hidden="true"
					>
						{#each hourMarks as h (h)}
							<span
								class="tabular absolute right-1 text-[10px] leading-none text-steel"
								style="top: {((h - bounds.start) / STEP_MIN) * CELL_H}px">{formatHourLabel(h)}</span
							>
						{/each}
					</div>
					<div class="min-w-0 flex-1">
						<div
							bind:this={layer}
							class="relative touch-manipulation select-none rounded-md ring-1 ring-hairline"
							style="height: {bounds.rows * CELL_H}px"
							role="group"
							aria-label="Weekly training windows. Tap an empty slot to add a window, or tap a saved window's body to remove it. Tap an arrow at a window's edge to move it fifteen minutes, drag the body to move it, or drag an edge to change that end."
							onpointerdown={down}
							onpointermove={move}
							onpointerup={finish}
							onpointercancel={cancel}
							ontouchmove={onTouchMove}
						>
							<div
								class="pointer-events-none grid h-full w-full"
								style="grid-template-columns: repeat(7, 1fr); grid-template-rows: repeat({bounds.rows}, {CELL_H}px); grid-auto-flow: column;"
								aria-hidden="true"
							>
								{#each DAYS as d (d)}
									{#each rowIndexes as r (r)}
										<div
											class="border-b border-hairline {d > 0 ? 'border-l' : ''} {activeSet &&
											!activeSet.has(d)
												? 'bg-sunken/60'
												: minutesForRow(r, bounds.start) % 60 === 0
													? 'bg-sunken/40'
													: ''}"
										></div>
									{/each}
								{/each}
							</div>

							{#if preview}
								<div
									class="pointer-events-none absolute rounded-md border border-dashed border-signal bg-signal-wash"
									style="left: calc({colLeft(preview.day)}% + 2px); width: calc({COL_W}% - 4px); top: {blockTop(
										preview.start,
									)}px; height: {spanHeight(preview.start, preview.end)}px"
									aria-hidden="true"
								></div>
							{/if}

							{#each blocks as block (block.day + '-' + block.start)}
								{@const start = timeToMinutes(block.start)}
								{@const end = timeToMinutes(block.end)}
								{@const key = block.day + '-' + block.start}
								{@const isDragging =
									dragging !== null && dragging.day === block.day && dragging.start === start}
								{@const win = isDragging && dragging ? dragging.window : { start, end }}
								{@const h = spanHeight(win.start, win.end)}
								{@const rh = Math.max(h, MIN_BLOCK_H)}
								{@const strip = Math.min(STRIP_H, Math.floor(rh / 3))}
								{@const lifted = activeKey === key || isDragging}
								{@const label = `${DAY_LABELS[block.day]} ${formatWindow(start, end)}`}
								<div
									data-block
									class="absolute touch-none overflow-hidden rounded-md border border-signal-ink bg-signal-wash text-[10px] font-medium leading-tight text-signal-ink transition-[box-shadow,transform] duration-150 {activeSet &&
									!activeSet.has(block.day)
										? 'opacity-50'
										: ''} {lifted
										? 'z-30 origin-top scale-[1.03] shadow-lg outline outline-2 outline-offset-1 outline-signal-ink'
										: ''}"
									style="left: calc({colLeft(block.day)}% + 2px); width: calc({COL_W}% - 4px); top: {blockTop(
										win.start,
									)}px; height: {rh}px"
									role="group"
									aria-label={label}
								>
									<button
										type="button"
										onpointerdown={(e) => startDrag(e, block, key, 'start')}
										onpointermove={dragMove}
										onpointerup={dragUp}
										onpointercancel={dragCancel}
										onclick={() => tapStrip(block, -STEP_MIN)}
										onkeydown={(e) => onBlockKey(e, block, 'start')}
										aria-label={`Move ${label} fifteen minutes earlier. Hold Shift and use the arrow keys to change the start.`}
										class="absolute inset-x-0 top-0 z-10 flex items-center justify-center rounded-t-[5px] bg-signal/20 text-signal-ink hover:bg-signal/35 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-ink {lifted
											? 'md:cursor-grabbing'
											: 'md:cursor-grab'}"
										style="height: {strip}px"
									>
										<svg
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="h-3 w-3"
											aria-hidden="true"
										>
											<path d="M6 15l6-6 6 6" />
										</svg>
									</button>
									<button
										type="button"
										onpointerdown={(e) => startDrag(e, block, key, 'move')}
										onpointermove={dragMove}
										onpointerup={dragUp}
										onpointercancel={dragCancel}
										onclick={() => tapBody(block)}
										onkeydown={(e) => onBlockKey(e, block, 'move')}
										aria-label={`Remove ${label}`}
										title={label}
										class="absolute inset-x-0 z-0 w-full text-left hover:bg-signal/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-ink {lifted
											? 'md:cursor-grabbing'
											: 'md:cursor-grab'}"
										style="top: {strip}px; bottom: {strip}px"
									>
										{#if rh - strip * 2 >= 16}
											<span class="tabular block truncate px-1">{formatTime(win.start)}</span>
										{/if}
									</button>
									<button
										type="button"
										onpointerdown={(e) => startDrag(e, block, key, 'end')}
										onpointermove={dragMove}
										onpointerup={dragUp}
										onpointercancel={dragCancel}
										onclick={() => tapStrip(block, STEP_MIN)}
										onkeydown={(e) => onBlockKey(e, block, 'end')}
										aria-label={`Move ${label} fifteen minutes later. Hold Shift and use the arrow keys to change the end.`}
										class="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center rounded-b-[5px] bg-signal/20 text-signal-ink hover:bg-signal/35 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-ink {lifted
											? 'md:cursor-grabbing'
											: 'md:cursor-grab'}"
										style="height: {strip}px"
									>
										<svg
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="h-3 w-3"
											aria-hidden="true"
										>
											<path d="M6 9l6 6 6-6" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
		<p class="mt-2 text-xs leading-relaxed text-steel">
			Tap an empty slot to add a window, or tap a window's body to remove it. Tap an arrow at a
			window's edge to move the window fifteen minutes, drag the body to move it, and drag an edge
			to change that end. Keyboard: the arrow keys move a focused window, and Shift with the arrow
			keys on an edge changes that edge. Skipping this is fine: with no windows, the plan treats
			any day and any time as available.
		</p>
	</div>

	{#if windowRows.length}
		<div class="min-w-0 rounded-xl border border-hairline bg-paper p-3">
			<div class="flex items-baseline justify-between gap-2">
				<p class="tabular text-xs uppercase tracking-widest text-steel">Your windows</p>
				<button
					type="button"
					onclick={() => {
						clearUndo();
						onChange([]);
					}}
					class="text-xs text-steel hover:text-danger"
				>
					Clear all
				</button>
			</div>
			<ul class="window-scroll scroll-modern mt-2 grid gap-1">
				{#each windowRows as row (row.key)}
					<li class="relative overflow-hidden rounded-md border border-hairline">
						<div
							class="absolute inset-0 flex items-center justify-center bg-danger text-xs font-medium text-paper"
							aria-hidden="true"
						>
							Remove
						</div>
						<div
							class="relative flex touch-pan-y items-center gap-2 bg-paper py-2 pl-3 pr-1 text-sm {swipeKey ===
							row.key
								? ''
								: 'transition-transform duration-150'}"
							style="transform: translateX({swipeKey === row.key ? swipeDx : 0}px)"
							role="group"
							aria-label={`${row.label}. Swipe left or right to remove.`}
							onpointerdown={(e) => swipeDown(e, row.key)}
							onpointermove={swipeMove}
							onpointerup={(e) => swipeUp(e, row.block)}
							onpointercancel={swipeCancel}
						>
							<span class="min-w-0 flex-1 truncate">{row.label}</span>
							<button
								type="button"
								onpointerdown={(e) => e.stopPropagation()}
								onclick={() => removeWindow(row.block)}
								aria-label={`Remove ${row.label}`}
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-steel hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-ink"
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="h-4 w-4"
									aria-hidden="true"
								>
									<path d="M18 6L6 18M6 6l12 12" />
								</svg>
							</button>
						</div>
					</li>
				{/each}
			</ul>
			{#if undoBlocks}
				<div
					class="mt-2 flex items-center justify-between gap-2 rounded-md bg-sunken/70 px-3 py-2 text-xs"
					aria-live="polite"
				>
					<span class="min-w-0 truncate text-steel">Removed {undoLabel}.</span>
					<button type="button" onclick={undoRemove} class="shrink-0 font-medium text-signal-ink">
						Undo
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<p class="text-xs leading-relaxed text-steel">
			No windows yet. Add the times you are usually free on each day, or skip this. Skipping is
			fine: with no windows, any day and any time is treated as available.
		</p>
	{/if}
</div>

<style>
	/*
	 * The grid is a deliberate two-way scroller, so it gets its own height cap.
	 * vh keeps it bounded everywhere; dvh is the upgrade where the mobile browser
	 * reports it, so the bottom rows are not hidden behind the browser chrome.
	 */
	.grid-scroll {
		max-height: 60vh;
		max-height: 60dvh;
	}

	/*
	 * The windows list is bounded too, so it never grows without bound. About
	 * seven rows show before it scrolls inside; on a short screen the cap follows
	 * the viewport instead. Clear all and the undo line sit outside this box.
	 */
	.window-scroll {
		max-height: 17.5rem;
		max-height: min(17.5rem, 42dvh);
		overflow-y: auto;
		overscroll-behavior: contain;
	}
</style>
