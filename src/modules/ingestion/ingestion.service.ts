import { IngestionAdapter } from './ingestion.types';
import { TokenSignalInput } from '../../types';
import { env } from '../../config/env';
import { DexScreenerAdapter } from './adapters/dexscreener.adapter';
import { MockRealtimeAdapter } from './adapters/mockRealtime.adapter';
import { getQueue } from '../queue/queue.service';
import { logger } from '../../logger';

export class IngestionService {
  private adapter: IngestionAdapter;

  constructor() {
    if (env.DATA_SOURCE_MODE === 'mock' || env.ENABLE_MOCK_REALTIME) {
      this.adapter = new MockRealtimeAdapter();
      logger.info('Using MockRealtimeAdapter for ingestion');
    } else {
      this.adapter = new DexScreenerAdapter();
      logger.info('Using DexScreenerAdapter for ingestion');
    }
  }

  async runScanCycle() {
    try {
      const candidates = await this.adapter.fetchLatestCandidates();
      logger.info({ count: candidates.length }, 'Fetched token candidates');
      
      const tokenQueue = getQueue('token.discovered');
      for (const candidate of candidates) {
        await tokenQueue.add('process-candidate', candidate, {
          jobId: `discovered:${candidate.pairAddress}:${Date.now()}`
        });
      }
    } catch (error) {
      logger.error({ error }, 'Error during scan cycle');
    }
  }
}
