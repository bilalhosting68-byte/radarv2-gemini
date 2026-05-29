import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/modules/storage/database.service';

async function exportCSV() {
  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const positions = await prisma.paperPosition.findMany({
    include: { events: true }
  });

  const positionsCsv = stringify(positions, { header: true });
  fs.writeFileSync(path.join(exportDir, 'paper-positions.csv'), positionsCsv);

  const decisions = await prisma.signalDecision.findMany();
  const decisionsCsv = stringify(decisions, { header: true });
  fs.writeFileSync(path.join(exportDir, 'signal-decisions.csv'), decisionsCsv);

  const metrics = await prisma.metricsSnapshot.findMany();
  const metricsCsv = stringify(metrics, { header: true });
  fs.writeFileSync(path.join(exportDir, 'metrics-snapshots.csv'), metricsCsv);

  console.log('Successfully exported CSVs to ./exports');
}

exportCSV().catch(console.error).finally(() => prisma.$disconnect());
