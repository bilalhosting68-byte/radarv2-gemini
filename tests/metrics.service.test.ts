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

  it('should calculate metrics correctly including max drawdown from ordered trades', async () => {
    // ClosedAt ordering: pos2 (T0), pos1 (T1), pos4 (T2), pos3 (T3)
    // PNL Path: -5, +10, -15, +20
    // Cumulative: -5, +5, -10, +10
    // Peak: 0, 5, 5, 10
    // DDs: 5, 0, 15, 0 => MaxDD = 15
    const mockPositions = [
      { status: 'CLOSED', pnlUsd: 10, pnlPercent: 10, closeReason: 'TAKE_PROFIT', openedAt: new Date(100), closedAt: new Date(200), tokenSignal: { riskResults: [{ level: 'LOW' }] } },
      { status: 'CLOSED', pnlUsd: -5, pnlPercent: -5, closeReason: 'STOP_LOSS', openedAt: new Date(50), closedAt: new Date(150), tokenSignal: { riskResults: [{ level: 'HIGH' }] } },
      { status: 'CLOSED', pnlUsd: 20, pnlPercent: 20, closeReason: 'TAKE_PROFIT', openedAt: new Date(300), closedAt: new Date(400), tokenSignal: { riskResults: [{ level: 'LOW' }] } },
      { status: 'CLOSED', pnlUsd: -15, pnlPercent: -15, closeReason: 'TRAILING_STOP', openedAt: new Date(250), closedAt: new Date(350), tokenSignal: { riskResults: [{ level: 'MEDIUM' }] } },
      { status: 'OPEN' }
    ];

    mockPrisma.paperPosition.findMany.mockResolvedValue(mockPositions);
    mockPrisma.signalDecision.findMany.mockResolvedValue([]);
    mockPrisma.paperPosition.count.mockResolvedValue(0);
    mockPrisma.botEvent.count.mockResolvedValue(0);

    const metrics = await metricsService.calculateMetrics();

    expect(metrics.totalTrades).toBe(5);
    expect(metrics.closedTrades).toBe(4);
    expect(metrics.totalPnlUsd).toBe(10); // 10-5+20-15 = 10
    expect(metrics.maxDrawdownUsd).toBe(15);
  });
});
