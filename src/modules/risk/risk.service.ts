import { TokenSignalInput, RiskLevel } from '../../types';
import { RiskAnalysisResult, RiskCheckResult } from './risk.types';
import { runOnchainChecks } from './onchainChecks.service';
import { env } from '../../config/env';
import { logger } from '../../logger';

export class RiskService {
  async analyzeRisk(signal: TokenSignalInput): Promise<RiskAnalysisResult> {
    const checks: RiskCheckResult[] = [];
    let score = 0;
    const reasons: string[] = [];

    // Basic data checks
    if (!signal.pairAddress) {
      checks.push({ name: 'Pair Address', status: 'FAIL', penalty: 50, message: 'Missing pair address' });
    }
    if (!signal.tokenAddress) {
      checks.push({ name: 'Token Address', status: 'FAIL', penalty: 50, message: 'Missing token address' });
    }
    if (!signal.priceUsd || signal.priceUsd <= 0) {
      checks.push({ name: 'Price', status: 'FAIL', penalty: 50, message: 'Invalid or missing price' });
    }

    // Liquidity check
    if (!signal.liquidityUsd || signal.liquidityUsd < env.MIN_LIQUIDITY_USD) {
      checks.push({ name: 'Liquidity', status: 'FAIL', penalty: 30, value: signal.liquidityUsd, message: `Below minimum (${env.MIN_LIQUIDITY_USD})` });
    } else {
      checks.push({ name: 'Liquidity', status: 'PASS', penalty: 0, value: signal.liquidityUsd });
    }

    // Volume check
    if (!signal.volume5mUsd || signal.volume5mUsd < env.MIN_VOLUME_5M_USD) {
      checks.push({ name: 'Volume 5m', status: 'FAIL', penalty: 20, value: signal.volume5mUsd, message: `Below minimum (${env.MIN_VOLUME_5M_USD})` });
    } else {
      checks.push({ name: 'Volume 5m', status: 'PASS', penalty: 0, value: signal.volume5mUsd });
    }

    // Buy Ratio check
    if (signal.buyRatio < env.MIN_BUY_RATIO) {
      checks.push({ name: 'Buy Ratio', status: 'FAIL', penalty: 20, value: signal.buyRatio, message: `Below minimum (${env.MIN_BUY_RATIO})` });
    } else {
      checks.push({ name: 'Buy Ratio', status: 'PASS', penalty: 0, value: signal.buyRatio });
    }

    // Market Cap check
    if (!signal.marketCapUsd || signal.marketCapUsd < env.MIN_MARKET_CAP_USD || signal.marketCapUsd > env.MAX_MARKET_CAP_USD) {
      checks.push({ name: 'Market Cap', status: 'FAIL', penalty: 25, value: signal.marketCapUsd, message: `Outside range [${env.MIN_MARKET_CAP_USD}, ${env.MAX_MARKET_CAP_USD}]` });
    } else {
      checks.push({ name: 'Market Cap', status: 'PASS', penalty: 0, value: signal.marketCapUsd });
    }

    // Age check
    if (signal.pairAgeMinutes < env.RISK_MIN_PAIR_AGE_MINUTES) {
      checks.push({ name: 'Pair Age', status: 'FAIL', penalty: 30, value: signal.pairAgeMinutes, message: `Too new (< ${env.RISK_MIN_PAIR_AGE_MINUTES}m)` });
    } else {
      checks.push({ name: 'Pair Age', status: 'PASS', penalty: 0, value: signal.pairAgeMinutes });
    }

    if (env.DATA_SOURCE_MODE === 'mock') {
      checks.push({ name: 'Mock Data', status: 'UNKNOWN', penalty: 5, message: 'Data is simulated' });
    }

    // On-chain checks
    const onchainChecks = await runOnchainChecks(signal.tokenAddress);
    checks.push(...onchainChecks);

    for (const check of checks) {
      score += check.penalty;
      if (check.penalty > 0) {
        reasons.push(`${check.name}: ${check.message}`);
      }
    }

    score = Math.min(Math.max(score, 0), 100);
    const level = this.getRiskLevel(score);

    const unknownChecks = checks.filter(c => c.status === 'UNKNOWN');

    return {
      score,
      level,
      reasons,
      checks,
      unknownChecks
    };
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score <= 30) return 'LOW';
    if (score <= 60) return 'MEDIUM';
    if (score <= 80) return 'HIGH';
    return 'EXTREME';
  }
}
