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

vi.mock('../src/modules/storage/database.service', () => ({ prisma: mockPrisma }));
vi.mock('../src/modules/storage/redis.service', () => ({ getRedisConnection: () => mockRedis }));
vi.mock('../src/modules/queue/queue.service', () => ({ getQueue: () => ({ add: vi.fn() }) }));

describe('PaperTradingService Full Suite', () => {
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
      riskScore: 90, riskLevel: 'EXTREME'
    };
    await paperTradingService.evaluateEntry(ctx);
    expect(mockPrisma.signalDecision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ decision: 'SKIPPED' })
    }));
  });

  it('should evaluate exit for Stop Loss', async () => {
    const position = { 
      id: 'pos1', status: 'OPEN', entryExecutionPriceUsd: 100, 
      stopLossPercent: 10, takeProfitPercent: 50, trailingStopPercent: 10, 
      highestPriceUsd: 100, openedAt: new Date() 
    };
    mockPrisma.paperPosition.findUnique.mockResolvedValue(position);
    const executeExitSpy = vi.spyOn(paperTradingService, 'executeExit').mockResolvedValue(undefined);
    
    await paperTradingService.evaluateExit('pos1', 89, 10000); // 11% loss
    expect(executeExitSpy).toHaveBeenCalledWith(expect.anything(), 89, 10000, 'STOP_LOSS');
  });

  it('should evaluate exit for Take Profit', async () => {
    const position = { 
      id: 'pos1', status: 'OPEN', entryExecutionPriceUsd: 100, 
      stopLossPercent: 10, takeProfitPercent: 50, trailingStopPercent: 10, 
      highestPriceUsd: 100, openedAt: new Date() 
    };
    mockPrisma.paperPosition.findUnique.mockResolvedValue(position);
    const executeExitSpy = vi.spyOn(paperTradingService, 'executeExit').mockResolvedValue(undefined);
    
    await paperTradingService.evaluateExit('pos1', 151, 10000); // 51% gain
    expect(executeExitSpy).toHaveBeenCalledWith(expect.anything(), 151, 10000, 'TAKE_PROFIT');
  });

  it('should evaluate exit for Trailing Stop', async () => {
    const position = { 
      id: 'pos1', status: 'OPEN', entryExecutionPriceUsd: 100, 
      stopLossPercent: 10, takeProfitPercent: 100, trailingStopPercent: 10, 
      highestPriceUsd: 150, openedAt: new Date() 
    };
    mockPrisma.paperPosition.findUnique.mockResolvedValue(position);
    const executeExitSpy = vi.spyOn(paperTradingService, 'executeExit').mockResolvedValue(undefined);
    
    // Highest was 150, 10% trailing stop is 135. Price 134 should trigger.
    await paperTradingService.evaluateExit('pos1', 134, 10000);
    expect(executeExitSpy).toHaveBeenCalledWith(expect.anything(), 134, 10000, 'TRAILING_STOP');
  });

  it('should evaluate exit for Max Hold Time', async () => {
    const position = { 
      id: 'pos1', status: 'OPEN', entryExecutionPriceUsd: 100, 
      stopLossPercent: 10, takeProfitPercent: 100, trailingStopPercent: 10, 
      highestPriceUsd: 100, openedAt: new Date(Date.now() - 31 * 60000) // 31 mins ago
    };
    mockPrisma.paperPosition.findUnique.mockResolvedValue(position);
    const executeExitSpy = vi.spyOn(paperTradingService, 'executeExit').mockResolvedValue(undefined);
    
    await paperTradingService.evaluateExit('pos1', 100, 10000);
    expect(executeExitSpy).toHaveBeenCalledWith(expect.anything(), 100, 10000, 'MAX_HOLD');
  });
});
