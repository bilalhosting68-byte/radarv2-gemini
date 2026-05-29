import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsService } from '../src/modules/metrics/metrics.service';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      paperPosition: {
        findMany: vi.fn(),
        count: vi.fn()
      },
      signalDecision: {
        findMany: vi.fn()
      },
      botEvent: {
        count: vi.fn()
      },
      metricsSnapshot: {
        create: vi.fn()
      }
    }
  }
});

vi.mock('../src/modules/storage/database.service', () => ({
  prisma: mockPrisma
}));

describe('MetricsService', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
    vi.clearAllMocks();
  });

  it('should calculate metrics correctly including max drawdown and profit factor', async () => {
    const mockPositions = [
      { status: 'CLOSED', pnlUsd: 10, pnlPercent: 10, closeReason: 'TAKE_PROFIT', openedAt: new Date(), closedAt: new Date(Date.now() + 60000), tokenSignal: { riskResults: [{ level: 'LOW' }] } },
      { status: 'CLOSED', pnlUsd: -5, pnlPercent: -5, closeReason: 'STOP_LOSS', openedAt: new Date(), closedAt: new Date(Date.now() + 60000), tokenSignal: { riskResults: [{ level: 'HIGH' }] } },
      { status: 'CLOSED', pnlUsd: 20, pnlPercent: 20, closeReason: 'TAKE_PROFIT', openedAt: new Date(), closedAt: new Date(Date.now() + 60000), tokenSignal: { riskResults: [{ level: 'LOW' }] } },
      { status: 'CLOSED', pnlUsd: -15, pnlPercent: -15, closeReason: 'TRAILING_STOP', openedAt: new Date(), closedAt: new Date(Date.now() + 60000), tokenSignal: { riskResults: [{ level: 'MEDIUM' }] } },
      { status: 'OPEN' }
    ];
    // Cumulative PNL path:
    // 1. +10 => peak 10, DD 0
    // 2. -5 => total 5, peak 10, DD 5
    // 3. +20 => total 25, peak 25, DD 5
    // 4. -15 => total 10, peak 25, DD 15

    mockPrisma.paperPosition.findMany.mockResolvedValue(mockPositions);
    mockPrisma.signalDecision.findMany.mockResolvedValue([]);
    mockPrisma.paperPosition.count.mockResolvedValue(0);
    mockPrisma.botEvent.count.mockResolvedValue(0);

    const metrics = await metricsService.calculateMetrics();

    expect(metrics.totalTrades).toBe(5);
    expect(metrics.closedTrades).toBe(4);
    expect(metrics.openTrades).toBe(1);
    expect(metrics.winratePercent).toBe(50); // 2 wins / 4 trades
    expect(metrics.totalPnlUsd).toBe(10);
    expect(metrics.profitFactor).toBe(1.5); // (10+20) / (5+15) = 30 / 20 = 1.5
    expect(metrics.averageWinUsd).toBe(15); // (10+20)/2
    expect(metrics.averageLossUsd).toBe(10); // (5+15)/2
    expect(metrics.maxDrawdownUsd).toBe(15);
    expect(metrics.biggestWinUsd).toBe(20);
    expect(metrics.biggestLossUsd).toBe(-15);
  });
});
