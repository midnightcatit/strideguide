<script lang="ts">
	import { api } from '$lib/api';

	const benefits = [
		{
			title: 'A plan built for your goal',
			body: 'Marathon, half, 10K, 5K or general fitness. We write the weeks around your race date and the days you can train.',
		},
		{
			title: 'Guided workouts',
			body: 'Warm-ups, intervals and rest timers run themselves, so you follow the session instead of reading it.',
		},
		{
			title: 'Every gym machine explained',
			body: 'Form cues, the muscles worked, and what you should feel on each Planet Fitness machine.',
		},
		{
			title: 'The research behind each session',
			body: 'Why this workout, in plain language, with the studies it comes from.',
		},
		{
			title: 'Works offline',
			body: 'Log the whole session at the gym with no signal. It syncs when you are back.',
		},
		{
			title: 'Progress you can see',
			body: 'Adherence, weekly volume and pace trends over the plan.',
		},
	];
</script>

<div class="min-h-dvh flex flex-col">
	<header class="px-6 py-5">
		<span class="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
			<svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true">
				<path d="M14 46 L26 30 L34 38 L50 18" fill="none" stroke="var(--signal)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
				<circle cx="50" cy="18" r="5" fill="var(--signal)" />
			</svg>
			Stride Guide
		</span>
	</header>

	<main class="flex-1">
		<div class="mx-auto w-full max-w-5xl px-6 pb-16 pt-4">
			<div class="reveal">
				<p class="tabular text-xs uppercase tracking-widest text-steel">Running and strength, together</p>
				<h1 class="font-display mt-2 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
					A training plan that fits your race, your pace and your week.
				</h1>
				<p class="mt-3 max-w-2xl text-base text-steel">
					Built for two runners, from 5K to marathon, with strength sessions for the machines you
					actually have at the gym.
				</p>
			</div>

			<div class="mt-8 grid gap-8 lg:grid-cols-5 lg:items-start">
				<!-- Benefits -->
				<ul class="order-2 space-y-4 lg:order-1 lg:col-span-3">
					{#each benefits as b (b.title)}
						<li class="flex gap-3">
							<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden="true"></span>
							<div>
								<p class="font-medium">{b.title}</p>
								<p class="mt-0.5 text-sm text-steel">{b.body}</p>
							</div>
						</li>
					{/each}
				</ul>

				<!-- Sign in -->
				<div class="order-1 lg:order-2 lg:col-span-2 lg:sticky lg:top-8">
					<div class="rounded-xl border border-hairline bg-paper p-5">
						<p class="text-sm text-steel">Sign in to build your plan and start training.</p>
						<button
							type="button"
							onclick={() => api.login()}
							class="mt-4 flex w-full items-center justify-center gap-3 rounded-md bg-ink px-5 py-3.5 text-sm font-medium text-paper hover:opacity-90"
						>
							<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
								<path fill="#fff" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
								<path fill="#fff" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
								<path fill="#fff" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
								<path fill="#fff" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
							</svg>
							Continue with Google
						</button>
						<p class="mt-3 text-xs text-steel">
							We use your Google account only to sign you in. No posts, no contacts, no email.
						</p>
					</div>
					<p class="mt-3 text-center text-xs text-steel">Free to use. Built to run on Cloudflare's free tier.</p>
					<p class="mt-4 text-center text-xs text-steel">
						<a href="/privacy" class="hover:text-ink">Privacy</a>
						<span class="px-1">·</span>
						<a href="/terms" class="hover:text-ink">Terms</a>
					</p>
				</div>
			</div>
		</div>
	</main>
</div>
