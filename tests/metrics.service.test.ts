import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsService } from '../src/modules/metrics/metrics.service';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      paperPosition: {
        findMany: vi.fn()
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

  it('should calculate winrate correctly', async () => {
    const mockPositions = [
      { status: 'CLOSED', pnlUsd: 10, pnlPercent: 10, closeReason: 'TAKE_PROFIT', openedAt: new Date(), closedAt: new Date(Date.now() + 60000) },
      { status: 'CLOSED', pnlUsd: -5, pnlPercent: -5, closeReason: 'STOP_LOSS', openedAt: new Date(), closedAt: new Date(Date.now() + 60000) },
      { status: 'OPEN' }
    ];
    mockPrisma.paperPosition.findMany.mockResolvedValue(mockPositions);

    const metrics = await metricsService.calculateMetrics();

    expect(metrics.totalTrades).toBe(3);
    expect(metrics.closedTrades).toBe(2);
    expect(metrics.openTrades).toBe(1);
    expect(metrics.winratePercent).toBe(50);
    expect(metrics.totalPnlUsd).toBe(5);
    expect(metrics.profitFactor).toBe(2); // 10 / 5
    expect(metrics.averageWinUsd).toBe(10);
    expect(metrics.averageLossUsd).toBe(5);
  });
});
