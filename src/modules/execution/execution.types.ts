export interface ExecutionSimulation {
  side: 'BUY' | 'SELL';
  model: 'FIXED' | 'AMM_CONSTANT_PRODUCT';
  marketPrice: number;
  executionPrice: number;
  priceImpactPercent: number;
  slippagePercent: number;
  feeUsd: number;
  grossUsd: number;
  netUsd: number;
  tokenAmount: number;
  warnings: string[];
}
