/**
 * A small factory for the per-session client state: which sessions are started
 * or skipped, and where the guided player got to. The server is the source of
 * truth. Each store keeps a local snapshot for an optimistic update and for
 * offline use, and writes each change back without blocking the UI.
 *
 * Hydration from the server merges with any write still in flight, so a change
 * the runner just made is never clobbered by a plan reload that raced ahead of
 * its own write. Each store is keyed by user, so one account never reads another's
 * state on a shared device.
 */
import { cachedUserId } from './offline';

interface Config<V> {
	/** The base storage key. The signed-in user's id is appended. */
	key: string;
	/** A user id appended to the storage key, so state is per account. */
	scope?: string | null;
	/** Write a value to the server. */
	write(id: string, value: V): Promise<unknown>;
	/** Clear a value on the server. Omit for local-only clears. */
	unset?(id: string): Promise<unknown>;
	/** Turn the stored string into the value map. Defaults to a JSON object. */
	decode?(raw: string | null): Record<string, V>;
	/** Turn the value map into the stored string. Defaults to JSON. */
	encode?(value: Record<string, V>): string;
}

export interface SessionStateStore<V> {
	has(id: string): boolean;
	get(id: string): V | undefined;
	ids(): string[];
	set(id: string, value: V): void;
	clear(id: string): void;
	hydrate(entries: { id: string; value: V }[]): void;
}

function storage(): Storage | null {
	return typeof localStorage === 'undefined' ? null : localStorage;
}

export function createSessionStateStore<V>(cfg: Config<V>): SessionStateStore<V> {
	const scope = cfg.scope ?? cachedUserId() ?? 'anon';
	const fullKey = `${cfg.key}:${scope}`;
	const decode = cfg.decode ?? ((raw) => (raw ? (JSON.parse(raw) as Record<string, V>) : {}));
	const encode = cfg.encode ?? ((value) => JSON.stringify(value));

	function load(): Record<string, V> {
		const store = storage();
		if (!store) return {};
		try {
			return decode(store.getItem(fullKey));
		} catch {
			return {};
		}
	}

	// The map is reassigned on every change, so a plain top-level write is what
	// the reactive readers see.
	let map = $state<Record<string, V>>(load());
	// Ids with a write in flight, so a hydrate that arrives first does not undo them.
	const pending = new Set<string>();

	function persist(): void {
		const store = storage();
		if (!store) return;
		try {
			store.setItem(fullKey, encode(map));
		} catch {
			// ignore quota and private-mode errors
		}
	}

	function set(id: string, value: V): void {
		map = { ...map, [id]: value };
		persist();
		pending.add(id);
		void cfg
			.write(id, value)
			.catch(() => {})
			.finally(() => pending.delete(id));
	}

	function clear(id: string): void {
		if (id in map) {
			const next = { ...map };
			delete next[id];
			map = next;
			persist();
		}
		if (!cfg.unset) return;
		pending.add(id);
		void cfg
			.unset(id)
			.catch(() => {})
			.finally(() => pending.delete(id));
	}

	function hydrate(entries: { id: string; value: V }[]): void {
		const next: Record<string, V> = {};
		for (const entry of entries) next[entry.id] = entry.value;
		// Keep a local change the server has not reflected yet, so an optimistic
		// write survives a reload that raced ahead of it.
		for (const id of pending) {
			if (id in map) next[id] = map[id];
			else delete next[id];
		}
		map = next;
		persist();
	}

	return {
		has: (id) => id in map,
		get: (id) => map[id],
		ids: () => Object.keys(map),
		set,
		clear,
		hydrate,
	};
}

/** Decode a stored JSON array of ids into a boolean map. */
export function decodeIdList<V>(raw: string | null): Record<string, V> {
	if (!raw) return {};
	const list = JSON.parse(raw) as string[];
	return Object.fromEntries(list.map((id) => [id, true as V]));
}

/** Encode a boolean map back into the stored JSON array of ids. */
export function encodeIdList<V>(value: Record<string, V>): string {
	return JSON.stringify(Object.keys(value));
}
