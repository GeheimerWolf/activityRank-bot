import { ShardingManager } from 'discord.js';
import { keys } from 'const/config.js';
import { serve } from '@hono/node-server';
import fct from './util/fct.js';
import logger from './util/logger.js';
import scheduler from './cron/scheduler.js';
import { buildRouter } from 'router.js';

if (!process.env.NODE_ENV || process.env.NODE_ENV != 'production')
  process.env.NODE_ENV = 'development';

const managerOptions = {
  token: keys.botAuth,
  // shardList: Array.from(Array(20).keys()),
  // totalShards: 20
};
const manager = new ShardingManager('./dist/bot/bot.js', managerOptions);

start().catch(async (e) => {
  logger.fatal(e);
  await fct.waitAndReboot(3000);
});

async function start() {
  await manager.spawn({ delay: 10000, timeout: 120000 });

  const router = buildRouter(manager);
  serve({ fetch: router.fetch, port: 3000 });

  await scheduler.start(manager);
}

// Process Exit
process.on('SIGINT', () => {
  logger.warn('SIGINT signal received in Manager');
});

process.on('SIGTERM', () => {
  logger.warn('SIGTERM signal received in Manager');
});
