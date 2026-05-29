import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SlippageService } from '../src/modules/execution/slippage.service';

vi.mock('../src/config/env', () => ({
  env: {
    SLIPPAGE_MODEL: 'FIXED',
    SIMULATED_BUY_SLIPPAGE_PERCENT: 3,
    SIMULATED_SELL_SLIPPAGE_PERCENT: 5,
    SIMULATED_FEE_PERCENT: 1
  }
}));

describe('SlippageService', () => {
  let slippageService: SlippageService;

  beforeEach(() => {
    slippageService = new SlippageService();
  });

  it('should simulate fixed buy', () => {
    const simulation = slippageService.simulateBuy(100, 1, 10000);
    expect(simulation.model).toBe('FIXED');
    expect(simulation.executionPrice).toBe(1.03);
    expect(simulation.netUsd).toBe(99);
  });

  it('should simulate fixed sell', () => {
    const simulation = slippageService.simulateSell(100, 1, 10000); // 100 tokens
    expect(simulation.model).toBe('FIXED');
    expect(simulation.executionPrice).toBe(0.95);
    expect(simulation.grossUsd).toBe(95);
    expect(simulation.netUsd).toBe(95 * 0.99);
  });
});
