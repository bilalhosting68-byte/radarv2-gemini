import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaperTradingService } from '../src/modules/paperTrading/paperTrading.service';

const { mockPrisma, mockRedis } = vi.hoisted(() => {
  return {
    mockPrisma: {
      paperPosition: {
        count: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn()
      },
      tokenSignal: {
        findUnique: vi.fn(),
        create: vi.fn()
      },
      signalDecision: {
        create: vi.fn()
      },
      paperTradeEvent: {
        create: vi.fn()
      }
    },
    mockRedis: {
      sadd: vi.fn(),
      srem: vi.fn()
    }
  }
});

vi.mock('../src/modules/storage/database.service', () => ({
  prisma: mockPrisma
}));

vi.mock('../src/modules/storage/redis.service', () => ({
  getRedisConnection: () => mockRedis
}));

vi.mock('../src/modules/queue/queue.service', () => ({
  getQueue: () => ({ add: vi.fn() })
}));

describe('PaperTradingService', () => {
  let paperTradingService: PaperTradingService;

  beforeEach(() => {
    paperTradingService = new PaperTradingService();
    vi.clearAllMocks();
  });

  it('should skip entry if risk is too high', async () => {
    mockPrisma.paperPosition.count.mockResolvedValue(0);
    mockPrisma.paperPosition.findFirst.mockResolvedValue(null);
    mockPrisma.tokenSignal.findUnique.mockResolvedValue({ id: '123' });

    const ctx: any = {
      signal: { tokenAddress: 't', pairAddress: 'p', liquidityUsd: 50000, volume5mUsd: 10000, buyRatio: 0.8, marketCapUsd: 100000 },
      riskScore: 90,
      riskLevel: 'EXTREME'
    };

    await paperTradingService.evaluateEntry(ctx);

    expect(mockPrisma.signalDecision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ decision: 'SKIPPED' })
    }));
    expect(mockPrisma.paperPosition.create).not.toHaveBeenCalled();
  });
});
