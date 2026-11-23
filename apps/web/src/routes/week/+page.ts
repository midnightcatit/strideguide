import { redirect } from '@sveltejs/kit';

/** The week view was folded into the calendar (month grid and list). */
export function load(): never {
	redirect(308, '/calendar');
}
