<script lang="ts">
	/**
	 * A weekly training-window grid: seven day columns, half-hour rows.
	 *
	 * Pointer: tap a half-hour to add an hour, drag to add a longer window, and
	 * tap a saved window to remove it. Keyboard: the "Add a window" controls below
	 * the grid add a window with a day and two times, and every saved window is a
	 * real button you can focus and activate to remove it. So nothing here is
	 * drag-only.
	 */
	import {
		DAY_LABELS,
		GRID_START_MIN,
		STEP_MIN,
		addBlock,
		daySummary,
		formatHourLabel,
		formatTime,
		formatWindow,
		gridBounds,
		minutesForRow,
		minutesToTime,
		removeBlockAt,
		rowForMinutes,
		timeToMinutes,
		windowForDrag,
		windowForTap,
	} from '$lib/schedule';
	import type { ScheduleBlock } from '@strideguide/shared/units';

	let {
		blocks,
		onChange,
	}: { blocks: ScheduleBlock[]; onChange: (blocks: ScheduleBlock[]) => void } = $props();

	// One cell is 16px tall. The grid is the default 04:00 to 23:00 (38 rows, so
	// 608px), widened to include any stored window outside that range so nothing
	// is hidden. The maths on a tap or a drag reads straight off the rectangle.
	const CELL_H = 16;
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

	function remove(block: ScheduleBlock) {
		onChange(removeBlockAt(blocks, block.day, timeToMinutes(block.start)));
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
		// A saved window is its own button; a press on it removes, not paints.
		if ((e.target as Element | null)?.closest('button')) return;
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

<div class="grid gap-3">
	<div class="rounded-xl border border-hairline bg-sunken/60 p-3">
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

	<div class="rounded-xl border border-hairline bg-paper p-2">
		<div class="max-h-[60vh] overflow-y-auto overscroll-contain">
			<div class="flex gap-1">
				<div
					class="relative w-10 shrink-0"
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
						class="sticky top-0 z-10 mb-1 grid bg-paper"
						style="grid-template-columns: repeat(7, 1fr)"
						aria-hidden="true"
					>
						{#each DAY_LABELS as label, d (d)}
							<span
								class="tabular text-center text-[10px] font-medium uppercase tracking-wide text-steel"
								>{label.slice(0, 3)}</span
							>
						{/each}
					</div>
					<div
						bind:this={layer}
						class="relative touch-pan-y select-none rounded-md ring-1 ring-hairline"
						style="height: {bounds.rows * CELL_H}px"
						role="group"
						aria-label="Weekly training windows. Drag or tap to add a free window; each saved window is a button you can activate to remove it."
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
										class="border-b border-hairline {d > 0 ? 'border-l' : ''} {minutesForRow(
											r,
											bounds.start,
										) %
											60 ===
										0
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
							<button
								type="button"
								onclick={() => remove(block)}
								aria-label={`Remove ${DAY_LABELS[block.day]} ${formatWindow(start, end)}`}
								title={`${DAY_LABELS[block.day]} ${formatWindow(start, end)}`}
								class="absolute overflow-hidden rounded-md border border-signal-ink bg-signal-wash px-1 text-left text-[10px] font-medium leading-tight text-signal-ink hover:bg-signal/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-ink"
								style="left: calc({colLeft(block.day)}% + 2px); width: calc({COL_W}% - 4px); top: {blockTop(
									start,
								)}px; height: {h}px"
							>
								{#if h >= 32}
									<span class="tabular">{formatTime(start)}</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
		<p class="mt-2 text-xs leading-relaxed text-steel">
			Tap a half-hour to add an hour, or drag to add a longer window. On a phone, press and hold
			first, then drag. Tap a window to remove it, or use the controls above. Every saved window is
			also a button you can focus and activate. The grid runs from 4 in the morning to 11 at night,
			and scrolls to reach the early and late rows.
		</p>
	</div>

	{#if summary.length}
		<div class="rounded-xl border border-hairline bg-paper p-3">
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
						<span>{d.label}</span>
						<span class="tabular text-right text-steel">{d.windows}</span>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<p class="text-xs leading-relaxed text-steel">
			No windows yet. Add the times you are usually free on each day, or carry on without any.
		</p>
	{/if}
</div>
