"use client";

import type {
  AlertLevel,
  SpotDepthData,
} from "@/app/types/btc-dashboard";

/** Spot Depth and liquidation-cascade context for the BTC dashboard. */

// ─── Style helpers (mirrors alertClasses in page.tsx) ────────────────────────

const ALERT_STYLES: Record<AlertLevel, { text: string; bg: string; border: string }> = {
  extreme: { text: "text-red-400",   bg: "bg-red-950/40",   border: "border-red-800"   },
  notable: { text: "text-amber-400", bg: "bg-amber-950/40", border: "border-amber-700" },
  neutral: { text: "text-green-400", bg: "bg-green-950/40", border: "border-green-800" },
  none:    { text: "text-slate-400", bg: "bg-slate-900",    border: "border-slate-800" },
};

function coverageHex(ratio: number | null): string {
  if (ratio == null) return "#6B7280";   // unavailable / muted
  if (ratio >= 1.5)  return "#8DA078";   // sage
  if (ratio >= 1.0)  return "#D9A84D";   // amber
  if (ratio >= 0.75) return "#f97316";   // orange
  return "#f87171";                       // red
}

function coverageLabel(ratio: number | null): string {
  if (ratio == null) return "Unavailable";
  if (ratio >= 1.5)  return "Deep";
  if (ratio >= 1.0)  return "Adequate";
  if (ratio >= 0.75) return "Thin";
  if (ratio >= 0.5)  return "Fragile";
  return "Critical";
}

function slippageHex(s: string): string {
  if (!s || s === "—")  return "#6B7280";
  if (s === "< 0.5%")   return "#8DA078";
  if (s === "0.5–1.0%") return "#D9A84D";
  if (s === "1.0–2.0%") return "#f97316";
  return "#f87171";
}

function historyLabel(days: number): string {
  if (days >= 29.5) return "vs 30d median";
  if (days >= 1) return `vs ${Math.max(1, Math.floor(days))}d median`;
  return "Depth history";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ level, label }: { level: AlertLevel; label: string }) {
  if (!label || label === "—") return null;
  const c = ALERT_STYLES[level];
  return (
    <span
      className={`text-[10px] font-mono px-2 py-[3px] border ${c.border} ${c.bg} ${c.text} uppercase tracking-wider whitespace-nowrap`}
    >
      {label.split("—")[0].trim()}
    </span>
  );
}

function DepthBar({
  label,
  formattedValue,
  rawM,   // value in $M for proportional width
  maxM,
  color,
}: {
  label: string;
  formattedValue: string;
  rawM: number;
  maxM: number;
  color: string;
}) {
  const pct = maxM > 0 ? Math.min((rawM / maxM) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2" style={{ fontSize: 11 }}>
      <span className="font-mono text-slate-500 w-8 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-900 rounded-full overflow-hidden" style={{ height: 5 }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-slate-300 w-16 text-right shrink-0">{formattedValue}</span>
    </div>
  );
}

function VenuePill({
  name,
  share,
  depth,
}: {
  name: string;
  share: number;
  depth: string;
}) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: 10 }}>
      <span className="font-mono text-slate-500">{name}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-16 bg-slate-900 rounded-full overflow-hidden" style={{ height: 4 }}>
          <div
            className="h-full bg-slate-500 rounded-full"
            style={{ width: `${Math.min(share, 100)}%` }}
          />
        </div>
        <span className="font-mono text-slate-400 w-12 text-right">{depth}</span>
        <span className="text-slate-600 w-8 text-right">{share}%</span>
      </div>
    </div>
  );
}

// Parses "$450M" → 450, "$1.2B" → 1200, "$300k" → 0.3 (all in $M)
function parseMillion(s: string): number {
  const n = parseFloat(s.replace(/[$,]/g, ""));
  if (isNaN(n)) return 0;
  if (s.includes("B")) return n * 1000;
  if (s.includes("k")) return n / 1000;
  return n; // already M
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SpotDepthCard({ data }: { data: SpotDepthData }) {
  const ac      = data.adjusted_coverage;
  const cvHex   = coverageHex(ac);
  const cvLabel = coverageLabel(ac);

  // For proportional depth bars, use 2% bid depth as 100%
  const max2pctM  = parseMillion(data.bid_depth_2_0pct_usd);
  const raw05M    = parseMillion(data.bid_depth_0_5pct_usd);
  const raw10M    = parseMillion(data.bid_depth_1_0pct_usd);

  const historyDays = data.depth_history_days ?? 0;
  const historySamples = data.depth_history_samples ?? 0;
  const medianLabel = historyLabel(historyDays);

  const liquidationMode =
    data.liquidation_source === "CoinGlass heatmap" ? "live" :
    data.liquidation_source === "OI estimate (heuristic)" ? "OI heuristic" :
    "unavailable";

  const medianColor =
    data.depth_vs_median_pct == null   ? "text-slate-600"  :
    data.depth_vs_median_pct < 60      ? "text-red-400"    :
    data.depth_vs_median_pct < 80      ? "text-amber-400"  :
    "text-slate-300";

  return (
    <div className="bg-surface border hairline p-4 flex flex-col gap-3 hover:bg-surface-2 transition-colors duration-300">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="caps-sm text-faint mb-1">{data.category}</div>
          <h3 className="font-sans-body text-paper text-[14px] font-medium leading-tight">
            Spot Depth / Cascade Risk
          </h3>
        </div>
        <Badge level={data.alert_level} label={data.alert} />
      </div>

      {/* ── Primary value — adjusted coverage ratio ── */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="caps-sm text-faint mb-1">Adjusted coverage (2% depth)</div>
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono-data leading-none tracking-tight"
              style={{ fontSize: 28, color: cvHex }}
            >
              {data.current}
            </span>
            <span className="font-mono text-[11px]" style={{ color: cvHex }}>
              {cvLabel}
            </span>
          </div>
          <div className="font-mono text-slate-600 mt-1" style={{ fontSize: 10 }}>
            {data.adjusted_depth_usd} adjusted · {data.liquidation_estimate_usd} est. forced flow
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="caps-sm text-faint mb-1">Visible</div>
          <div className="font-mono text-slate-400" style={{ fontSize: 14 }}>
            {data.depth_coverage_ratio != null ? `${data.depth_coverage_ratio.toFixed(2)}x` : "—"}
          </div>
          <div className="font-mono text-slate-600" style={{ fontSize: 10 }}>
            {data.depth_haircut_pct} haircut · {data.haircut_reason}
          </div>
        </div>
      </div>

      {/* ── Depth bands ── */}
      <div className="border-t border-slate-900 pt-3 flex flex-col gap-2">
        <div className="caps-sm text-faint mb-0.5">Bid depth by band (aggregated)</div>
        <DepthBar label="0.5%" formattedValue={data.bid_depth_0_5pct_usd} rawM={raw05M} maxM={max2pctM} color={cvHex} />
        <DepthBar label="1.0%" formattedValue={data.bid_depth_1_0pct_usd} rawM={raw10M} maxM={max2pctM} color={cvHex} />
        <DepthBar label="2.0%" formattedValue={data.bid_depth_2_0pct_usd} rawM={max2pctM} maxM={max2pctM} color={cvHex} />
      </div>

      {/* ── Key stats ── */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-900 pt-3">
        <div>
          <div className="caps-sm text-faint mb-1">Slippage est.</div>
          <div
            className="font-mono"
            style={{ fontSize: 12, color: slippageHex(data.slippage_estimate) }}
          >
            {data.slippage_estimate || "—"}
          </div>
        </div>
        <div>
          <div className="caps-sm text-faint mb-1">{medianLabel}</div>
          <div className={`font-mono text-[12px] ${medianColor}`}>
            {data.depth_vs_median_pct != null
              ? `${data.depth_vs_median_pct}%`
              : historySamples > 0
                ? `building · ${historySamples}`
                : "building…"}
          </div>
        </div>
        <div>
          <div className="caps-sm text-faint mb-1">Venue conc.</div>
          <div
            className={`font-mono text-[12px] ${
              data.venue_concentration_pct > 70 ? "text-amber-400" : "text-slate-300"
            }`}
          >
            {data.venue_concentration_pct}%
          </div>
        </div>
      </div>

      {/* ── Venue breakdown ── */}
      {Object.keys(data.venue_breakdown).length > 0 && (
        <div className="border-t border-slate-900 pt-3 flex flex-col gap-1.5">
          <div className="caps-sm text-faint mb-0.5">Venue breakdown (2% bid)</div>
          {Object.entries(data.venue_breakdown).map(([venue, v]) => (
            <VenuePill key={venue} name={venue} share={v.share_pct} depth={v.bid_2pct_usd} />
          ))}
        </div>
      )}

      {/* ── Compound signal pills ── */}
      <div className="border-t border-slate-900 pt-3">
        <div className="caps-sm text-faint mb-1.5">Compound signals</div>
        <div className="flex gap-1.5 flex-wrap">
          {(["oi_alert_level", "funding_alert_level"] as const).map((key) => {
            const level = data[key] as AlertLevel;
            const c     = ALERT_STYLES[level];
            const label = key === "oi_alert_level" ? "OI" : "Funding";
            return (
              <span
                key={key}
                className={`font-mono px-1.5 py-0.5 border ${c.border} ${c.bg} ${c.text}`}
                style={{ fontSize: 10 }}
              >
                {label} · {level}
              </span>
            );
          })}
          <span
            className="font-mono px-1.5 py-0.5 border border-slate-800 bg-slate-900 text-slate-500"
            style={{ fontSize: 10 }}
          >
            Liq · {liquidationMode}
          </span>
        </div>
      </div>

      {/* ── Assessment label (mirrors Pattern row in MetricCard) ── */}
      <div className="flex items-center justify-between hairline-t pt-2">
        <span className="caps-sm text-faint">Assessment</span>
        <span
          className={`font-sans-body text-[11px] italic ${
            data.cascade_risk_level === "extreme" ? "text-red-400"   :
            data.cascade_risk_level === "notable" ? "text-amber-400" :
            "text-slate-400"
          }`}
        >
          {data.cascade_risk_label}
        </span>
      </div>

      {/* ── Snapshot freshness ── */}
      <div className="flex items-center gap-1 text-faint">
        <span
          className="inline-block rounded-full"
          style={{ width: 5, height: 5, background: "#8DA078", flexShrink: 0 }}
        />
        <span className="caps-sm">
          Snapshot · {data.venues_online.join(" · ")} ·{" "}
          {data.updated_at
            ? new Date(data.updated_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/New_York",
                timeZoneName: "short",
              })
            : "—"}
        </span>
      </div>
    </div>
  );
}
