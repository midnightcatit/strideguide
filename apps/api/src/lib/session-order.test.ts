import { expect, it } from 'vitest';
import { compareDaySessions } from './session-order';

const session = (day: number, slot: string, isAdded = false) => ({
	day,
	slot,
	prescription: isAdded ? { added: true } : {},
});

it('orders the planned sessions of a day first, then the ones the runner added', () => {
	const plannedAm = session(0, 'AM');
	const plannedPm = session(0, 'PM');
	const added = session(0, 'AM', true);
	// The added session shares the AM slot, so a slot-only sort would put it
	// before the planned PM session. It must land last instead.
	expect([plannedPm, added, plannedAm].sort(compareDaySessions)).toEqual([
		plannedAm,
		plannedPm,
		added,
	]);
});

it('sorts by day before anything else', () => {
	const monday = session(0, 'PM');
	const tuesday = session(1, 'AM');
	expect([tuesday, monday].sort(compareDaySessions)).toEqual([monday, tuesday]);
});
