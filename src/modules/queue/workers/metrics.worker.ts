import { Job } from 'bullmq';
import { createWorker } from '../queue.service';
import { MetricsService } from '../../metrics/metrics.service';

const metricsService = new MetricsService();

export const metricsWorker = createWorker('metrics.snapshot', async (job: Job) => {
  await metricsService.runMetricsCycle();
});
