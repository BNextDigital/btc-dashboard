export type AlertLevel = "extreme" | "notable" | "neutral" | "none";

export type MetricDirection = "up" | "down" | "flat";

export interface Metric {
  id: string;
  name: string;
  category: string;
  current: string;
  currentDir: MetricDirection;
  d7: string;
  vs30d: string;
  percentile: number;
  alert: string;
  alertLevel: AlertLevel;
  pattern: string;
  spark: number[];
  updated: string;
  _is_override: boolean;
  _is_historical?: boolean;
  _date?: string;
  _is_history_fallback?: boolean;
  exchange_rates?: Record<string, number>;
  spread?: number;
  spread_label?: string;
  high_exchange?: string;
  low_exchange?: string;
  source?: string;
  last_date?: string;
}

export interface StablecoinData {
  name: string;
  category: string;
  current: string;
  current_dir: MetricDirection;
  d7: string;
  vs30d: string;
  percentile: number;
  alert: string;
  alert_level: AlertLevel;
  pattern: string;
  spark: number[];
  usdt: string;
  usdc: string;
  usdt_raw?: number;
  usdc_raw?: number;
  usdt_share: number;
  usdc_share: number;
  usdt_7d: string;
  usdc_7d: string;
  _is_override?: boolean;
}

export interface DominanceData {
  name: string;
  category: string;
  current: string;
  current_dir: MetricDirection;
  d7: string;
  vs30d: string;
  percentile: number;
  alert: string;
  alert_level: AlertLevel;
  pattern: string;
  spark: number[];
  btc_cap: string;
  alt_cap: string;
  total_cap: string;
  btc_share: number;
  alt_share: number;
  dominance_pct: number;
  _is_override?: boolean;
}

export interface ProxyStock {
  ticker: string;
  name: string;
  price: string;
  change_1d: string;
  change_7d: string;
  change_1d_raw: number;
  change_7d_raw: number;
  corr_7d: number;
  corr_30d: number;
  corr_90d: number;
  lead_lag_label: string;
  lead_lag_days: number;
  regime: string;
  spark: number[];
}

export interface EtfAumData {
  total_aum: string;
  total_aum_raw: number | null;
  d7_chg: string;
  d7_pct: string;
  d30_chg: string;
  d30_pct: string;
  percentile: number;
  alert: string;
  alert_level: Exclude<AlertLevel, "neutral">;
  spark: number[];
  breakdown: Array<{
    ticker: string;
    name: string;
    aum: string;
    share_pct: number | null;
  }>;
  etf_count: number;
  note: string;
  updated_at: string;
}

export interface SummaryData {
  structure: string;
  extreme_count: number;
  notable_count: number;
  active_alerts: Array<{
    metric: string;
    alert: string;
    level: string;
    current: string;
  }>;
}

export interface NewsItem {
  title: string;
  source: string;
  time: string;
  tag: string;
  url: string;
}

export interface CausalData {
  chain: Array<{ label: string; state: string; weight: string }>;
  contradiction: string;
}

export interface PriceData {
  price: string;
  change_24h: string;
}

export interface PremiumData {
  premium_bps?: number | null;
  premium_usd?: number | null;
  onshore_price?: number | null;
  offshore_price?: number | null;
  onshore_label?: string;
  offshore_label?: string;
  alert_level?: AlertLevel;
  pattern?: string;
}

export interface JudgmentState {
  read: string;
  supports: string;
  contradicts: string;
  invalidates: string;
  plan: string;
  risk: string | null;
}

export interface TradeLog {
  date: string;
  structure: string;
  read: string;
  plan: string;
  result: string;
  bias: string;
  btc_price?: string;
}

export interface TradeExecution {
  date: string;
  market_state: string;
  planned_entry: number;
  actual_entry: number;
  slippage: number;
  size_btc: number;
  max_drawdown_pct: number;
  max_drawdown_price: number;
  current_volume: number;
}

export interface ManualOverride {
  name?: string;
  current?: string;
  d7?: string;
  vs30d?: string;
  alert?: string;
  source?: string;
  updated_at?: string;
}

export interface ManualHistoryEntry {
  metric: string;
  date: string;
  current?: string;
  d7?: string;
  vs30d?: string;
  percentile?: number | null;
  alert?: string;
  pattern?: string;
  source?: string;
}

export interface VenueBreakdown {
  bid_2pct_usd: string;
  ask_2pct_usd: string;
  share_pct: number;
}

export interface SpotDepthData {
  name: string;
  category: string;
  current: string;
  current_dir: MetricDirection;
  alert: string;
  alert_level: AlertLevel;
  pattern: string;
  spot_price_usd: number;
  bid_depth_0_5pct_usd: string;
  bid_depth_1_0pct_usd: string;
  bid_depth_2_0pct_usd: string;
  ask_depth_2_0pct_usd: string;
  visible_depth_usd: string;
  adjusted_depth_usd: string;
  depth_haircut_pct: string;
  haircut_reason: "stressed" | "normal";
  depth_coverage_ratio: number | null;
  adjusted_coverage: number | null;
  liquidation_estimate_usd: string;
  liquidation_source: string;
  oi_usd: string;
  oi_age_seconds?: number | null;
  leverage_context_source?: string;
  slippage_estimate: string;
  depth_vs_median_pct: number | null;
  depth_history_days?: number;
  depth_history_samples?: number;
  venue_concentration_pct: number;
  venues_online: string[];
  cascade_risk_label: string;
  cascade_risk_level: AlertLevel;
  oi_alert_level: AlertLevel;
  funding_alert_level: AlertLevel;
  venue_breakdown: Record<string, VenueBreakdown>;
  venue_mid_prices?: Record<string, number>;
  updated_at: string;
}

export interface PressureCell {
  score?: number | null;
  level?:
    | "high"
    | "elevated"
    | "moderate"
    | "low"
    | "unavailable"
    | string;
}

export interface PerpsPressureData {
  name?: string;
  category?: string;
  updated_at?: string;
  state?: {
    code?: string;
    label?: string;
    primary_side?: "longs" | "shorts" | "mixed" | string;
    severity?: string;
    explanation?: string;
  };
  matrix?: {
    longs?: Record<string, PressureCell>;
    shorts?: Record<string, PressureCell>;
  };
  carry?: {
    payer?: string;
    funding_pct_8h?: number | null;
    annualized_pct_if_persisted?: number | null;
    cumulative_7d_pct?: number | null;
    cumulative_30d_pct?: number | null;
    history_days_available?: number;
    hypothetical_notional_usd?: number | null;
    cost_per_day_if_rate_persisted_usd?: number | null;
    cost_per_week_if_rate_persisted_usd?: number | null;
    exchange_rates_pct_8h?: Record<string, number>;
    persistence_24h?: {
      coverage_hours?: number | null;
      sample_count?: number;
      positive_share_pct?: number | null;
      negative_share_pct?: number | null;
      dominant_side?: string;
    };
    note?: string;
  };
  positioning?: {
    oi_display?: string;
    oi_change_24h_pct?: number | null;
    oi_change_7d_pct?: number | null;
    price_usd?: number | null;
    price_change_1d_pct?: number | null;
    price_change_7d_pct?: number | null;
  };
  forced_flow?: {
    side?: string;
    state?: string;
    label?: string;
    confidence?: string;
    explanation?: string;
  };
  liquidation_vulnerability?: {
    status?: string;
    source?: string | null;
    long_cluster_display?: string;
    short_cluster_display?: string;
    note?: string;
  };
    basis_context?: {
    status?: string;
    annualized?: number | string | null;
    cme_annualized_pct?: number | null;
    perp_annualized_pct?: number | null;
    spread_vs_perp_pp?: number | null;
    raw_basis?: number | string | null;
    days_to_exp?: number | null;
    futures_px?: number | null;
    spot_px?: number | null;
    trend_5d?: string | null;
    trend_note?: string | null;
    pattern?: string | null;
    alert?: string | null;
    alert_level?: string | null;
    regime_code?: string | null;
    regime_label?: string | null;
    interpretation?: string | null;
    comparison_note?: string | null;
    source?: string | null;
  };
  data_quality?: {
    status?: string;
    core_inputs_available?: number;
    funding_sample_count_24h?: number;
    funding_history_coverage_hours?: number;
    liquidation_clusters?: string;
  };
}

export interface DashboardCache {
  metrics?: Metric[];
  stablecoin?: StablecoinData;
  dominance?: DominanceData;
  price?: PriceData;
  summary?: SummaryData;
  news?: NewsItem[];
  causal?: CausalData;
  premium?: PremiumData;
  spotDepth?: SpotDepthData;
  perpsPressure?: PerpsPressureData;
  proxyStocks?: ProxyStock[];
  etfAum?: EtfAumData;
  ts?: number;
}

export interface BtcDashboardBundle {
  asset: "btc";
  revision: string;
  generatedAt?: string | null;
  missingRoutes?: string[];
  price?: PriceData;
  metrics?: Record<string, unknown>;
  summary?: SummaryData;
  causal?: CausalData;
  premium?: PremiumData;
  spotDepth?: SpotDepthData & { error?: string };
  perpsPressure?: PerpsPressureData;
  proxyStocks?: {
    crypto_proxies?: Record<string, ProxyStock>;
  };
  news?: {
    items?: NewsItem[];
  };
  etfAum?: EtfAumData;
}
