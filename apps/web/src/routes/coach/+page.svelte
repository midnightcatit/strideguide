<script lang="ts">
	import { api } from '$lib/api';
	import Card from '$lib/components/Card.svelte';

	interface Msg {
		role: 'user' | 'coach';
		text: string;
	}

	let messages = $state<Msg[]>([]);
	let input = $state('');
	let sending = $state(false);
	let error = $state<string | null>(null);

	const starters = [
		'How hard should today feel?',
		'Should I move a session if I am sore?',
		'Am I ready to increase my long run?',
	];

	async function ask(text: string) {
		const q = text.trim();
		if (!q || sending) return;
		messages = [...messages, { role: 'user', text: q }];
		input = '';
		sending = true;
		error = null;
		try {
			const res = await api.chat(q);
			messages = [
				...messages,
				{ role: 'coach', text: res.reply?.trim() || "I don't have a useful answer for that one." },
			];
		} catch {
			error = 'The coach is unavailable right now. Try again in a moment.';
		} finally {
			sending = false;
		}
	}
</script>

<header class="mb-7">
	<p class="tabular text-xs uppercase tracking-widest text-steel">Coach</p>
	<h1 class="font-display mt-1 text-2xl font-bold">Ask anything</h1>
	<p class="mt-0.5 text-sm text-steel">Answers use your plan, your logged runs and our research. Not medical advice.</p>
</header>

{#if messages.length === 0}
	<Card>
		<p class="text-sm text-steel">Try one of these to start:</p>
		<div class="mt-3 flex flex-col gap-2">
			{#each starters as s (s)}
				<button
					type="button"
					onclick={() => ask(s)}
					class="rounded-md border border-hairline px-4 py-3 text-left text-sm hover:border-signal hover:text-signal-ink"
				>
					{s}
				</button>
			{/each}
		</div>
	</Card>
{:else}
	<ul class="space-y-4">
		{#each messages as m, i (i)}
			<li>
				{#if m.role === 'user'}
					<Card tone="sunken">
						<p class="text-sm">{m.text}</p>
					</Card>
				{:else}
					<div class="flex gap-3">
						<span class="tabular mt-0.5 shrink-0 text-xs uppercase tracking-widest text-steel">Coach</span>
						<p class="flex-1 whitespace-pre-line text-sm">{m.text}</p>
					</div>
				{/if}
			</li>
		{/each}
		{#if sending}
			<li>
				<div class="flex gap-3">
					<span class="tabular mt-0.5 shrink-0 text-xs uppercase tracking-widest text-steel">Coach</span>
					<p class="flex-1 text-sm text-steel">Thinking…</p>
				</div>
			</li>
		{/if}
	</ul>
{/if}

{#if error}
	<p class="mt-4 text-sm text-signal-ink">{error}</p>
{/if}

<div class="mt-6 flex gap-2">
	<input
		bind:value={input}
		onkeydown={(e) => {
			if (e.key === 'Enter') ask(input);
		}}
		placeholder="Ask the coach…"
		aria-label="Message the coach"
		class="flex-1 rounded-md border border-hairline bg-paper px-4 py-3 text-sm"
	/>
	<button
		type="button"
		onclick={() => ask(input)}
		disabled={sending || !input.trim()}
		class="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
	>
		Send
	</button>
</div>
