import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import * as schema from '@strideguide/shared/db';
import { ACCOUNT_DELETES } from './account';

/** Column names that tie a row to one user. */
const USER_COLUMNS = new Set(['user_id', 'owner_user_id', 'viewer_user_id']);

/** Every table in the schema that can hold a row belonging to a user. */
function userOwnedTables(): string[] {
	return Object.values(schema)
		.flatMap((value) => {
			try {
				return [getTableConfig(value as never)];
			} catch {
				return [];
			}
		})
		.filter((config) => config.columns.some((column) => USER_COLUMNS.has(column.name)))
		.map((config) => config.name);
}

describe('account delete', () => {
	it('deletes every table that can hold a user row', () => {
		const covered = new Set(Object.keys(ACCOUNT_DELETES));
		for (const table of userOwnedTables()) {
			expect(covered.has(table), `no delete for ${table}`).toBe(true);
		}
	});

	it('deletes the users row last', () => {
		expect(Object.keys(ACCOUNT_DELETES).at(-1)).toBe('users');
	});
});
