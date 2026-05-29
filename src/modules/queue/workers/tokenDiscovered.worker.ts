import { Job } from 'bullmq';
import { createWorker, getQueue } from '../queue.service';
import { RiskService } from '../../risk/risk.service';
import { prisma } from '../../storage/database.service';
import { logger } from '../../../logger';
import { TokenSignalInput } from '../../../types';

const riskService = new RiskService();

export const tokenDiscoveredWorker = createWorker('token.discovered', async (job: Job<TokenSignalInput>) => {
  const signal = job.data;
  logger.debug({ pair: signal.pairAddress }, 'Processing discovered token');
  
  // Here we could enrich the token, but for now we skip straight to risk analyze
  const riskQueue = getQueue('risk.analyze');
  await riskQueue.add('analyze-risk', signal, {
    jobId: `risk:${signal.pairAddress}:${Date.now()}`
  });
});

export const tokenEnrichedWorker = createWorker('token.enriched', async (job: Job) => {
  // Placeholder for future enrichment steps
  logger.debug('Processing enriched token');
});

export const riskAnalyzeWorker = createWorker('risk.analyze', async (job: Job<TokenSignalInput>) => {
  const signal = job.data;
  const analysis = await riskService.analyzeRisk(signal);
  
  let tokenSignal = await prisma.tokenSignal.findUnique({
    where: { tokenAddress_pairAddress: { tokenAddress: signal.tokenAddress, pairAddress: signal.pairAddress } }
  });

  if (!tokenSignal) {
    tokenSignal = await prisma.tokenSignal.create({
      data: {
        ...signal,
        rawData: signal.rawData as any
      }
    });
  }

  const riskResult = await prisma.riskResult.create({
    data: {
      tokenSignalId: tokenSignal.id,
      score: analysis.score,
      level: analysis.level,
      reasons: analysis.reasons as any,
      checks: analysis.checks as any,
      unknownChecks: analysis.unknownChecks as any,
      riskChecks: {
        create: analysis.checks.map(c => ({
          name: c.name,
          status: c.status,
          value: c.value?.toString(),
          penalty: c.penalty,
          message: c.message
        }))
      }
    }
  });

  const paperQueue = getQueue('paper.evaluate-entry');
  await paperQueue.add('evaluate-entry', {
    signal,
    riskScore: analysis.score,
    riskLevel: analysis.level
  }, {
    jobId: `paper-entry:${signal.pairAddress}:${Date.now()}`
  });
});
