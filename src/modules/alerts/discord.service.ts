import { env } from '../../config/env';
import { logger } from '../../logger';

export class DiscordService {
  async sendAlert(message: string, embed?: any) {
    if (!env.DISCORD_WEBHOOK_URL) {
      logger.debug({ message, embed }, 'Discord webhook not configured, skipping alert');
      return;
    }

    try {
      const body = {
        content: message,
        embeds: embed ? [embed] : undefined
      };

      const response = await fetch(env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to send Discord alert');
    }
  }
}
