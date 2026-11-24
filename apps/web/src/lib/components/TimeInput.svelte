<script lang="ts">
	let { seconds, onChange }: { seconds: number; onChange: (secs: number) => void } = $props();

	const h = $derived(Math.floor(seconds / 3600));
	const m = $derived(Math.floor((seconds % 3600) / 60));
	const s = $derived(seconds % 60);

	// Show a blank field while a part is zero, so tapping it and typing replaces
	// the zero cleanly. Typing 32 in minutes gives 32, never 032.
	function display(v: number): string {
		return v === 0 ? '' : String(v);
	}

	function set(part: 'h' | 'm' | 's', raw: string) {
		const parsed = raw.trim() === '' ? 0 : Number(raw);
		const v = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
		const hh = part === 'h' ? v : h;
		const mm = part === 'm' ? Math.min(59, v) : m;
		const ss = part === 's' ? Math.min(59, v) : s;
		onChange(hh * 3600 + mm * 60 + ss);
	}
</script>

<div class="flex w-full items-end gap-2">
	<label class="flex min-w-0 flex-1 flex-col items-center">
		<input
			type="number"
			min="0"
			max="9"
			value={display(h)}
			oninput={(e) => set('h', (e.currentTarget as HTMLInputElement).value)}
			onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
			aria-label="Hours"
			class="tabular w-full min-w-0 rounded-xl border border-hairline bg-paper px-2 py-3 text-center text-sm"
		/>
		<span class="mt-1 text-[10px] uppercase tracking-wide text-steel">hrs</span>
	</label>
	<label class="flex min-w-0 flex-1 flex-col items-center">
		<input
			type="number"
			min="0"
			max="59"
			value={display(m)}
			oninput={(e) => set('m', (e.currentTarget as HTMLInputElement).value)}
			onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
			aria-label="Minutes"
			class="tabular w-full min-w-0 rounded-xl border border-hairline bg-paper px-2 py-3 text-center text-sm"
		/>
		<span class="mt-1 text-[10px] uppercase tracking-wide text-steel">min</span>
	</label>
	<label class="flex min-w-0 flex-1 flex-col items-center">
		<input
			type="number"
			min="0"
			max="59"
			value={display(s)}
			oninput={(e) => set('s', (e.currentTarget as HTMLInputElement).value)}
			onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
			aria-label="Seconds"
			class="tabular w-full min-w-0 rounded-xl border border-hairline bg-paper px-2 py-3 text-center text-sm"
		/>
		<span class="mt-1 text-[10px] uppercase tracking-wide text-steel">sec</span>
	</label>
</div>
