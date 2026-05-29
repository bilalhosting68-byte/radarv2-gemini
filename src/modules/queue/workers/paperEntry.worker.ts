import { Job } from 'bullmq';
import { createWorker } from '../queue.service';
import { PaperTradingService } from '../../paperTrading/paperTrading.service';
import { EvaluateEntryContext } from '../../paperTrading/paperTrading.types';

const paperTradingService = new PaperTradingService();

export const paperEntryWorker = createWorker('paper.evaluate-entry', async (job: Job<EvaluateEntryContext>) => {
  await paperTradingService.evaluateEntry(job.data);
});
