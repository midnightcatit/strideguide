import type { ApiUser } from '@strideguide/shared';
import type { Db } from './db';
import type { Env } from './env';

export type AppBindings = {
	Bindings: Env;
	Variables: {
		db: Db;
		user?: ApiUser;
	};
};
