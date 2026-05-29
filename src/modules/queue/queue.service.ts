import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnection } from '../storage/redis.service';
import { prisma } from '../storage/database.service';
import { logger } from '../../logger';

const queues: Record<string, Queue> = {};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: true,
  removeOnFail: 100,
};

export function getQueue(name: string): Queue {
  if (!queues[name]) {
    queues[name] = new Queue(name, {
      connection: getRedisConnection() as any,
      defaultJobOptions,
    });
  }
  return queues[name];
}

export function createWorker(name: string, processor: (job: Job) => Promise<any>) {
  const worker = new Worker(name, async (job) => {
    logger.info({ jobId: job.id, queue: name }, `Starting job ${job.name}`);
    try {
      return await processor(job);
    } catch (error: any) {
      logger.error({ error, jobId: job.id, queue: name }, `Job failed during processing`);
      throw error;
    }
  }, {
    connection: getRedisConnection() as any,
  });
  
  worker.on('failed', async (job, err) => {
    logger.error({ error: err, jobId: job?.id, queue: name }, `Job failed completely in queue ${name}`);
    try {
      await prisma.botEvent.create({
        data: {
          level: 'ERROR',
          type: 'QUEUE_FAILURE',
          source: name,
          message: err.message || 'Unknown queue error',
          metadata: { jobId: job?.id, jobName: job?.name, error: err.stack }
        }
      });
    } catch (dbErr) {
      logger.error({ dbErr }, 'Failed to save BotEvent for queue failure');
    }
  });

  return worker;
}
