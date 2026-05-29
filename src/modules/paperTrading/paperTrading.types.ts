import { TokenSignalInput } from '../../types';

export interface EvaluateEntryContext {
  signal: TokenSignalInput;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}
