import { expect, it } from 'vitest';
import { reconcileSessions, type ExistingSession, type DesiredSession } from './plan-reconcile';

const stored = (id: string, day: number, slot: string, type: string): ExistingSession => ({
	id,
	day,
	slot,
	type,
});
const want = (day: number, slot: string, type: string): DesiredSession & { tag: string } => ({
	day,
	slot,
	type,
	tag: `${day}-${slot}-${type}`,
});

it('keeps the id of a session whose logical identity is unchanged across a rebuild', () => {
	const existing = [stored('s1', 0, 'AM', 'easy'), stored('s2', 2, 'AM', 'tempo')];
	const { updates, inserts, deletes } = reconcileSessions(existing, [
		want(0, 'AM', 'easy'),
		want(2, 'AM', 'tempo'),
	]);
	expect(updates.map((u) => u.id).sort()).toEqual(['s1', 's2']);
	expect(inserts).toEqual([]);
	expect(deletes).toEqual([]);
});

it('drops the old id and mints a new one when the session type changes', () => {
	// The runner rated tempo down and the rebuild swapped it for interval. The
	// logged tempo should not be relabelled an interval, so the ids do not match.
	const existing = [stored('s1', 2, 'AM', 'tempo')];
	const { updates, inserts, deletes } = reconcileSessions(existing, [want(2, 'AM', 'interval')]);
	expect(updates).toEqual([]);
	expect(inserts.map((s) => s.type)).toEqual(['interval']);
	expect(deletes).toEqual(['s1']);
});

it('lets two sessions that share a day and slot each consume a stored id in order', () => {
	// A planned easy run and an added workout both sit in the AM slot.
	const existing = [stored('p', 0, 'AM', 'easy'), stored('a', 0, 'AM', 'machine-circuit')];
	const { updates, inserts, deletes } = reconcileSessions(existing, [
		want(0, 'AM', 'easy'),
		want(0, 'AM', 'machine-circuit'),
	]);
	expect(updates.map((u) => u.id).sort()).toEqual(['a', 'p']);
	expect(inserts).toEqual([]);
	expect(deletes).toEqual([]);
});

it('removes a stored session the rebuilt week no longer carries', () => {
	const existing = [stored('keep', 0, 'AM', 'easy'), stored('gone', 4, 'AM', 'long')];
	const { updates, inserts, deletes } = reconcileSessions(existing, [want(0, 'AM', 'easy')]);
	expect(updates.map((u) => u.id)).toEqual(['keep']);
	expect(inserts).toEqual([]);
	expect(deletes).toEqual(['gone']);
});

it('treats a null stored slot as the morning slot', () => {
	const existing = [stored('s1', 1, null as unknown as string, 'easy')];
	const { updates, deletes } = reconcileSessions(existing, [want(1, 'AM', 'easy')]);
	expect(updates.map((u) => u.id)).toEqual(['s1']);
	expect(deletes).toEqual([]);
});
