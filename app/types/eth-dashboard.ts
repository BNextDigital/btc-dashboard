import type {
  DecisionMetric,
  DecisionPrice,
  DecisionSummary,
  ProtocolTvl,
} from "@/app/types/asset-dashboard";

export type EthMetricKey =
  | "price_move"
  | "volume"
  | "funding"
  | "open_interest"
  | "cme_basis"
  | "defi_tvl"
  | "l2_tvl"
  | "staking_rate"
  | "eth_btc_ratio"
  | "gas_price";

export type EthMetrics = Record<EthMetricKey, DecisionMetric>;

export interface EthPrice extends DecisionPrice {
  price_btc: number | null;
}

export type EthSummary = DecisionSummary;

export interface L2Chain {
  name: string;
  tvl: number | null;
}

export interface EthTvlResponse {
  mainnet: { tvl_usd: number | null };
  l2: { total_l2_tvl: number | null; chains: L2Chain[] };
  protocols: ProtocolTvl[];
  dex: { dex_volume_24h: number | null };
}

export interface EthStructural {
  eth_btc_ratio: number | null;
  staking_rate_pct: number | null;
  staked_eth_M: number | null;
  active_validators: number | null;
  l2_total_tvl: number | null;
  l2_chains: L2Chain[];
  gas_gwei: number | null;
  burn_note: string;
  etf_note: string;
}
