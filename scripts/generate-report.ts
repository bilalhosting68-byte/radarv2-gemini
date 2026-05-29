import fs from 'fs';
import path from 'path';
import { prisma } from '../src/modules/storage/database.service';

async function generateReport() {
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const latestMetrics = await prisma.metricsSnapshot.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!latestMetrics) {
    console.log('No metrics available to generate report');
    return;
  }

  const markdown = `
# MemeRadar V2 - Performance Report
Date: ${new Date().toISOString()}

## Summary
- Total Trades: ${latestMetrics.totalTrades}
- Open Trades: ${latestMetrics.openTrades}
- Closed Trades: ${latestMetrics.closedTrades}
- Winrate: ${latestMetrics.winratePercent.toFixed(2)}%
- Total PNL: $${latestMetrics.totalPnlUsd.toFixed(2)}
- Average PNL: $${latestMetrics.averagePnlUsd.toFixed(2)}
- Average Win: $${latestMetrics.averageWinUsd.toFixed(2)}
- Average Loss: $${latestMetrics.averageLossUsd.toFixed(2)}
- Profit Factor: ${latestMetrics.profitFactor ? latestMetrics.profitFactor.toFixed(2) : 'N/A'}
- Biggest Win: $${latestMetrics.biggestWinUsd.toFixed(2)}
- Biggest Loss: $${latestMetrics.biggestLossUsd.toFixed(2)}

${latestMetrics.totalTrades < 100 ? '> **WARNING:** Not enough trades (< 100) to be statistically significant.' : ''}

## Close Reasons Breakdown
\`\`\`json
${JSON.stringify(latestMetrics.pnlByCloseReason, null, 2)}
\`\`\`
`;

  fs.writeFileSync(path.join(reportsDir, 'latest-summary.md'), markdown);
  console.log('Report generated at ./reports/latest-summary.md');
}

generateReport().catch(console.error).finally(() => prisma.$disconnect());
