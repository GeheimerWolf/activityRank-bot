import { Hono } from 'hono';
import {buildApiRouter} from './api.js';
import type { ShardingManager } from 'discord.js';

const router = new Hono();

router.get('/', (c) => {
  return c.text('ActivityRank Bot');
});

export function buildRouter(manager: ShardingManager): Hono {
  router.route('/api/v1', buildApiRouter(manager));

  return router;
}
