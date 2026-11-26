<script lang="ts">
	/**
	 * A weekly training-window grid: seven day columns, quarter-hour rows.
	 *
	 * Pointer: tap a slot to add an hour, drag to add a longer window, and tap a
	 * saved window's body to remove it. Each saved window also has a handle: its
	 * arrows nudge the window fifteen minutes earlier or later, and a press and
	 * drag on the handle moves it up and down the day. Keyboard: the "Add a
	 * window" and "Add a window to several days" controls below add windows with a
	 * day range and two times, every saved window's body is a real button you can
	 * focus and activate to remove it, and the handle's arrows are real buttons
	 * whose arrow keys nudge the window. So nothing here is drag-only.
	 *
	 * The day columns hold a fixed minimum width and the grid scrolls sideways,
	 * so a phone shows a comfortable column and the whole week stays reachable.
	 *
	 * An optional `activeDays` list dims the columns of days the runner has not
	 * picked. It is a cue only: every column stays editable, so the touch,
	 * keyboard and bulk-add paths are exactly as before.
	 */
	import {
		DAY_LABELS,
		GRID_START_MIN,
		STEP_MIN,
		addBlock,
		addBulk,
		blockMinutes,
		daySummary,
		describeBulk,
		formatHourLabel,
		formatTime,
		formatWindow,
		gridBounds,
		minutesForRow,
		minutesToTime,
		removeBlockAt,
		rowForMinutes,
		shiftBlock,
		shiftWindow,
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
	// A block shorter than this still draws tall enough for its handle and a
	// tappable body. A quarter-hour block is one cell (16px) tall, which the
	// handle alone would cover.
	const MIN_BLOCK_H = 34;
	// The move handle's height, tall enough for the two arrow targets and an easy
	// grab, with the arrows drawn inside it. Kept under MIN_BLOCK_H so a tappable
	// body is always left below it.
	const HANDLE_H = 20;
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

	// Adding from the controls: day, start and end. A plain, keyboard-reachable
	// path that does not need the grid at all.
	let dayKey = $state('0');
	let startTime = $state(minutesToTime(GRID_START_MIN + 60));
	let endTime = $state(minutesToTime(GRID_START_MIN + 120));
	let message = $state('');

	// The bulk path: the same window on every day from one weekday to another, so
	// a whole week or a working stretch takes one go. Kept beside the single-day
	// path rather than replacing it.
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

	function addFromForm() {
		const start = timeToMinutes(startTime);
		const end = timeToMinutes(endTime);
		if (!(end > start)) {
			message = 'Pick an end time after the start time.';
			return;
		}
		onChange(addBlock(blocks, Number(dayKey), start, end));
		message = '';
	}

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

	function remove(block: ScheduleBlock) {
		onChange(removeBlockAt(blocks, block.day, timeToMinutes(block.start)));
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

	// The move handle on a saved window. The block sets `touch-action: none`, so a
	// press on the handle never scrolls the page or the grid, and the drag can arm
	// at once with no press-and-hold wait. A tap that never moves nudges the
	// window one step earlier; a drag moves it up and down the day, shown live
	// while it runs and committed on release. Edges clamp at the day range; a
	// window never rolls into the next day.
	let movePid: number | null = null;
	let moveHandle: HTMLElement | null = null;
	let moveBlock: ScheduleBlock | null = null;
	let moveGrabRow = 0;
	let moveStartY = 0;
	let moveDragged = false;
	let moving = $state<{ day: number; start: number; window: MinuteWindow } | null>(null);

	function armMove(id: number) {
		try {
			moveHandle?.setPointerCapture(id);
		} catch {
			// capture is a nicety; the drag works without it
		}
	}

	function releaseMove(id: number) {
		try {
			moveHandle?.releasePointerCapture(id);
		} catch {
			// already released
		}
	}

	function resetMove() {
		movePid = null;
		moveHandle = null;
		moveBlock = null;
		moveDragged = false;
		moving = null;
		activeKey = null;
	}

	function handleDown(e: PointerEvent, block: ScheduleBlock, key: string) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		if (movePid !== null) return;
		e.stopPropagation();
		const rect = layer?.getBoundingClientRect();
		if (!rect) return;
		movePid = e.pointerId;
		moveHandle = e.currentTarget as HTMLElement;
		moveBlock = block;
		moveStartY = e.clientY;
		moveGrabRow = Math.round((e.clientY - rect.top) / CELL_H);
		moveDragged = false;
		moving = null;
		activeKey = key;
		armMove(e.pointerId);
	}

	function handleMove(e: PointerEvent) {
		if (movePid === null || e.pointerId !== movePid || !moveBlock) return;
		e.stopPropagation();
		const rect = layer?.getBoundingClientRect();
		if (!rect) return;
		if (Math.abs(e.clientY - moveStartY) > 8) moveDragged = true;
		const { start, end } = blockMinutes(moveBlock);
		const row = Math.round((e.clientY - rect.top) / CELL_H);
		const w = shiftWindow(start, end, (row - moveGrabRow) * STEP_MIN, bounds);
		moving = { day: moveBlock.day, start, window: w };
	}

	function handleUp(e: PointerEvent) {
		if (movePid === null || e.pointerId !== movePid || !moveBlock) return;
		e.stopPropagation();
		const block = moveBlock;
		const preview = moving;
		if (moveDragged && preview) {
			onChange(
				shiftBlock(blocks, block.day, preview.start, preview.window.start - preview.start, bounds),
			);
		} else {
			nudge(block, -STEP_MIN);
		}
		releaseMove(e.pointerId);
		resetMove();
	}

	function handleCancel(e: PointerEvent) {
		if (movePid === null || e.pointerId !== movePid) return;
		releaseMove(e.pointerId);
		resetMove();
	}

	// Arrow keys on a focused control move the window one step, up for earlier and
	// down for later. The arrows and the body all bubble here, so either works.
	function onBlockKey(e: KeyboardEvent, block: ScheduleBlock) {
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		e.preventDefault();
		nudge(block, e.key === 'ArrowUp' ? -STEP_MIN : STEP_MIN);
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

	const summary = $derived(daySummary(blocks));
</script>

<div class="grid min-w-0 gap-3">
	<div class="min-w-0 rounded-xl border border-hairline bg-sunken/60 p-3">
		<p class="text-xs font-medium">Add a window</p>
		<div class="mt-2 flex flex-wrap items-end gap-2">
			<label class="flex flex-col gap-1">
				<span class="text-[10px] uppercase tracking-wide text-steel">Day</span>
				<select
					bind:value={dayKey}
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
					bind:value={startTime}
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
					bind:value={endTime}
					class="tabular rounded-lg border border-hairline bg-paper px-2 py-2 text-sm"
				>
					{#each endSlots as m (m)}
						<option value={minutesToTime(m)}>{formatTime(m)}</option>
					{/each}
				</select>
			</label>
			<button
				type="button"
				onclick={addFromForm}
				class="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
			>
				Add
			</button>
		</div>
		{#if message}
			<p class="mt-2 text-xs text-warn">{message}</p>
		{/if}
	</div>

	<div class="min-w-0 rounded-xl border border-hairline bg-sunken/60 p-3">
		<p class="text-xs font-medium">Add a window to several days</p>
		<p class="mt-1 text-xs text-steel">
			Adds the same window on every day in the range, from the first day to the last one.
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
							aria-label="Weekly training windows. Tap or drag an empty slot to add a window. Each saved window's body removes it, its arrows move it fifteen minutes earlier or later, and you can drag its handle to move it further."
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
								{@const h = spanHeight(start, end)}
								{@const rh = Math.max(h, MIN_BLOCK_H)}
								{@const key = block.day + '-' + block.start}
								{@const isMoving =
									moving !== null && moving.day === block.day && moving.start === start}
								{@const win = isMoving && moving ? moving.window : { start, end }}
								{@const lifted = activeKey === key || isMoving}
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
									onpointerup={() => (activeKey = null)}
									onpointercancel={() => (activeKey = null)}
								>
									<button
										type="button"
										onpointerdown={() => (activeKey = key)}
										onpointerleave={() => {
											// Leaving the body ends a body press; a handle drag is
											// kept, so its own capture clears the lift.
											if (movePid === null) activeKey = null;
										}}
										onclick={() => remove(block)}
										onkeydown={(e) => onBlockKey(e, block)}
										aria-label={`Remove ${label}`}
										title={label}
										class="absolute inset-0 w-full text-left hover:bg-signal/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-ink"
									>
										{#if rh >= 32}
											<span class="tabular block px-1" style="padding-top: {HANDLE_H}px"
												>{formatTime(win.start)}</span
											>
										{/if}
									</button>
									<div
										class="absolute inset-x-0 top-0 flex items-center justify-between px-0.5 transition-colors {lifted
											? 'bg-signal/35'
											: 'bg-signal/15'} {lifted ? 'md:cursor-grabbing' : 'md:cursor-grab'}"
										style="height: {Math.min(HANDLE_H, rh)}px"
										role="group"
										aria-label={`Move ${label}`}
										onpointerdown={(e) => handleDown(e, block, key)}
										onpointermove={handleMove}
										onpointerup={handleUp}
										onpointercancel={handleCancel}
									>
										<button
											type="button"
											onpointerdown={(e) => e.stopPropagation()}
											onclick={() => nudge(block, -STEP_MIN)}
											onkeydown={(e) => onBlockKey(e, block)}
											aria-label={`Move ${label} fifteen minutes earlier`}
											class="flex h-full w-4 items-center justify-center rounded-sm text-signal-ink hover:bg-signal/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-ink"
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
											onpointerdown={(e) => e.stopPropagation()}
											onclick={() => nudge(block, STEP_MIN)}
											onkeydown={(e) => onBlockKey(e, block)}
											aria-label={`Move ${label} fifteen minutes later`}
											class="flex h-full w-4 items-center justify-center rounded-sm text-signal-ink hover:bg-signal/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-ink"
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
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
		<p class="mt-2 text-xs leading-relaxed text-steel">
			Tap an empty slot to add an hour, or drag across slots to add a longer window. On a phone,
			press and hold an empty slot, then drag. Tap a window's body to remove it. The arrows at the
			top of a window move it fifteen minutes earlier or later, and you can drag the middle of the
			handle to slide it further. Every window is a button you can focus, and its arrows take the
			arrow keys. Skipping this is fine: with no windows, the plan treats any day and any time as
			available. The grid runs from 4 in the morning to 11 at night, and scrolls sideways to reach
			every day and up and down to reach the early and late rows.
		</p>
	</div>

	{#if summary.length}
		<div class="min-w-0 rounded-xl border border-hairline bg-paper p-3">
			<div class="flex items-baseline justify-between gap-2">
				<p class="tabular text-xs uppercase tracking-widest text-steel">Your windows</p>
				<button
					type="button"
					onclick={() => onChange([])}
					class="text-xs text-steel hover:text-danger"
				>
					Clear all
				</button>
			</div>
			<ul class="mt-2 grid gap-1 text-sm">
				{#each summary as d (d.day)}
					<li class="flex justify-between gap-3">
						<span class="min-w-0">{d.label}</span>
						<span class="tabular min-w-0 text-right text-steel">{d.windows}</span>
					</li>
				{/each}
			</ul>
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
</style>
