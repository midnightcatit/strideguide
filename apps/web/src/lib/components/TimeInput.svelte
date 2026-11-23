<script lang="ts">
	let { seconds, onChange }: { seconds: number; onChange: (secs: number) => void } = $props();

	const h = $derived(Math.floor(seconds / 3600));
	const m = $derived(Math.floor((seconds % 3600) / 60));
	const s = $derived(seconds % 60);

	function set(part: 'h' | 'm' | 's', raw: number) {
		const v = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
		const hh = part === 'h' ? v : h;
		const mm = part === 'm' ? Math.min(59, v) : m;
		const ss = part === 's' ? Math.min(59, v) : s;
		onChange(hh * 3600 + mm * 60 + ss);
	}
</script>

<div class="flex items-end gap-2">
	<label class="flex flex-col items-center">
		<input
			type="number"
			min="0"
			max="9"
			value={h}
			onchange={(e) => set('h', Number((e.currentTarget as HTMLInputElement).value))}
			aria-label="Hours"
			class="tabular w-16 rounded-xl border border-hairline bg-paper px-2 py-3 text-center text-sm"
		/>
		<span class="mt-1 text-[10px] uppercase tracking-wide text-steel">hrs</span>
	</label>
	<label class="flex flex-col items-center">
		<input
			type="number"
			min="0"
			max="59"
			value={m}
			onchange={(e) => set('m', Number((e.currentTarget as HTMLInputElement).value))}
			aria-label="Minutes"
			class="tabular w-16 rounded-xl border border-hairline bg-paper px-2 py-3 text-center text-sm"
		/>
		<span class="mt-1 text-[10px] uppercase tracking-wide text-steel">min</span>
	</label>
	<label class="flex flex-col items-center">
		<input
			type="number"
			min="0"
			max="59"
			value={s}
			onchange={(e) => set('s', Number((e.currentTarget as HTMLInputElement).value))}
			aria-label="Seconds"
			class="tabular w-16 rounded-xl border border-hairline bg-paper px-2 py-3 text-center text-sm"
		/>
		<span class="mt-1 text-[10px] uppercase tracking-wide text-steel">sec</span>
	</label>
</div>
