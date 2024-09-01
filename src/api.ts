import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Client, ShardingManager } from 'discord.js';
import { keys } from 'const/config.js';

const app = new Hono();

app.use('*', bearerAuth({ token: keys.managerApiAuth }));

app.get('/version', (c) => c.json({ version: '1' }));

export function buildApiRouter(manager: ShardingManager): Hono {
  // * List Client Guild IDs
  // This endpoint should be called rarely, if at all: List Matching Guild IDs should be preferred.
  app.get('/guild-ids', async (c) => {
    const load = (client: Client) => Array.from(client.guilds.cache.keys());
    const guildIds = (await manager.broadcastEval(load)).flat();
    return c.json(guildIds);
  });

  // * List Matching Guild IDs
  // Returns all guild IDs that are both included in the provided body, and that the client is in.
  // ? Uses POST due to the need for a JSON body: query strings could be used but 
  // ? might be un-idiomatic given there could be up to 200 arguments passed.
  // Requires a JSON array of (string) snowflakes as the body.
  app.post(
    '/guild-ids/matching',
    async (q, nxt) => {
      console.log(q.req.queries());
      await nxt();
    },
    zValidator('json', z.array(z.string().regex(/\d{17,20}/))),
    async (c) => {
      const match = c.req.valid('json');

      const load = (client: Client, ctx: { match: string[] }) =>
        Array.from(client.guilds.cache.keys()).filter((id) => ctx.match.includes(id));

      const guildIds = (await manager.broadcastEval(load, { context: { match } })).flat();

      return c.json(guildIds);
    },
  );

  return app;
}

export default app;
