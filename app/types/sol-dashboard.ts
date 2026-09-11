import type {
  DecisionMetric,
  DecisionPrice,
  DecisionSummary,
  ProtocolTvl,
} from "@/app/types/asset-dashboard";

export type SolMetricKey =
  | "price_move"
  | "volume"
  | "funding"
  | "open_interest"
  | "cme_basis"
  | "defi_tvl"
  | "dex_volume"
  | "staking_rate"
  | "stablecoin_sol"
  | "dominance";

export type SolMetrics = Record<SolMetricKey, DecisionMetric>;

export type SolPrice = DecisionPrice;
export type SolSummary = DecisionSummary;

export interface SolTvlResponse {
  chain_tvl: { tvl_usd: number | null };
  protocols: ProtocolTvl[];
  dex_volume: {
    dex_volume_24h: number | null;
    dex_volume_7d: number | null;
  };
}

export interface OusdStatus {
  status: string;
  expected_live: string;
  partner_count: number;
  thesis_signals: { confirms: string[]; invalidates: string[] };
}
