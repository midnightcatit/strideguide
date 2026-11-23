/**
 * Shared state for info popovers, so only one is ever open. Each InfoButton has
 * an id; the open id lives here.
 */
let openId = $state<string | null>(null);

export function isInfoOpen(id: string): boolean {
	return openId === id;
}

export function toggleInfo(id: string): void {
	openId = openId === id ? null : id;
}

export function closeInfo(): void {
	openId = null;
}
