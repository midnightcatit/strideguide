/**
 * The one "today" the app reads. A page used to capture the date once at mount,
 * so a tab left open across midnight kept yesterday, and a phone woken from sleep
 * never picked the new day. This store ticks on focus and on the tab becoming
 * visible, and once a minute as a safety net, so every screen follows the day the
 * runner is actually in.
 */
import { localIso } from '@strideguide/shared/dates';

export const today = $state<{ iso: string }>({ iso: localIso() });

function refresh(): void {
	const iso = localIso();
	if (iso !== today.iso) today.iso = iso;
}

if (typeof window !== 'undefined') {
	setInterval(refresh, 60_000);
	window.addEventListener('focus', refresh);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') refresh();
	});
}
