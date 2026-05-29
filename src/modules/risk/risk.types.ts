export interface RiskCheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  value?: string | number;
  penalty: number;
  message?: string;
}

export interface RiskAnalysisResult {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  reasons: string[];
  checks: RiskCheckResult[];
  unknownChecks: RiskCheckResult[];
}
