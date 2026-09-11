import type {
  DominanceData,
  Metric,
  MetricDirection,
  StablecoinData,
} from "@/app/types/btc-dashboard";

const DEDICATED_METRICS = new Set(["stablecoin_supply", "btc_dominance"]);
const LIVE_DERIVATIVES_METRICS = new Set(["funding", "open_interest"]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function toMetric(
  id: string,
  raw: unknown,
  historicalDate?: string,
): Metric {
  const metric = asRecord(raw);
  const isHistorical = Boolean(historicalDate);

  return {
    id,
    name: String(metric.name ?? id),
    category: String(metric.category ?? ""),
    current: String(metric.current ?? "—"),
    currentDir: (metric.current_dir ?? "flat") as MetricDirection,
    d7: String(metric.d7 ?? "—"),
    vs30d: String(metric.vs30d ?? "—"),
    percentile: Number(metric.percentile ?? 0),
    alert: String(metric.alert ?? "—"),
    alertLevel: (metric.alert_level ?? "none") as Metric["alertLevel"],
    pattern: String(metric.pattern ?? "—"),
    spark: Array.isArray(metric.spark) ? (metric.spark as number[]) : [],
    updated: isHistorical
      ? String(metric.source ?? "Historical")
      : String(metric.last_date ?? "just now"),
    source: typeof metric.source === "string" ? metric.source : undefined,
    _is_override: isHistorical ? false : Boolean(metric._is_override),
    _is_history_fallback: isHistorical
      ? false
      : Boolean(metric._is_history_fallback),
    _is_historical: isHistorical || undefined,
    _date: historicalDate,
    exchange_rates: asRecord(metric.exchange_rates) as Record<string, number>,
    spread: Number(metric.spread ?? 0),
    spread_label: String(metric.spread_label ?? ""),
    high_exchange: String(metric.high_exchange ?? ""),
    low_exchange: String(metric.low_exchange ?? ""),
  };
}

export function transformLiveMetricsPayload(
  data: Record<string, unknown>,
): Metric[] {
  return Object.entries(data)
    .filter(
      ([id]) =>
        !DEDICATED_METRICS.has(id) && !LIVE_DERIVATIVES_METRICS.has(id),
    )
    .map(([id, raw]) => toMetric(id, raw));
}

export function transformHistoricalMetricsPayload(
  data: Record<string, unknown>,
  date: string,
): Metric[] {
  return Object.entries(data)
    .filter(([id]) => !DEDICATED_METRICS.has(id))
    .map(([id, raw]) => toMetric(id, raw, date));
}

export function getDedicatedMetrics(data: Record<string, unknown>): {
  stablecoin: StablecoinData | null;
  dominance: DominanceData | null;
} {
  return {
    stablecoin: data.stablecoin_supply
      ? (data.stablecoin_supply as StablecoinData)
      : null,
    dominance: data.btc_dominance
      ? (data.btc_dominance as DominanceData)
      : null,
  };
}
