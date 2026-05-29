import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnection } from '../storage/redis.service';
import { env } from '../../config/env';

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
  const worker = new Worker(name, processor, {
    connection: getRedisConnection() as any,
  });
  
  worker.on('failed', (job, err) => {
    // This will be caught and potentially logged elsewhere, but we can hook in
    console.error(`Job ${job?.id} in queue ${name} failed:`, err);
  });

  return worker;
}
