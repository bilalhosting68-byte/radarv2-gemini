import { IngestionAdapter } from './ingestion.types';
import { TokenSignalInput } from '../../types';
import { env } from '../../config/env';
import { DexScreenerAdapter } from './adapters/dexscreener.adapter';
import { MockRealtimeAdapter } from './adapters/mockRealtime.adapter';
import { getQueue } from '../queue/queue.service';
import { getRedisConnection } from '../storage/redis.service';
import { logger } from '../../logger';

export class IngestionService {
  private adapter: IngestionAdapter;

  constructor() {
    if (env.DATA_SOURCE_MODE === 'mock') {
      this.adapter = new MockRealtimeAdapter();
      logger.info('Using MockRealtimeAdapter for ingestion (DATA_SOURCE_MODE=mock)');
    } else {
      this.adapter = new DexScreenerAdapter();
      logger.info('Using DexScreenerAdapter for ingestion (DATA_SOURCE_MODE=rest)');
    }
  }

  async runScanCycle() {
    try {
      const candidates = await this.adapter.fetchLatestCandidates();
      
      if (env.ENABLE_MOCK_REALTIME && env.DATA_SOURCE_MODE === 'rest') {
        const mockAdapter = new MockRealtimeAdapter();
        const mockCandidates = await mockAdapter.fetchLatestCandidates();
        candidates.push(...mockCandidates);
        logger.debug({ count: mockCandidates.length }, 'Added extra mock candidates');
      }

      logger.info({ count: candidates.length }, 'Fetched token candidates');
      
      const redis = getRedisConnection();
      const tokenQueue = getQueue('token.discovered');
      
      for (const candidate of candidates) {
        const cacheKey = `processed_pair:${candidate.pairAddress}`;
        const alreadyProcessed = await redis.get(cacheKey);

        if (alreadyProcessed) {
          logger.debug({ pair: candidate.pairAddress }, 'Skipping already processed pair (cached)');
          continue;
        }

        // Add to cache with TTL
        await redis.set(cacheKey, '1', 'EX', env.PROCESSED_TOKEN_TTL_MINUTES * 60);

        await tokenQueue.add('process-candidate', candidate, {
          jobId: `discovered:${candidate.pairAddress}:${Date.now()}`
        });
      }
    } catch (error) {
      logger.error({ error }, 'Error during scan cycle');
    }
  }
}
