import { prisma } from '../storage/database.service';
import { getRedisConnection } from '../storage/redis.service';
import { getQueue } from '../queue/queue.service';
import { DexScreenerAdapter } from '../ingestion/adapters/dexscreener.adapter';
import { MockRealtimeAdapter } from '../ingestion/adapters/mockRealtime.adapter';
import { env } from '../../config/env';
import { logger } from '../../logger';

export class PriceTrackerService {
  private adapter: DexScreenerAdapter | MockRealtimeAdapter;

  constructor() {
    this.adapter = env.DATA_SOURCE_MODE === 'mock' || env.ENABLE_MOCK_REALTIME 
      ? new MockRealtimeAdapter() 
      : new DexScreenerAdapter();
  }

  async runUpdateCycle() {
    try {
      const openPositions = await prisma.paperPosition.findMany({
        where: { status: 'OPEN' }
      });

      if (openPositions.length === 0) return;

      const queue = getQueue('position.evaluate-exit');

      for (const pos of openPositions) {
        const data = await this.adapter.fetchPairByAddress(pos.pairAddress);
        
        if (!data || !data.priceUsd) {
          // Stale price check
          const lastUpdate = pos.updatedAt.getTime();
          const staleMinutes = (Date.now() - lastUpdate) / (1000 * 60);
          if (staleMinutes >= env.PRICE_STALE_MINUTES) {
            logger.warn({ positionId: pos.id }, 'Price is stale, evaluating exit');
            // Mock a sell at last known price with a penalty
            await queue.add('evaluate-exit', {
              positionId: pos.id,
              marketPrice: pos.currentPriceUsd,
              liquidityUsd: 0,
              forceReason: 'STALE_PRICE'
            });
          }
          continue;
        }

        await prisma.priceSnapshot.create({
          data: {
            tokenAddress: data.tokenAddress,
            pairAddress: data.pairAddress,
            priceUsd: data.priceUsd,
            liquidityUsd: data.liquidityUsd,
            marketCapUsd: data.marketCapUsd,
            volume5mUsd: data.volume5mUsd,
            source: env.DATA_SOURCE_MODE
          }
        });

        // Add to queue for exit evaluation
        await queue.add('evaluate-exit', {
          positionId: pos.id,
          marketPrice: data.priceUsd,
          liquidityUsd: data.liquidityUsd
        });
      }
    } catch (error) {
      logger.error({ error }, 'Error in price update cycle');
    }
  }
}
