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

  if (positions.length > 0) {
    const positionsCsv = stringify(positions, { header: true });
    fs.writeFileSync(path.join(exportDir, 'paper-positions.csv'), positionsCsv);
  } else {
    console.log('Nessuna posizione paper trovata per export-csv.');
  }

  const decisions = await prisma.signalDecision.findMany();
  if (decisions.length > 0) {
    const decisionsCsv = stringify(decisions, { header: true });
    fs.writeFileSync(path.join(exportDir, 'signal-decisions.csv'), decisionsCsv);
  } else {
    console.log('Nessuna decisione trovata per export-csv.');
  }

  const metrics = await prisma.metricsSnapshot.findMany();
  if (metrics.length > 0) {
    const metricsCsv = stringify(metrics, { header: true });
    fs.writeFileSync(path.join(exportDir, 'metrics-snapshots.csv'), metricsCsv);
  } else {
    console.log('Nessuna metrica trovata per export-csv.');
  }

  console.log('Successfully exported CSVs to ./exports');
}

exportCSV().catch(console.error).finally(() => prisma.$disconnect());
