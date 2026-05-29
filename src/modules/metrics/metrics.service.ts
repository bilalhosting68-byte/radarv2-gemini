import { prisma } from '../storage/database.service';
import { MetricsSummary } from '../../types';
import { logger } from '../../logger';

export class MetricsService {
  async calculateMetrics(): Promise<MetricsSummary> {
    const allPositions = await prisma.paperPosition.findMany();
    
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
    let profitFactor = null;
    let maxDrawdownUsd = 0; // Simplified
    let biggestWinUsd = 0;
    let biggestLossUsd = 0;
    let totalHoldMinutes = 0;

    const pnlByCloseReason: Record<string, number> = {};
    const wins: number[] = [];
    const losses: number[] = [];

    for (const pos of closedPositions) {
      const pnl = pos.pnlUsd || 0;
      totalPnlUsd += pnl;

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
    } else {
      var averageHoldMinutes = 0;
    }

    if (wins.length > 0) {
      averageWinUsd = wins.reduce((a, b) => a + b, 0) / wins.length;
    }
    if (losses.length > 0) {
      averageLossUsd = losses.reduce((a, b) => a + b, 0) / losses.length;
    }

    const totalLosses = losses.reduce((a, b) => a + b, 0);
    const totalWins = wins.reduce((a, b) => a + b, 0);
    if (totalLosses > 0) {
      profitFactor = totalWins / totalLosses;
    }

    const summary: MetricsSummary = {
      totalTrades,
      openTrades,
      closedTrades,
      winratePercent,
      totalPnlUsd,
      averagePnlUsd,
      averagePnlPercent,
      averageWinUsd,
      averageLossUsd,
      profitFactor,
      maxDrawdownUsd, // Not fully calculated
      biggestWinUsd,
      biggestLossUsd,
      averageHoldMinutes,
      pnlByCloseReason,
      pnlByRiskLevel: {},
      pnlByMarketCapRange: {},
      pnlByLiquidityRange: {},
      skippedSignalsByReason: {},
      stalePriceCount: 0,
      apiErrorCount: 0,
      queueFailureCount: 0
    };

    return summary;
  }

  async runMetricsCycle() {
    try {
      const summary = await this.calculateMetrics();
      
      await prisma.metricsSnapshot.create({
        data: {
          totalTrades: summary.totalTrades,
          openTrades: summary.openTrades,
          closedTrades: summary.closedTrades,
          winratePercent: summary.winratePercent,
          totalPnlUsd: summary.totalPnlUsd,
          averagePnlUsd: summary.averagePnlUsd,
          averagePnlPercent: summary.averagePnlPercent,
          averageWinUsd: summary.averageWinUsd,
          averageLossUsd: summary.averageLossUsd,
          profitFactor: summary.profitFactor,
          maxDrawdownUsd: summary.maxDrawdownUsd,
          biggestWinUsd: summary.biggestWinUsd,
          biggestLossUsd: summary.biggestLossUsd,
          averageHoldMinutes: summary.averageHoldMinutes,
          pnlByCloseReason: summary.pnlByCloseReason,
          pnlByRiskLevel: summary.pnlByRiskLevel,
          pnlByMarketCapRange: summary.pnlByMarketCapRange,
          pnlByLiquidityRange: summary.pnlByLiquidityRange,
          skippedSignalsByReason: summary.skippedSignalsByReason,
          stalePriceCount: summary.stalePriceCount,
          apiErrorCount: summary.apiErrorCount,
          queueFailureCount: summary.queueFailureCount
        }
      });

      logger.info({ summary }, 'Metrics updated');
    } catch (error) {
      logger.error({ error }, 'Error in metrics cycle');
    }
  }
}
