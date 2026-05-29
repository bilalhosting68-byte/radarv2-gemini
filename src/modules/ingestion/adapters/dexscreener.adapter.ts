import { IngestionAdapter } from '../ingestion.types';
import { TokenSignalInput } from '../../../types';
import { env } from '../../../config/env';
import { logger } from '../../../logger';

export class DexScreenerAdapter implements IngestionAdapter {
  private lastProfileRequest = 0;
  private lastPairRequest = 0;

  private async rateLimit(type: 'profile' | 'pair') {
    const now = Date.now();
    const interval = type === 'profile' 
      ? env.DEXSCREENER_PROFILE_MIN_REQUEST_INTERVAL_MS 
      : env.DEXSCREENER_PAIR_MIN_REQUEST_INTERVAL_MS;
    
    const lastRequest = type === 'profile' ? this.lastProfileRequest : this.lastPairRequest;
    const timeSinceLast = now - lastRequest;

    if (timeSinceLast < interval) {
      await new Promise(resolve => setTimeout(resolve, interval - timeSinceLast));
    }

    if (type === 'profile') {
      this.lastProfileRequest = Date.now();
    } else {
      this.lastPairRequest = Date.now();
    }
  }

  private async fetchWithRetry(url: string, type: 'profile' | 'pair'): Promise<any> {
    for (let i = 0; i < env.DEXSCREENER_MAX_RETRIES; i++) {
      await this.rateLimit(type);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), env.DEXSCREENER_REQUEST_TIMEOUT_MS);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } catch (error: any) {
        if (i === env.DEXSCREENER_MAX_RETRIES - 1) {
          try {
            const { prisma } = await import('../../storage/database.service');
            await prisma.botEvent.create({
              data: {
                level: 'ERROR',
                source: 'DEXSCREENER',
                type: 'API_ERROR',
                message: error.message || 'DexScreener API failure',
                metadata: { endpoint: url }
              }
            });
          } catch (dbErr) {
            logger.error({ dbErr }, 'Failed to save BotEvent for DexScreener error');
          }
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // exponential backoff
      }
    }
  }

  private normalizePair(pair: any): TokenSignalInput | null {
    if (pair.chainId !== 'solana') return null;

    const buys5m = pair.txns?.m5?.buys || 0;
    const sells5m = pair.txns?.m5?.sells || 0;
    const total5m = buys5m + sells5m;
    const buyRatio = total5m > 0 ? buys5m / total5m : 0;

    const pairCreatedAt = new Date(pair.pairCreatedAt);
    const pairAgeMinutes = (Date.now() - pairCreatedAt.getTime()) / (1000 * 60);

    return {
      tokenAddress: pair.baseToken.address,
      pairAddress: pair.pairAddress,
      chain: pair.chainId,
      dex: pair.dexId,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      priceUsd: parseFloat(pair.priceUsd || '0'),
      liquidityUsd: pair.liquidity?.usd || 0,
      marketCapUsd: pair.marketCap || pair.fdv || 0,
      volume5mUsd: pair.volume?.m5 || 0,
      volume1hUsd: pair.volume?.h1 || 0,
      buys5m,
      sells5m,
      buyRatio,
      pairAgeMinutes,
      pairCreatedAt,
      url: pair.url,
      rawData: pair
    };
  }

  async fetchLatestCandidates(): Promise<TokenSignalInput[]> {
    try {
      const data = await this.fetchWithRetry('https://api.dexscreener.com/token-profiles/latest/v1', 'profile');
      if (!Array.isArray(data)) return [];

      const solanaTokens = data.filter((t: any) => t.chainId === 'solana').slice(0, env.DEXSCREENER_MAX_TOKENS_PER_SCAN);
      if (solanaTokens.length === 0) return [];

      const addresses = solanaTokens.map((t: any) => t.tokenAddress).join(',');
      const pairsData = await this.fetchWithRetry(`https://api.dexscreener.com/tokens/v1/solana/${addresses}`, 'pair');
      
      const inputs: TokenSignalInput[] = [];
      for (const pair of pairsData) {
        const normalized = this.normalizePair(pair);
        if (normalized) inputs.push(normalized);
      }
      return inputs;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch DexScreener candidates');
      return [];
    }
  }

  async fetchPairByAddress(pairAddress: string): Promise<TokenSignalInput | null> {
    try {
      const data = await this.fetchWithRetry(`https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`, 'pair');
      if (data && data.pairs && data.pairs.length > 0) {
        return this.normalizePair(data.pairs[0]);
      }
      return null;
    } catch (error) {
      logger.error({ error, pairAddress }, 'Failed to fetch DexScreener pair by address');
      return null;
    }
  }
}
