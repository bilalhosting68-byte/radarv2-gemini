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

  it('should evaluate exit for Trailing Stop only after profit', async () => {
    // 1. Mai in profitto: non si attiva
    const positionLoss = { 
      id: 'pos1', status: 'OPEN', entryExecutionPriceUsd: 100, 
      stopLossPercent: 50, takeProfitPercent: 100, trailingStopPercent: 10, 
      highestPriceUsd: 100, openedAt: new Date() 
    };
    mockPrisma.paperPosition.findUnique.mockResolvedValue(positionLoss);
    const executeExitSpy = vi.spyOn(paperTradingService, 'executeExit').mockResolvedValue(undefined);
    
    await paperTradingService.evaluateExit('pos1', 95, 10000); // Scende a 95
    expect(executeExitSpy).not.toHaveBeenCalledWith(expect.anything(), 95, 10000, 'TRAILING_STOP');

    // 2. In profitto, poi ritraccia: si attiva
    const positionWin = { 
      id: 'pos2', status: 'OPEN', entryExecutionPriceUsd: 100, 
      stopLossPercent: 50, takeProfitPercent: 100, trailingStopPercent: 10, 
      highestPriceUsd: 150, openedAt: new Date() 
    };
    mockPrisma.paperPosition.findUnique.mockResolvedValue(positionWin);
    
    await paperTradingService.evaluateExit('pos2', 134, 10000); // 150 * 0.9 = 135. A 134 scatta.
    expect(executeExitSpy).toHaveBeenCalledWith(expect.anything(), 134, 10000, 'TRAILING_STOP');
  });

  it('should evaluate entry correctly and open valid position', async () => {
    mockPrisma.paperPosition.count.mockResolvedValue(0);
    mockPrisma.paperPosition.findFirst.mockResolvedValue(null);
    mockPrisma.tokenSignal.findUnique.mockResolvedValue({ id: '123' });
    mockPrisma.paperPosition.create.mockResolvedValue({ id: 'new_pos_id' });
    const ctx: any = {
      signal: { tokenAddress: 't', pairAddress: 'p', liquidityUsd: 50000, volume5mUsd: 10000, buyRatio: 0.8, marketCapUsd: 100000, symbol: 'TEST', priceUsd: 1 },
      riskScore: 20, riskLevel: 'LOW'
    };
    await paperTradingService.evaluateEntry(ctx);
    expect(mockPrisma.signalDecision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ decision: 'OPENED' })
    }));
    expect(mockPrisma.paperPosition.create).toHaveBeenCalled();
  });

  it('should skip entry if price is zero or missing', async () => {
    const ctx: any = {
      signal: { tokenAddress: 't', pairAddress: 'p', liquidityUsd: 50000, volume5mUsd: 10000, buyRatio: 0.8, marketCapUsd: 100000, symbol: 'TEST', priceUsd: 0 },
      riskScore: 20, riskLevel: 'LOW'
    };
    await paperTradingService.evaluateEntry(ctx);
    expect(mockPrisma.signalDecision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ decision: 'SKIPPED', reasons: expect.arrayContaining(['Invalid or zero price']) })
    }));
  });

  it('should skip entry if tokenAddress or pairAddress is missing', async () => {
    const ctx: any = {
      signal: { liquidityUsd: 50000, volume5mUsd: 10000, buyRatio: 0.8, marketCapUsd: 100000, symbol: 'TEST', priceUsd: 1 },
      riskScore: 20, riskLevel: 'LOW'
    };
    await paperTradingService.evaluateEntry(ctx);
    expect(mockPrisma.signalDecision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ decision: 'SKIPPED', reasons: expect.arrayContaining(['Missing token address', 'Missing pair address']) })
    }));
  });

  it('should evaluate exit for STALE_PRICE when forceReason is provided', async () => {
    const position = { 
      id: 'pos-stale', status: 'OPEN', entryExecutionPriceUsd: 100, virtualSizeUsd: 10, tokenAmount: 0.1,
      stopLossPercent: 10, takeProfitPercent: 100, trailingStopPercent: 10, 
      highestPriceUsd: 100, openedAt: new Date() 
    };
    mockPrisma.paperPosition.findUnique.mockResolvedValue(position);
    
    // Simulate what positionExitWorker does
    await paperTradingService.executeExit(position, 100, 0, 'STALE_PRICE');
    
    expect(mockPrisma.paperPosition.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'pos-stale' },
      data: expect.objectContaining({ status: 'CLOSED', closeReason: 'STALE_PRICE' })
    }));
    expect(mockPrisma.paperTradeEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'CLOSE', pnlUsd: expect.anything() })
    }));
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
