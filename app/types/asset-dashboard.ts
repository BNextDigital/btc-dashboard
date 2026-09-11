export type DecisionMetricLevel = "extreme" | "notable" | "none";

export interface DecisionMetric {
  current: string;
  d7: string;
  vs30d: string;
  percentile: number;
  alert: string;
  level: DecisionMetricLevel;
  pattern: string;
  _is_override?: boolean;
  _mock?: boolean;
}

export interface DecisionSummary {
  structure: string;
  extreme: number;
  notable: number;
  neutral: number;
}

export interface DecisionPrice {
  price: number | null;
  change_24h: number | null;
  change_7d: number | null;
}

export interface ProtocolTvl {
  name: string;
  tvl: number | null;
  category: string;
}

export interface NetworkStat {
  label: string;
  value: string;
  detail: string;
  status: boolean | null;
}

export interface DecisionEvent {
  date: string;
  tag: string;
  text: string;
}
