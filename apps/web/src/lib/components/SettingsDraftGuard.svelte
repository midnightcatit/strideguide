<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import LeaveConfirmSheet from './LeaveConfirmSheet.svelte';

	// A page with a draft mounts this once. Any exit while the draft differs from
	// what is stored asks first, and the person either keeps editing or throws the
	// draft away and moves on. The host drops the draft through onDiscard.
	let { dirty, onDiscard }: { dirty: boolean; onDiscard: () => void } = $props();

	let confirmLeave = $state(false);
	let pendingHref = $state<string | null>(null);
	// Set just before we replay a navigation the person chose to leave with, so
	// the guard below lets it through instead of asking a second time.
	let leaving = false;

	// The tab bar, the settings back link and the browser Back button are all
	// in-app navigations, so this one guard covers every way off the page.
	beforeNavigate((nav) => {
		if (leaving || !dirty) return;
		const href = nav.to?.url.href;
		if (!href) return;
		nav.cancel();
		pendingHref = href;
		confirmLeave = true;
	});

	function keepEditing() {
		confirmLeave = false;
		pendingHref = null;
	}

	function discardAndLeave() {
		const href = pendingHref;
		confirmLeave = false;
		pendingHref = null;
		if (!href) return;
		// Drop the draft too, so the page is clean if the navigation does not finish.
		onDiscard();
		leaving = true;
		void goto(href).finally(() => {
			leaving = false;
		});
	}
</script>

<LeaveConfirmSheet open={confirmLeave} onKeep={keepEditing} onDiscard={discardAndLeave} />
