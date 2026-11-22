import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@strideguide/shared/db';
import type { Env } from './env';

export function getDb(env: Env) {
	return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
