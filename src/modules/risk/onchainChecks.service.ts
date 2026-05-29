import { RiskCheckResult } from './risk.types';
import { env } from '../../config/env';

export async function runOnchainChecks(tokenAddress: string): Promise<RiskCheckResult[]> {
  // Placeholder per futuri controlli on-chain reali (Helius/Birdeye/RPC)
  const unknownPenalty = env.UNKNOWN_ONCHAIN_CHECK_PENALTY;
  
  return [
    {
      name: 'Holder Concentration',
      status: 'UNKNOWN',
      penalty: unknownPenalty,
      message: 'On-chain check non implementato (roadmap)'
    },
    {
      name: 'Mint Authority',
      status: 'UNKNOWN',
      penalty: unknownPenalty,
      message: 'On-chain check non implementato (roadmap)'
    },
    {
      name: 'Freeze Authority',
      status: 'UNKNOWN',
      penalty: unknownPenalty,
      message: 'On-chain check non implementato (roadmap)'
    },
    {
      name: 'LP Burned/Locked',
      status: 'UNKNOWN',
      penalty: unknownPenalty,
      message: 'On-chain check non implementato (roadmap)'
    }
  ];
}
