import { env } from './config/env';
import { logger } from './logger';
import { connectDatabase, disconnectDatabase } from './modules/storage/database.service';
import { getRedisConnection, closeRedis } from './modules/storage/redis.service';
import { getQueue } from './modules/queue/queue.service';
import { IngestionService } from './modules/ingestion/ingestion.service';
import { PriceTrackerService } from './modules/priceTracker/priceTracker.service';
import { MetricsService } from './modules/metrics/metrics.service';

// Import workers to instantiate them
import './modules/queue/workers/tokenDiscovered.worker';
import './modules/queue/workers/paperEntry.worker';
import './modules/queue/workers/priceUpdate.worker';
import './modules/queue/workers/positionExit.worker';
import './modules/queue/workers/metrics.worker';
import './modules/queue/workers/alerts.worker';

async function bootstrap() {
  logger.info('Starting MemeRadar_V2...');

  try {
    await connectDatabase();
    getRedisConnection();

    const alertQueue = getQueue('alerts.send');
    await alertQueue.add('send-discord', { type: 'BOT_STARTED' });

    const ingestionService = new IngestionService();
    const priceTrackerService = new PriceTrackerService();
    const metricsService = new MetricsService();

    // Start loops
    setInterval(() => {
      ingestionService.runScanCycle().catch(err => logger.error({ err }, 'Scan cycle error'));
    }, env.SCAN_INTERVAL_SECONDS * 1000);

    setInterval(() => {
      priceTrackerService.runUpdateCycle().catch(err => logger.error({ err }, 'Price update cycle error'));
    }, env.PRICE_UPDATE_INTERVAL_SECONDS * 1000);

    setInterval(() => {
      metricsService.runMetricsCycle().catch(err => logger.error({ err }, 'Metrics cycle error'));
    }, env.METRICS_INTERVAL_MINUTES * 60 * 1000);

    logger.info('All cycles started successfully.');

    // Initial runs
    ingestionService.runScanCycle();
    priceTrackerService.runUpdateCycle();
    
  } catch (error) {
    logger.fatal({ error }, 'Failed to bootstrap application');
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await disconnectDatabase();
  await closeRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await disconnectDatabase();
  await closeRedis();
  process.exit(0);
});

bootstrap();
