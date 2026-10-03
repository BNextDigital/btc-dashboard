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
  expected_live: string | null;
  launched_at?: string;
  announced?: string;
  partner_count: number;
  partner_count_display?: string;
  partner_count_qualifier?: string;
  partner_count_exact?: number | null;
  native_chains?: string[];
  solana_mint?: string;
  partner_signals?: { key: string; role: string; confirmed: boolean }[];
  thesis_signals: { confirms: string[]; invalidates: string[] };
  sources?: { id: string; title: string; url: string; published_at: string }[];
  data_quality?: {
    status: string;
    verified_at: string;
    verification_age_days: number;
    review_after_days: number;
    live_telemetry_available: boolean;
    note: string;
  };
  _data_mode?: string;
  _last_updated?: string;
}
