import { describe, it, expect, beforeEach } from 'vitest';
import { AmmService } from '../src/modules/execution/amm.service';

describe('AmmService', () => {
  let ammService: AmmService;

  beforeEach(() => {
    ammService = new AmmService();
  });

  it('should calculate AMM buy correctly', () => {
    const simulation = ammService.simulateBuy(100, 1, 10000);
    expect(simulation.model).toBe('AMM_CONSTANT_PRODUCT');
    expect(simulation.netUsd).toBe(99); // 1% fee
    expect(simulation.tokenAmount).toBeLessThan(99);
    expect(simulation.executionPrice).toBeGreaterThan(1);
  });

  it('should add high price impact warning', () => {
    const simulation = ammService.simulateBuy(5000, 1, 10000);
    expect(simulation.warnings).toContain('HIGH_PRICE_IMPACT');
  });

  it('should fallback if liquidity is invalid', () => {
    const simulation = ammService.simulateBuy(100, 1, 0);
    expect(simulation.model).toBe('FIXED');
    expect(simulation.warnings).toContain('AMM_FALLBACK_TO_FIXED');
  });
});
