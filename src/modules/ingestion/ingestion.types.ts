export interface IngestionAdapter {
  fetchLatestCandidates(): Promise<any[]>;
  fetchPairByAddress(pairAddress: string): Promise<any | null>;
}
