<script lang="ts">
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
</script>

<SettingsHeader title="About" />

<section class="grid gap-5 text-sm leading-relaxed">
	<p>
		Stride Guide builds a running and strength plan from your goal, your race paces and a few
		preferences, then guides you through each session with timers, warm-ups and the reasoning
		behind the work.
	</p>
	<p class="text-steel">
		The plan is built from fixed rules, so the same inputs give the same plan. Explanations come
		from published research, and the coach is grounded in that research rather than inventing it.
	</p>
	<p class="rounded-lg border border-hairline bg-sunken p-3 text-xs text-steel">
		Form cues and explanations are guidance, not medical advice. If something hurts in a sharp or
		worsening way, see a professional.
	</p>
	<p class="text-sm">
		<a href="/privacy" class="text-signal-ink underline-offset-2 hover:underline">Privacy Policy</a>
		<span class="text-steel"> · </span>
		<a href="/terms" class="text-signal-ink underline-offset-2 hover:underline">Terms of Service</a>
	</p>
</section>
