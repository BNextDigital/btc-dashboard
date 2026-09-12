import type { DecisionMetric } from "@/app/types/asset-dashboard";

export const DECISION_DASHBOARD_API =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ETH/SOL are snapshot-backed by the backend's 15-minute collector. Polling
// five routes every minute only rereads unchanged data.
export const DECISION_REFRESH_MS = 15 * 60_000;

export const BLANK_DECISION_METRIC: DecisionMetric = {
  current: "—",
  d7: "—",
  vs30d: "—",
  percentile: 50,
  alert: "—",
  level: "none",
  pattern: "Connecting to backend…",
  _mock: true,
};

export function alertColor(level: string): string {
  switch (level) {
    case "extreme":
      return "#E05252";
    case "notable":
      return "#D9A84D";
    default:
      return "#374151";
  }
}

export function alertBadge(level: string): string {
  switch (level) {
    case "extreme":
      return "border-red-900 bg-red-950/40 text-red-400";
    case "notable":
      return "border-amber-900 bg-amber-950/30 text-amber-500";
    default:
      return "border-slate-800 text-slate-600";
  }
}

export function structureColor(
  structure: string,
  extremeColor = "#E05252",
): string {
  switch (structure) {
    case "EXTREME":
      return extremeColor;
    case "ELEVATED":
    case "RECOVERY":
      return "#D9A84D";
    default:
      return "#6B7280";
  }
}

export function formatUsd(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value == null) return "—";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatPrice(value: number | null): string {
  return value != null
    ? value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      })
    : "—";
}

export function formatPercent(value: number | null): string {
  return value != null ? `${value >= 0 ? "+" : ""}${value.toFixed(1)}%` : "—";
}
