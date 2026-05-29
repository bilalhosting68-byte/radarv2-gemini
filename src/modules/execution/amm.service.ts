import { ExecutionSimulation } from './execution.types';
import { env } from '../../config/env';

export class AmmService {
  simulateBuy(inputUsd: number, marketPrice: number, liquidityUsd: number): ExecutionSimulation {
    const warnings: string[] = [];
    const feeUsd = inputUsd * (env.SIMULATED_FEE_PERCENT / 100);
    const netUsd = inputUsd - feeUsd;

    if (!liquidityUsd || liquidityUsd <= 0) {
      warnings.push('AMM_FALLBACK_TO_FIXED');
      return this.fallbackFixedBuy(inputUsd, marketPrice);
    }

    // Costante k = x * y
    // reserveUsd = x, reserveToken = y
    const reserveUsd = liquidityUsd / 2;
    const reserveToken = reserveUsd / marketPrice;

    // k = reserveUsd * reserveToken
    // newReserveUsd = reserveUsd + netUsd
    // newReserveToken = k / newReserveUsd
    // tokenReceived = reserveToken - newReserveToken

    const k = reserveUsd * reserveToken;
    const newReserveUsd = reserveUsd + netUsd;
    const newReserveToken = k / newReserveUsd;
    const tokenAmount = reserveToken - newReserveToken;

    const executionPrice = netUsd / tokenAmount;
    const priceImpactPercent = ((executionPrice - marketPrice) / marketPrice) * 100;

    if (priceImpactPercent > 10) {
      warnings.push('HIGH_PRICE_IMPACT');
    }

    return {
      side: 'BUY',
      model: 'AMM_CONSTANT_PRODUCT',
      marketPrice,
      executionPrice,
      priceImpactPercent,
      slippagePercent: priceImpactPercent,
      feeUsd,
      grossUsd: inputUsd,
      netUsd,
      tokenAmount,
      warnings
    };
  }

  simulateSell(tokenAmount: number, marketPrice: number, liquidityUsd: number): ExecutionSimulation {
    const warnings: string[] = [];
    
    if (!liquidityUsd || liquidityUsd <= 0) {
      warnings.push('AMM_FALLBACK_TO_FIXED');
      return this.fallbackFixedSell(tokenAmount, marketPrice);
    }

    const reserveUsd = liquidityUsd / 2;
    const reserveToken = reserveUsd / marketPrice;

    // k = reserveUsd * reserveToken
    // newReserveToken = reserveToken + tokenAmount
    // newReserveUsd = k / newReserveToken
    // usdReceived = reserveUsd - newReserveUsd

    const k = reserveUsd * reserveToken;
    const newReserveToken = reserveToken + tokenAmount;
    const newReserveUsd = k / newReserveToken;
    const grossUsd = reserveUsd - newReserveUsd;

    const feeUsd = grossUsd * (env.SIMULATED_FEE_PERCENT / 100);
    const netUsd = grossUsd - feeUsd;

    const executionPrice = grossUsd / tokenAmount;
    // executionPrice in vendita è minore del marketPrice, impact %
    const priceImpactPercent = ((marketPrice - executionPrice) / marketPrice) * 100;

    if (priceImpactPercent > 10) {
      warnings.push('HIGH_PRICE_IMPACT');
    }

    return {
      side: 'SELL',
      model: 'AMM_CONSTANT_PRODUCT',
      marketPrice,
      executionPrice,
      priceImpactPercent,
      slippagePercent: priceImpactPercent,
      feeUsd,
      grossUsd,
      netUsd,
      tokenAmount,
      warnings
    };
  }

  private fallbackFixedBuy(inputUsd: number, marketPrice: number): ExecutionSimulation {
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
      warnings: ['AMM_FALLBACK_TO_FIXED']
    };
  }

  private fallbackFixedSell(tokenAmount: number, marketPrice: number): ExecutionSimulation {
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
      warnings: ['AMM_FALLBACK_TO_FIXED']
    };
  }
}
