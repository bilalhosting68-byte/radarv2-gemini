import { Job } from 'bullmq';
import { createWorker } from '../queue.service';
import { DiscordService } from '../../alerts/discord.service';

const discordService = new DiscordService();

export const alertsWorker = createWorker('alerts.send', async (job: Job) => {
  const { type, data } = job.data;
  
  if (type === 'BOT_STARTED') {
    await discordService.sendAlert('🚀 MemeRadar_V2 started in PAPER TRADING mode.');
  } else if (type === 'POSITION_OPENED') {
    await discordService.sendAlert(`🟢 OPENED Position on ${data.position.symbol} at $${data.simulation.executionPrice}`);
  } else if (type === 'POSITION_CLOSED') {
    await discordService.sendAlert(`🔴 CLOSED Position on ${data.symbol}. PNL: $${data.pnlUsd.toFixed(2)} (${data.pnlPercent.toFixed(2)}%) - Reason: ${data.reason}`);
  } else if (type === 'CRITICAL_ERROR') {
    await discordService.sendAlert(`⚠️ CRITICAL ERROR: ${data.error}`);
  }
});
