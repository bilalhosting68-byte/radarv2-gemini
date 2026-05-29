import { prisma } from '../storage/database.service';
import { MetricsSummary } from '../../types';
import { logger } from '../../logger';

export class MetricsService {
  async calculateMetrics(): Promise<MetricsSummary> {
    const allPositions = await prisma.paperPosition.findMany({
      include: {
        tokenSignal: {
          include: {
            riskResults: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });
    
    const openTrades = allPositions.filter(p => p.status === 'OPEN').length;
    const closedPositions = allPositions.filter(p => p.status === 'CLOSED');
    const closedTrades = closedPositions.length;
    const totalTrades = allPositions.length;

    let winratePercent = 0;
    let totalPnlUsd = 0;
    let averagePnlUsd = 0;
    let averagePnlPercent = 0;
    let averageWinUsd = 0;
    let averageLossUsd = 0;
    let averageHoldMinutes = 0;
    let profitFactor = null;
    let maxDrawdownUsd = 0;
    let biggestWinUsd = 0;
    let biggestLossUsd = 0;
    let totalHoldMinutes = 0;

    const pnlByCloseReason: Record<string, number> = {};
    const pnlByRiskLevel: Record<string, number> = {};
    const pnlByMarketCapRange: Record<string, number> = {};
    const pnlByLiquidityRange: Record<string, number> = {};

    const wins: number[] = [];
    const losses: number[] = [];

    // Max Drawdown calculation (simplified peak-to-trough)
    let cumulativePnl = 0;
    let peak = 0;

    for (const pos of closedPositions) {
      const pnl = pos.pnlUsd || 0;
      totalPnlUsd += pnl;
      cumulativePnl += pnl;
      
      if (cumulativePnl > peak) {
        peak = cumulativePnl;
      }
      const drawdown = peak - cumulativePnl;
      if (drawdown > maxDrawdownUsd) {
        maxDrawdownUsd = drawdown;
      }

      if (pnl > 0) {
        wins.push(pnl);
        if (pnl > biggestWinUsd) biggestWinUsd = pnl;
      } else {
        losses.push(Math.abs(pnl));
        if (pnl < biggestLossUsd) biggestLossUsd = pnl;
      }

      if (pos.closeReason) {
        pnlByCloseReason[pos.closeReason] = (pnlByCloseReason[pos.closeReason] || 0) + pnl;
      }

      // Breakdown by Risk
      const riskLevel = pos.tokenSignal?.riskResults?.[0]?.level || 'UNKNOWN';
      pnlByRiskLevel[riskLevel] = (pnlByRiskLevel[riskLevel] || 0) + pnl;

      // Breakdown by Market Cap
      const mc = pos.tokenSignal?.marketCapUsd || 0;
      const mcRange = this.getRangeLabel(mc, [50000, 100000, 500000]);
      pnlByMarketCapRange[mcRange] = (pnlByMarketCapRange[mcRange] || 0) + pnl;

      // Breakdown by Liquidity
      const liq = pos.tokenSignal?.liquidityUsd || 0;
      const liqRange = this.getRangeLabel(liq, [10000, 50000, 100000]);
      pnlByLiquidityRange[liqRange] = (pnlByLiquidityRange[liqRange] || 0) + pnl;

      if (pos.closedAt) {
        totalHoldMinutes += (pos.closedAt.getTime() - pos.openedAt.getTime()) / (1000 * 60);
      }
    }

    if (closedTrades > 0) {
      winratePercent = (wins.length / closedTrades) * 100;
      averagePnlUsd = totalPnlUsd / closedTrades;
      averageHoldMinutes = totalHoldMinutes / closedTrades;
      let sumPnlPercent = closedPositions.reduce((acc, pos) => acc + (pos.pnlPercent || 0), 0);
      averagePnlPercent = sumPnlPercent / closedTrades;
    }

    if (wins.length > 0) averageWinUsd = wins.reduce((a, b) => a + b, 0) / wins.length;
    if (losses.length > 0) averageLossUsd = losses.reduce((a, b) => a + b, 0) / losses.length;

    const totalLosses = losses.reduce((a, b) => a + b, 0);
    const totalWins = wins.reduce((a, b) => a + b, 0);
    if (totalLosses > 0) profitFactor = totalWins / totalLosses;

    // Skipped signals
    const skipped = await prisma.signalDecision.findMany({ where: { decision: 'SKIPPED' } });
    const skippedSignalsByReason: Record<string, number> = {};
    skipped.forEach(s => {
      const reasons = s.reasons as string[];
      reasons.forEach(r => {
        skippedSignalsByReason[r] = (skippedSignalsByReason[r] || 0) + 1;
      });
    });

    // Counts from events
    const stalePriceCount = await prisma.paperPosition.count({ where: { closeReason: 'STALE_PRICE' } });
    const apiErrorCount = await prisma.botEvent.count({ where: { type: 'API_ERROR' } });
    const queueFailureCount = await prisma.botEvent.count({ where: { type: 'QUEUE_FAILURE' } });

    return {
      totalTrades, openTrades, closedTrades, winratePercent, totalPnlUsd,
      averagePnlUsd, averagePnlPercent, averageWinUsd, averageLossUsd,
      profitFactor, maxDrawdownUsd, biggestWinUsd, biggestLossUsd,
      averageHoldMinutes, pnlByCloseReason, pnlByRiskLevel,
      pnlByMarketCapRange, pnlByLiquidityRange, skippedSignalsByReason,
      stalePriceCount, apiErrorCount, queueFailureCount
    };
  }

  private getRangeLabel(value: number, thresholds: number[]): string {
    if (value < thresholds[0]) return `<${thresholds[0]}`;
    for (let i = 0; i < thresholds.length - 1; i++) {
      if (value >= thresholds[i] && value < thresholds[i+1]) {
        return `${thresholds[i]}-${thresholds[i+1]}`;
      }
    }
    return `>${thresholds[thresholds.length-1]}`;
  }

  async runMetricsCycle() {
    try {
      const summary = await this.calculateMetrics();
      await prisma.metricsSnapshot.create({ data: summary as any });
      logger.info('Metrics updated and saved to snapshot');
    } catch (error) {
      logger.error({ error }, 'Error in metrics cycle');
    }
  }
}
