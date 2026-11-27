import type { ClientPrescription } from '$lib/plan';

/** A prescription block: a move and the sets it runs. */
type Block = NonNullable<ClientPrescription['blocks']>[number];

/**
 * The facts a strength card shows, read from the prescription's own blocks.
 *
 * The set count comes from the stored sets and never from a fixed number. The
 * engine gives the full dose in base, cuts a set through build and peak, and
 * shortens the taper session, so a card that assumed three sets lied about
 * every session the arc had cut.
 */
export function strengthPills(blocks: Block[] | undefined): string[] {
	const machines = blocks ?? [];
	const out: string[] = [];
	if (machines.length) out.push(`${machines.length} moves`);
	const sets = machines[0]?.sets?.length ?? 0;
	const reps = machines[0]?.sets?.[0]?.reps ?? 0;
	if (sets && reps) out.push(`${sets} × ${reps}`);
	return out;
}
