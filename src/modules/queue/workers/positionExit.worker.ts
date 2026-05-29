import { Job } from 'bullmq';
import { createWorker } from '../queue.service';
import { PaperTradingService } from '../../paperTrading/paperTrading.service';

const paperTradingService = new PaperTradingService();

export const positionExitWorker = createWorker('position.evaluate-exit', async (job: Job) => {
  const { positionId, marketPrice, liquidityUsd, forceReason } = job.data;
  
  if (forceReason) {
    const position = await import('../../storage/database.service').then(m => m.prisma.paperPosition.findUnique({ where: { id: positionId }}));
    if (position) {
      await paperTradingService.executeExit(position, marketPrice, liquidityUsd, forceReason);
    }
  } else {
    await paperTradingService.evaluateExit(positionId, marketPrice, liquidityUsd);
  }
});
