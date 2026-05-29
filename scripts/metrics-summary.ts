import { prisma } from '../src/modules/storage/database.service';
import { MetricsService } from '../src/modules/metrics/metrics.service';

async function metricsSummary() {
  const metricsService = new MetricsService();
  const summary = await metricsService.calculateMetrics();

  console.log('--- MemeRadar V2 Metrics Summary ---');
  console.log(`Total Trades: ${summary.totalTrades}`);
  console.log(`Open Trades: ${summary.openTrades}`);
  console.log(`Closed Trades: ${summary.closedTrades}`);
  console.log(`Winrate: ${summary.winratePercent.toFixed(2)}%`);
  console.log(`Total PNL: $${summary.totalPnlUsd.toFixed(2)}`);
  console.log(`Profit Factor: ${summary.profitFactor ? summary.profitFactor.toFixed(2) : 'N/A'}`);
  console.log(`Average Win: $${summary.averageWinUsd.toFixed(2)}`);
  console.log(`Average Loss: $${summary.averageLossUsd.toFixed(2)}`);
  console.log(`Max Drawdown: $${summary.maxDrawdownUsd.toFixed(2)}`);
  console.log('------------------------------------');
}

metricsSummary().catch(console.error).finally(() => prisma.$disconnect());
