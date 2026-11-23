import { Hono } from 'hono';
import { GOAL_PROFILES } from '@strideguide/shared';
import { requireAuth } from '../middleware/auth';
import type { AppBindings } from '../types';
import ai from './ai';
import account from './account';
import clientErrors from './client-errors';
import exercises from './exercises';
import explanations from './explanations';
import goals from './goals';
import health from './health';
import logs from './logs';
import plans from './plans';
import settings from './settings';
import summaries from './summaries';

const api = new Hono<AppBindings>();

api.route('/health', health);

// Public reference data (no user data) so onboarding can render before sign-in.
api.get('/goals/profiles', (c) => c.json({ profiles: GOAL_PROFILES }));

// Public diagnostics sink, so a stuck browser can report itself without a session.
api.route('/client-errors', clientErrors);

const secured = new Hono<AppBindings>();
secured.use('*', requireAuth);
secured.route('/goals', goals);
secured.route('/plans', plans);
secured.route('/logs', logs);
secured.route('/exercises', exercises);
secured.route('/ai', ai);
secured.route('/settings', settings);
secured.route('/explanations', explanations);
secured.route('/summaries', summaries);
secured.route('/me', account);

api.route('/', secured);

export default api;
