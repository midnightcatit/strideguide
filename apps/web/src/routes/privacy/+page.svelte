<script lang="ts">
	// Public page: reachable without signing in, because the OAuth consent screen
	// links to it. Keep it readable and unadorned.
	const updated = 'November 2026';
	const sections = [
		{ id: 'who', label: 'Who we are' },
		{ id: 'collect', label: 'What we collect' },
		{ id: 'use', label: 'How we use it' },
		{ id: 'health', label: 'Health data you connect' },
		{ id: 'share', label: 'Sharing and processors' },
		{ id: 'keep', label: 'Retention and deletion' },
		{ id: 'security', label: 'Security' },
		{ id: 'rights', label: 'Your choices and rights' },
		{ id: 'children', label: 'Children' },
		{ id: 'changes', label: 'Changes' },
		{ id: 'contact', label: 'Contact' },
	];
</script>

<header class="mb-8">
	<a href="/" class="text-sm text-steel hover:text-ink">‹ Back to Stride Guide</a>
	<h1 class="font-display mt-3 text-3xl font-bold">Privacy Policy</h1>
	<p class="mt-1 text-sm text-steel">Last updated {updated}</p>
</header>

<p class="text-sm leading-relaxed">
	Stride Guide is a training app. This policy explains what we collect, why, and the choices you
	have. It is written to be read once and understood.
</p>

<nav class="mt-6 rounded-lg border border-hairline bg-sunken p-4 text-sm" aria-label="Contents">
	<p class="tabular mb-2 text-xs uppercase tracking-widest text-steel">Contents</p>
	<ul class="grid gap-1.5 sm:grid-cols-2">
		{#each sections as s (s.id)}
			<li><a href="#{s.id}" class="text-steel hover:text-ink">{s.label}</a></li>
		{/each}
	</ul>
</nav>

<div class="mt-8 space-y-8 text-sm leading-relaxed">
	<section id="who" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Who we are</h2>
		<p class="mt-2">
			Stride Guide ("we", "us") is the operator of the Stride Guide app at run.midnightcatit.com.
			For anything in this policy, contact us at <span class="font-medium">[contact email]</span>.
		</p>
	</section>

	<section id="collect" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">What we collect</h2>
		<ul class="mt-2 list-disc space-y-1.5 pl-5">
			<li>
				<strong>Account.</strong> When you sign in with Google we receive your name, email address
				and a Google account identifier. We do not receive your password.
			</li>
			<li>
				<strong>Training data.</strong> Your goal, target date, race paces, equipment, weekly
				availability, and anything you log: completed sessions, how they felt, and any notes you
				write. If you add height, weight or resting heart rate, those are stored too.
			</li>
			<li>
				<strong>Health data you connect.</strong> If you connect Google Health, we read the health
				and activity data you authorize, described below.
			</li>
			<li>
				<strong>Technical data.</strong> Basic logs needed to run and secure the service, such as
				error reports. These do not include the content of your health data.
			</li>
		</ul>
	</section>

	<section id="use" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">How we use it</h2>
		<ul class="mt-2 list-disc space-y-1.5 pl-5">
			<li>Build your plan and adapt it as you train and as you tell us how sessions went.</li>
			<li>Show your progress, weekly volume, pace and completion.</li>
			<li>
				Write coaching text. When you ask the coach a question, a summary of your plan and recent
				training is sent to our model provider to produce the reply.
			</li>
			<li>Keep the service secure and fix faults.</li>
		</ul>
		<p class="mt-2">
			We do not sell your data, and we do not use it for advertising.
		</p>
	</section>

	<section id="health" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Health data you connect</h2>
		<p class="mt-2">
			Connecting Google Health is optional and you consent to specific scopes during Google's own
			consent screen. We read only what you authorize, for example your workouts, sleep and heart
			metrics, to import activities, match them to your plan, and add recovery context.
		</p>
		<ul class="mt-2 list-disc space-y-1.5 pl-5">
			<li>We never use Google Health data for advertising or to build a profile for ads.</li>
			<li>
				Access tokens are stored encrypted. You can disconnect at any time in Settings, which
				removes the stored tokens from our side, and you can also revoke access in your Google
				account.
			</li>
		</ul>
	</section>

	<section id="share" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Sharing and processors</h2>
		<p class="mt-2">We share data only with the providers that run the service:</p>
		<ul class="mt-2 list-disc space-y-1.5 pl-5">
			<li><strong>Google</strong> for sign-in and, if you connect it, Google Health.</li>
			<li><strong>Cloudflare</strong> for hosting, storage and delivery.</li>
			<li><strong>Our model provider</strong> to generate coach text and plan review from the context described above.</li>
		</ul>
		<p class="mt-2">We do not sell or rent your personal data.</p>
	</section>

	<section id="keep" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Retention and deletion</h2>
		<p class="mt-2">
			We keep your data while your account is active. You can delete everything from Settings
			("Delete my data"), which removes your plan, your logs and your connected tokens. That action
			takes effect immediately.
		</p>
	</section>

	<section id="security" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Security</h2>
		<p class="mt-2">
			We use industry-standard measures: connections are encrypted in transit, connected-account
			tokens are encrypted at rest, and access is limited to what each part of the service needs.
			No system is perfect, so keep your Google account secure too.
		</p>
	</section>

	<section id="rights" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Your choices and rights</h2>
		<ul class="mt-2 list-disc space-y-1.5 pl-5">
			<li>Disconnect a health source in Settings at any time.</li>
			<li>Delete all of your data in Settings.</li>
			<li>Ask us for a copy of your data, or to correct it, using the contact below.</li>
		</ul>
	</section>

	<section id="children" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Children</h2>
		<p class="mt-2">Stride Guide is not intended for children under 16, and we do not knowingly collect their data.</p>
	</section>

	<section id="changes" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Changes</h2>
		<p class="mt-2">
			If we change this policy we will update the date above and, for material changes, tell you in
			the app.
		</p>
	</section>

	<section id="contact" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Contact</h2>
		<p class="mt-2">Questions about privacy: <span class="font-medium">[contact email]</span>.</p>
	</section>
</div>
