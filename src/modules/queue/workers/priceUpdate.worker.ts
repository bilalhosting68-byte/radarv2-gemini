import { Job } from 'bullmq';
import { createWorker } from '../queue.service';
import { PriceTrackerService } from '../../priceTracker/priceTracker.service';

const priceTrackerService = new PriceTrackerService();

export const priceUpdateWorker = createWorker('price.update', async (job: Job) => {
  await priceTrackerService.runUpdateCycle();
});
