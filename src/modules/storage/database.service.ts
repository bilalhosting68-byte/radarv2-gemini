import { PrismaClient } from '@prisma/client';
import { logger } from '../../logger';

export const prisma = new PrismaClient();

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to PostgreSQL database');
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Disconnected from PostgreSQL database');
}
