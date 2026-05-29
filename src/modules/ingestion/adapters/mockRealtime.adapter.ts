import { IngestionAdapter } from '../ingestion.types';
import { TokenSignalInput } from '../../../types';
import { logger } from '../../../logger';

export class MockRealtimeAdapter implements IngestionAdapter {
  async fetchLatestCandidates(): Promise<TokenSignalInput[]> {
    logger.info('MockRealtimeAdapter: Generating fake token candidates');
    const mockToken: TokenSignalInput = {
      tokenAddress: `mock_token_${Date.now()}`,
      pairAddress: `mock_pair_${Date.now()}`,
      chain: 'solana',
      dex: 'raydium',
      symbol: 'MOCK',
      name: 'Mock Token',
      priceUsd: Math.random() * 0.01,
      liquidityUsd: 15000 + Math.random() * 50000,
      marketCapUsd: 50000 + Math.random() * 200000,
      volume5mUsd: 6000 + Math.random() * 10000,
      volume1hUsd: 50000,
      buys5m: Math.floor(Math.random() * 50) + 10,
      sells5m: Math.floor(Math.random() * 20) + 5,
      buyRatio: 0.7,
      pairAgeMinutes: 10,
      pairCreatedAt: new Date(Date.now() - 10 * 60 * 1000),
      url: 'https://dexscreener.com',
      rawData: { mock: true, source: 'mock' }
    };
    return [mockToken];
  }

  async fetchPairByAddress(pairAddress: string): Promise<TokenSignalInput | null> {
    logger.info({ pairAddress }, 'MockRealtimeAdapter: Generating fake pair data');
    return {
      tokenAddress: `mock_token_${pairAddress}`,
      pairAddress,
      chain: 'solana',
      dex: 'raydium',
      symbol: 'MOCK',
      name: 'Mock Token',
      priceUsd: Math.random() * 0.01,
      liquidityUsd: 20000,
      marketCapUsd: 60000,
      volume5mUsd: 7000,
      volume1hUsd: 60000,
      buys5m: 20,
      sells5m: 10,
      buyRatio: 0.66,
      pairAgeMinutes: 15,
      pairCreatedAt: new Date(Date.now() - 15 * 60 * 1000),
      url: 'https://dexscreener.com',
      rawData: { mock: true, source: 'mock' }
    };
  }
}
