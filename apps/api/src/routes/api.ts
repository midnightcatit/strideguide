import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { AppBindings } from '../types';
import ai from './ai';
import exercises from './exercises';
import goals from './goals';
import health from './health';
import logs from './logs';
import plans from './plans';

const api = new Hono<AppBindings>();

api.route('/health', health);

const secured = new Hono<AppBindings>();
secured.use('*', requireAuth);
secured.route('/goals', goals);
secured.route('/plans', plans);
secured.route('/logs', logs);
secured.route('/exercises', exercises);
secured.route('/ai', ai);

api.route('/', secured);

export default api;
