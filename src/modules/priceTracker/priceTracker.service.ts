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
    this.adapter = env.DATA_SOURCE_MODE === 'mock'
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
        try {
          const data = await this.adapter.fetchPairByAddress(pos.pairAddress);
          
          if (!data || !data.priceUsd) {
            // Stale price check
            const lastUpdate = pos.updatedAt.getTime();
            const staleMinutes = (Date.now() - lastUpdate) / (1000 * 60);
            if (staleMinutes >= env.PRICE_STALE_MINUTES) {
              logger.warn({ positionId: pos.id }, 'Price is stale, evaluating exit');
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
        } catch (innerError: any) {
          logger.error({ error: innerError, pairAddress: pos.pairAddress }, 'Failed to fetch price for position');
          await prisma.botEvent.create({
            data: {
              level: 'ERROR',
              source: 'PRICE_TRACKER',
              type: 'API_ERROR',
              message: innerError.message || 'Unknown error',
              metadata: { pairAddress: pos.pairAddress }
            }
          });
        }
      }
    } catch (error: any) {
      logger.error({ error }, 'Error in price update cycle');
      await prisma.botEvent.create({
        data: {
          level: 'ERROR',
          source: 'PRICE_TRACKER',
          type: 'SYSTEM_ERROR',
          message: error.message || 'Unknown error',
          metadata: {}
        }
      });
    }
  }
}
