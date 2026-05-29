import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../logger';

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    
    redisConnection.on('error', (err) => {
      logger.error({ error: err }, 'Redis connection error');
    });

    redisConnection.on('ready', () => {
      logger.info('Connected to Redis');
    });
  }
  return redisConnection;
}

export async function closeRedis() {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    logger.info('Redis connection closed');
  }
}
