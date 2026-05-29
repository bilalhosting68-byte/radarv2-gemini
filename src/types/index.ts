export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type SignalDecisionType = 'OPENED' | 'SKIPPED';
export type PositionStatus = 'OPEN' | 'CLOSED';
export type CloseReason = 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP' | 'MAX_HOLD' | 'STALE_PRICE' | 'EMERGENCY_INVALID_PRICE';

export interface TokenSignalInput {
  tokenAddress: string;
  pairAddress: string;
  chain: string;
  dex: string;
  symbol: string;
  name: string;
  priceUsd: number;
  liquidityUsd: number;
  marketCapUsd: number;
  volume5mUsd: number;
  volume1hUsd: number;
  buys5m: number;
  sells5m: number;
  buyRatio: number;
  pairAgeMinutes: number;
  pairCreatedAt: Date;
  url?: string;
  rawData?: any;
}

export interface PaperPositionInput {
  tokenSignalId: string;
  tokenAddress: string;
  pairAddress: string;
  symbol: string;
  entryMarketPriceUsd: number;
  entryExecutionPriceUsd: number;
  currentPriceUsd: number;
  virtualSizeUsd: number;
  tokenAmount: number;
  entryFeeUsd: number;
  entryPriceImpactPercent: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent: number;
}

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

export interface MetricsSummary {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winratePercent: number;
  totalPnlUsd: number;
  averagePnlUsd: number;
  averagePnlPercent: number;
  averageWinUsd: number;
  averageLossUsd: number;
  profitFactor: number | null;
  maxDrawdownUsd: number;
  biggestWinUsd: number;
  biggestLossUsd: number;
  averageHoldMinutes: number;
  pnlByCloseReason: Record<string, number>;
  pnlByRiskLevel: Record<string, number>;
  pnlByMarketCapRange: Record<string, number>;
  pnlByLiquidityRange: Record<string, number>;
  skippedSignalsByReason: Record<string, number>;
  stalePriceCount: number;
  apiErrorCount: number;
  queueFailureCount: number;
}
