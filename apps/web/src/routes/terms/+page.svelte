<script lang="ts">
	// Public page: reachable without signing in, because the OAuth consent screen
	// links to it. Keep it readable and unadorned.
	const updated = 'November 2026';
	const sections = [
		{ id: 'accept', label: 'Acceptance' },
		{ id: 'service', label: 'The service' },
		{ id: 'medical', label: 'Not medical advice' },
		{ id: 'account', label: 'Your account' },
		{ id: 'use-left', label: 'Acceptable use' },
		{ id: 'content', label: 'Your content' },
		{ id: 'third', label: 'Third-party services' },
		{ id: 'ip', label: 'Intellectual property' },
		{ id: 'changes', label: 'Availability and changes' },
		{ id: 'disclaimers', label: 'Disclaimers' },
		{ id: 'liability', label: 'Limitation of liability' },
		{ id: 'term', label: 'Termination' },
		{ id: 'law', label: 'Governing law' },
		{ id: 'contact', label: 'Contact' },
	];
</script>

<header class="mb-8">
	<a href="/" class="text-sm text-steel hover:text-ink">‹ Back to Stride Guide</a>
	<h1 class="font-display mt-3 text-3xl font-bold">Terms of Service</h1>
	<p class="mt-1 text-sm text-steel">Last updated {updated}</p>
</header>

<p class="text-sm leading-relaxed">
	These terms govern your use of Stride Guide. By creating an account or using the app you agree to
	them. If you do not agree, do not use the app.
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
	<section id="accept" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Acceptance</h2>
		<p class="mt-2">
			By using Stride Guide you accept these terms and our Privacy Policy. You confirm you are old
			enough to enter a binding agreement where you live.
		</p>
	</section>

	<section id="service" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">The service</h2>
		<p class="mt-2">
			Stride Guide builds a running and strength plan from the information you give it and guides
			you through sessions. It is a training aid. You are responsible for your own training
			decisions and for how you apply what the app suggests.
		</p>
	</section>

	<section id="medical" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Not medical advice</h2>
		<p class="mt-2">
			Stride Guide is not a medical device and does not provide medical advice, diagnosis or
			treatment. Check with a qualified professional before starting a training program, and stop
			and seek help if you feel unwell or something hurts in a sharp or worsening way.
		</p>
	</section>

	<section id="account" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Your account</h2>
		<p class="mt-2">
			You sign in with Google. Keep your account secure. You are responsible for activity under your
			account.
		</p>
	</section>

	<section id="use-left" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Acceptable use</h2>
		<ul class="mt-2 list-disc space-y-1.5 pl-5">
			<li>Do not misuse the service, attempt to break it, or access it other than through the app.</li>
			<li>Do not use it to break the law or to harm others.</li>
			<li>Do not scrape, resell, or reverse engineer the service except as the law allows.</li>
		</ul>
	</section>

	<section id="content" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Your content</h2>
		<p class="mt-2">
			You keep ownership of what you write, such as session notes. You give us permission to store
			and process it to run the service, including to build and adapt your plan and to generate
			coach text.
		</p>
	</section>

	<section id="third" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Third-party services</h2>
		<p class="mt-2">
			The app uses Google for sign-in and optionally Google Health for activity and health data.
			Your use of those services is governed by their terms. Connecting a source is optional and
			you can disconnect it at any time.
		</p>
	</section>

	<section id="ip" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Intellectual property</h2>
		<p class="mt-2">
			Stride Guide, including its name, design, plan engine and content, belongs to us or our
			licensors. These terms do not grant you rights to it beyond using the app as intended.
		</p>
	</section>

	<section id="changes" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Availability and changes</h2>
		<p class="mt-2">
			We may add, change or remove features, and the service may be unavailable at times. We aim to
			tell you about material changes.
		</p>
	</section>

	<section id="disclaimers" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Disclaimers</h2>
		<p class="mt-2">
			The service is provided "as is" and "as available", without warranties of any kind to the
			extent the law allows, including fitness for a particular purpose and that training will meet
			your goals.
		</p>
	</section>

	<section id="liability" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Limitation of liability</h2>
		<p class="mt-2">
			To the extent the law allows, we are not liable for indirect or consequential losses, or for
			injury arising from your training decisions or from following guidance in the app, and our
			total liability is limited to the amount you paid us in the last twelve months.
		</p>
	</section>

	<section id="term" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Termination</h2>
		<p class="mt-2">
			You can stop using the app and delete your data at any time. We may suspend or end access if
			these terms are broken or to protect the service or other people.
		</p>
	</section>

	<section id="law" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Governing law</h2>
		<p class="mt-2">
			These terms are governed by the laws of <span class="font-medium">[jurisdiction]</span>, and
			its courts have exclusive jurisdiction, unless your local law gives you other rights.
		</p>
	</section>

	<section id="contact" class="scroll-mt-24">
		<h2 class="font-display text-lg font-bold">Contact</h2>
		<p class="mt-2">Questions about these terms: <span class="font-medium">[contact email]</span>.</p>
	</section>
</div>
