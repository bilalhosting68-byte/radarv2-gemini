import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskService } from '../src/modules/risk/risk.service';
import { TokenSignalInput } from '../src/types';

vi.mock('../src/modules/risk/onchainChecks.service', () => ({
  runOnchainChecks: vi.fn().mockResolvedValue([
    { name: 'Mock Check', status: 'UNKNOWN', penalty: 5, message: 'Mock' }
  ])
}));

describe('RiskService', () => {
  let riskService: RiskService;

  beforeEach(() => {
    riskService = new RiskService();
  });

  it('should apply penalty for missing pair address', async () => {
    const signal: any = { priceUsd: 1, liquidityUsd: 20000, volume5mUsd: 10000, buyRatio: 0.8, marketCapUsd: 50000, pairAgeMinutes: 10, tokenAddress: 'token' };
    const result = await riskService.analyzeRisk(signal);
    const check = result.checks.find(c => c.name === 'Pair Address');
    expect(check?.penalty).toBe(50);
  });

  it('should map score to correct risk level', async () => {
    const signal: any = {
      pairAddress: 'pair', tokenAddress: 'token', priceUsd: 1,
      liquidityUsd: 20000, volume5mUsd: 10000, buyRatio: 0.8,
      marketCapUsd: 50000, pairAgeMinutes: 10
    };
    const result = await riskService.analyzeRisk(signal);
    // score should be 5 (from unknown mock check)
    expect(result.level).toBe('LOW');
  });
});
