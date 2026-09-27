export interface AltcoinProvenance {
  source: string;
  source_type: string;
  methodology?: string;
  universe?: string;
  calculation_version?: string;
}

export interface AltcoinState {
  label: string;
  confidence: number;
  coverage: number;
  timestamp: string;
  summary: string;
}

export interface AltcoinMarket {
  altcoin_market_cap: number | null;
  total_market_cap: number | null;
  btc_dominance: number | null;
  timestamp: string | null;
  provenance: AltcoinProvenance;
}

export interface AltcoinBreadth {
  universe_size: number;
  eligible_200dma: number;
  above_20dma_pct: number | null;
  above_50dma_pct: number | null;
  above_200dma_pct: number | null;
  ex_eth_above_200dma_pct: number | null;
  live_above_200dma_pct: number | null;
  median_distance_20dma: number | null;
  median_distance_50dma: number | null;
  median_distance_200dma: number | null;
  highs_30d_pct: number | null;
  highs_90d_pct: number | null;
  lows_30d_pct: number | null;
  coverage: {
    universe_symbols: number;
    with_any_history: number;
    with_minimum_history: number;
    minimum_days: number;
  };
  provenance: AltcoinProvenance;
}

export interface AltcoinRotation {
  eth_btc: number | null;
  outperforming_btc_7d_pct: number | null;
  outperforming_btc_30d_pct: number | null;
  outperforming_btc_90d_pct: number | null;
  median_relative_return_btc_30d: number | null;
  outperforming_eth_30d_pct: number | null;
  median_relative_return_eth_30d: number | null;
  provenance: AltcoinProvenance;
}

export interface AltcoinBenchmarks {
  btc?: { change_30d: number | null };
  eth?: { change_30d: number | null };
  cmc20?: {
    value: number | null;
    change_24h_pct: number | null;
    timestamp: string | null;
    source: string;
  } | null;
  cmc100?: {
    value: number | null;
    change_24h_pct: number | null;
    timestamp: string | null;
    source: string;
  } | null;
  external_altseason_index?: {
    value: number | null;
    timestamp: string | null;
    source: string;
  } | null;
}

export interface AltcoinMetrics {
  state: AltcoinState;
  market: AltcoinMarket;
  breadth: AltcoinBreadth;
  rotation: AltcoinRotation;
  benchmarks: AltcoinBenchmarks;
  exchange_activity: {
    status: string;
    note: string;
  };
  diagnostics: {
    supporting: string[];
    contradicting: string[];
    missing: string[];
    methodology: {
      version: string;
      state_flow: string[];
      universe: string;
      minimum_history_days: number;
    };
    providers: Record<string, boolean | string>;
  };
}
