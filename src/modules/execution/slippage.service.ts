import { ExecutionSimulation } from './execution.types';
import { env } from '../../config/env';
import { AmmService } from './amm.service';

export class SlippageService {
  private ammService: AmmService;

  constructor() {
    this.ammService = new AmmService();
  }

  simulateBuy(inputUsd: number, marketPrice: number, liquidityUsd: number): ExecutionSimulation {
    if (env.SLIPPAGE_MODEL === 'AMM_CONSTANT_PRODUCT') {
      return this.ammService.simulateBuy(inputUsd, marketPrice, liquidityUsd);
    }
    
    // FIXED model
    const slippagePercent = env.SIMULATED_BUY_SLIPPAGE_PERCENT;
    const executionPrice = marketPrice * (1 + slippagePercent / 100);
    const feeUsd = inputUsd * (env.SIMULATED_FEE_PERCENT / 100);
    const netUsd = inputUsd - feeUsd;
    const tokenAmount = netUsd / executionPrice;

    return {
      side: 'BUY',
      model: 'FIXED',
      marketPrice,
      executionPrice,
      priceImpactPercent: slippagePercent,
      slippagePercent,
      feeUsd,
      grossUsd: inputUsd,
      netUsd,
      tokenAmount,
      warnings: []
    };
  }

  simulateSell(tokenAmount: number, marketPrice: number, liquidityUsd: number): ExecutionSimulation {
    if (env.SLIPPAGE_MODEL === 'AMM_CONSTANT_PRODUCT') {
      return this.ammService.simulateSell(tokenAmount, marketPrice, liquidityUsd);
    }

    // FIXED model
    const slippagePercent = env.SIMULATED_SELL_SLIPPAGE_PERCENT;
    const executionPrice = marketPrice * (1 - slippagePercent / 100);
    const grossUsd = tokenAmount * executionPrice;
    const feeUsd = grossUsd * (env.SIMULATED_FEE_PERCENT / 100);
    const netUsd = grossUsd - feeUsd;

    return {
      side: 'SELL',
      model: 'FIXED',
      marketPrice,
      executionPrice,
      priceImpactPercent: slippagePercent,
      slippagePercent,
      feeUsd,
      grossUsd,
      netUsd,
      tokenAmount,
      warnings: []
    };
  }
}
