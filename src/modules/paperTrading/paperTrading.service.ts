import { EvaluateEntryContext } from './paperTrading.types';
import { env } from '../../config/env';
import { prisma } from '../storage/database.service';
import { getRedisConnection } from '../storage/redis.service';
import { SlippageService } from '../execution/slippage.service';
import { logger } from '../../logger';
import { getQueue } from '../queue/queue.service';

export class PaperTradingService {
  private slippageService: SlippageService;

  constructor() {
    this.slippageService = new SlippageService();
  }

  async evaluateEntry(ctx: EvaluateEntryContext): Promise<void> {
    if (env.BOT_MODE !== 'paper') {
      logger.warn('Skipping entry evaluation: BOT_MODE is not paper');
      return;
    }

    const { signal, riskLevel } = ctx;
    const reasons: string[] = [];

    // Check risk level allowed
    const levels = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];
    const maxAllowedIndex = levels.indexOf(env.RISK_MAX_ALLOWED_LEVEL);
    const currentIndex = levels.indexOf(riskLevel);
    
    if (currentIndex > maxAllowedIndex || riskLevel === 'EXTREME') {
      reasons.push(`Risk level ${riskLevel} is too high (max: ${env.RISK_MAX_ALLOWED_LEVEL})`);
    }

    if (signal.liquidityUsd < env.MIN_LIQUIDITY_USD) {
      reasons.push('Liquidity too low');
    }
    if (signal.volume5mUsd < env.MIN_VOLUME_5M_USD) {
      reasons.push('Volume 5m too low');
    }
    if (signal.buyRatio < env.MIN_BUY_RATIO) {
      reasons.push('Buy ratio too low');
    }
    if (signal.marketCapUsd < env.MIN_MARKET_CAP_USD || signal.marketCapUsd > env.MAX_MARKET_CAP_USD) {
      reasons.push('Market cap out of range');
    }

    // Check open positions limit
    const openPositionsCount = await prisma.paperPosition.count({ where: { status: 'OPEN' } });
    if (openPositionsCount >= env.MAX_OPEN_POSITIONS) {
      reasons.push('Max open positions reached');
    }

    // Check if we already have an open position for this token
    const existingPosition = await prisma.paperPosition.findFirst({
      where: {
        tokenAddress: signal.tokenAddress,
        pairAddress: signal.pairAddress,
        status: 'OPEN'
      }
    });
    if (existingPosition) {
      reasons.push('Already have an open position for this pair');
    }

    const passedFilters = reasons.length === 0;

    let tokenSignal = await prisma.tokenSignal.findUnique({
      where: {
        tokenAddress_pairAddress: {
          tokenAddress: signal.tokenAddress,
          pairAddress: signal.pairAddress
        }
      }
    });

    if (!tokenSignal) {
      tokenSignal = await prisma.tokenSignal.create({
        data: {
          ...signal,
          rawData: signal.rawData as any
        }
      });
    }

    await prisma.signalDecision.create({
      data: {
        tokenSignalId: tokenSignal.id,
        decision: passedFilters ? 'OPENED' : 'SKIPPED',
        reasons: reasons as any,
        passedFilters,
        riskScore: ctx.riskScore,
        riskLevel: ctx.riskLevel
      }
    });

    if (!passedFilters) {
      logger.info({ pair: signal.pairAddress, reasons }, 'Skipped entry');
      return;
    }

    await this.executeEntry(tokenSignal.id, signal);
  }

  private async executeEntry(tokenSignalId: string, signal: EvaluateEntryContext['signal']): Promise<void> {
    const simulation = this.slippageService.simulateBuy(
      env.VIRTUAL_POSITION_SIZE_USD,
      signal.priceUsd,
      signal.liquidityUsd
    );

    const position = await prisma.paperPosition.create({
      data: {
        tokenSignalId,
        tokenAddress: signal.tokenAddress,
        pairAddress: signal.pairAddress,
        symbol: signal.symbol,
        status: 'OPEN',
        entryMarketPriceUsd: signal.priceUsd,
        entryExecutionPriceUsd: simulation.executionPrice,
        currentPriceUsd: simulation.executionPrice, // initial
        highestPriceUsd: simulation.executionPrice,
        virtualSizeUsd: env.VIRTUAL_POSITION_SIZE_USD,
        tokenAmount: simulation.tokenAmount,
        entryFeeUsd: simulation.feeUsd,
        entryPriceImpactPercent: simulation.priceImpactPercent,
        stopLossPercent: env.STOP_LOSS_PERCENT,
        takeProfitPercent: env.TAKE_PROFIT_PERCENT,
        trailingStopPercent: env.TRAILING_STOP_PERCENT
      }
    });

    await prisma.paperTradeEvent.create({
      data: {
        paperPositionId: position.id,
        type: 'OPEN',
        marketPriceUsd: signal.priceUsd,
        executionPriceUsd: simulation.executionPrice,
        metadata: simulation as any
      }
    });

    const redis = getRedisConnection();
    await redis.sadd('open_positions', position.id);

    const alertQueue = getQueue('alerts.send');
    await alertQueue.add('send-discord', {
      type: 'POSITION_OPENED',
      data: { position, simulation }
    });

    logger.info({ positionId: position.id, token: signal.symbol }, 'Opened paper position');
  }

  async evaluateExit(positionId: string, currentMarketPrice: number, liquidityUsd: number): Promise<void> {
    const position = await prisma.paperPosition.findUnique({ where: { id: positionId } });
    if (!position || position.status !== 'OPEN') return;

    let highestPrice = position.highestPriceUsd;
    if (currentMarketPrice > highestPrice) {
      highestPrice = currentMarketPrice;
      await prisma.paperPosition.update({
        where: { id: positionId },
        data: { highestPriceUsd: highestPrice, currentPriceUsd: currentMarketPrice }
      });
    } else {
      await prisma.paperPosition.update({
        where: { id: positionId },
        data: { currentPriceUsd: currentMarketPrice }
      });
    }

    const pnlPercent = ((currentMarketPrice - position.entryExecutionPriceUsd) / position.entryExecutionPriceUsd) * 100;
    
    // Evaluate conditions
    let closeReason: string | null = null;

    if (pnlPercent <= -position.stopLossPercent) {
      closeReason = 'STOP_LOSS';
    } else if (pnlPercent >= position.takeProfitPercent) {
      closeReason = 'TAKE_PROFIT';
    } else if (highestPrice > position.entryExecutionPriceUsd) {
      const trailingStopPrice = highestPrice * (1 - position.trailingStopPercent / 100);
      if (currentMarketPrice <= trailingStopPrice) {
        closeReason = 'TRAILING_STOP';
      }
    }

    // Max hold
    const holdMinutes = (Date.now() - position.openedAt.getTime()) / (1000 * 60);
    if (!closeReason && holdMinutes >= env.MAX_HOLD_MINUTES) {
      closeReason = 'MAX_HOLD';
    }

    // Stale price handled by priceTracker
    // But we check here if passed explicitly

    if (closeReason) {
      await this.executeExit(position, currentMarketPrice, liquidityUsd, closeReason);
    }
  }

  async executeExit(position: any, marketPrice: number, liquidityUsd: number, reason: string): Promise<void> {
    const simulation = this.slippageService.simulateSell(
      position.tokenAmount,
      marketPrice,
      liquidityUsd
    );

    const pnlUsd = simulation.netUsd - position.virtualSizeUsd;
    const pnlPercent = (pnlUsd / position.virtualSizeUsd) * 100;

    await prisma.paperPosition.update({
      where: { id: position.id },
      data: {
        status: 'CLOSED',
        exitMarketPriceUsd: marketPrice,
        exitExecutionPriceUsd: simulation.executionPrice,
        exitFeeUsd: simulation.feeUsd,
        exitPriceImpactPercent: simulation.priceImpactPercent,
        pnlUsd,
        pnlPercent,
        closeReason: reason,
        closedAt: new Date()
      }
    });

    await prisma.paperTradeEvent.create({
      data: {
        paperPositionId: position.id,
        type: 'CLOSE',
        marketPriceUsd: marketPrice,
        executionPriceUsd: simulation.executionPrice,
        pnlUsd,
        pnlPercent,
        metadata: { ...simulation, reason } as any
      }
    });

    const redis = getRedisConnection();
    await redis.srem('open_positions', position.id);

    const alertQueue = getQueue('alerts.send');
    await alertQueue.add('send-discord', {
      type: 'POSITION_CLOSED',
      data: { positionId: position.id, symbol: position.symbol, pnlUsd, pnlPercent, reason, simulation }
    });

    logger.info({ positionId: position.id, reason, pnlUsd }, 'Closed paper position');
  }
}
