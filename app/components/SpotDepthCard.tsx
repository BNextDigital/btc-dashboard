"use client";

/**
 * app/components/SpotDepthCard.tsx — Spot Depth & Liquidation Cascade Risk
 *
 * Drop into: app/components/SpotDepthCard.tsx
 *
 * USAGE IN app/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Import at top:
 *      import SpotDepthCard from "./components/SpotDepthCard";
 *
 * 2. Add state:
 *      const [spotDepth, setSpotDepth] = useState<SpotDepthData | null>(null);
 *
 * 3. Add to fetchAll():
 *      try {
 *        const depthRes  = await fetch(`${API}/liquidity/depth`);
 *        const depthJson = await depthRes.json();
 *        if (!depthJson.error) setSpotDepth(depthJson);
 *      } catch (e) { console.warn("[SpotDepth] fetch failed", e); }
 *
 * 4. Add to JSX (e.g. after the 8 metric cards in Section I, or new section):
 *      {spotDepth && <SpotDepthCard data={spotDepth} />}
 *
 * TYPE — add to page.tsx type block:
 *      type SpotDepthData = Parameters<typeof SpotDepthCard>[0]["data"];
 *    Or paste the SpotDepthData interface below directly into page.tsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Activity, AlertTriangle, TrendingDown, Minus } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertLevel = "extreme" | "notable" | "neutral" | "none";

interface VenueBreakdown {
  bid_2pct_usd: string;
  ask_2pct_usd: string;
  share_pct:    number;
}

export interface SpotDepthData {
  name:         string;
  category:     string;
  current:      string;       // adjusted coverage ratio, e.g. "1.34x"
  current_dir:  "up" | "down" | "flat";
  alert:        string;
  alert_level:  AlertLevel;
  pattern:      string;

  spot_price_usd:         number;
  bid_depth_0_5pct_usd:  string;
  bid_depth_1_0pct_usd:  string;
  bid_depth_2_0pct_usd:  string;
  ask_depth_2_0pct_usd:  string;
  visible_depth_usd:      string;
  adjusted_depth_usd:     string;
  depth_haircut_pct:      string;
  haircut_reason:         "stressed" | "normal";

  depth_coverage_ratio:   number;
  adjusted_coverage:      number;

  liquidation_estimate_usd: string;
  liquidation_source:       string;
  oi_usd:                   string;

  slippage_estimate:       string;
  depth_vs_median_pct:     number | null;
  venue_concentration_pct: number;
  venues_online:           string[];

  cascade_risk_label:  string;
  cascade_risk_level:  AlertLevel;

  oi_alert_level:      AlertLevel;
  funding_alert_level: AlertLevel;

  venue_breakdown: Record<string, VenueBreakdown>;

  updated_at: string;
}

// ─── Style helpers (mirrors alertClasses in page.tsx) ────────────────────────

const ALERT_STYLES: Record<AlertLevel, { text: string; bg: string; border: string }> = {
  extreme: { text: "text-red-400",   bg: "bg-red-950/40",   border: "border-red-800"   },
  notable: { text: "text-amber-400", bg: "bg-amber-950/40", border: "border-amber-700" },
  neutral: { text: "text-green-400", bg: "bg-green-950/40", border: "border-green-800" },
  none:    { text: "text-slate-400", bg: "bg-slate-900",    border: "border-slate-800" },
};

function coverageHex(ratio: number): string {
  if (ratio >= 1.5)  return "#8DA078";  // sage
  if (ratio >= 1.0)  return "#D9A84D";  // amber
  if (ratio >= 0.75) return "#f97316";  // orange
  return "#f87171";                      // red
}

function coverageLabel(ratio: number): string {
  if (ratio >= 1.5)  return "Deep";
  if (ratio >= 1.0)  return "Adequate";
  if (ratio >= 0.75) return "Thin";
  if (ratio >= 0.5)  return "Fragile";
  return "Critical";
}

function slippageHex(s: string): string {
  if (s === "< 0.5%")   return "#8DA078";
  if (s === "0.5–1.0%") return "#D9A84D";
  if (s === "1.0–2.0%") return "#f97316";
  return "#f87171";
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

  const DirIcon =
    data.current_dir === "down" ? AlertTriangle :
    data.current_dir === "up"   ? TrendingDown  :
    Minus;

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
            {data.depth_coverage_ratio.toFixed(2)}x
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
          <div className="caps-sm text-faint mb-1">vs 30d median</div>
          <div className={`font-mono text-[12px] ${medianColor}`}>
            {data.depth_vs_median_pct != null
              ? `${data.depth_vs_median_pct}%`
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
            Liq · {data.liquidation_source === "CoinGlass heatmap" ? "live" : "heuristic"}
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

      {/* ── Live indicator (mirrors pulse-dot pattern) ── */}
      <div className="flex items-center gap-1 text-faint">
        <span
          className="inline-block rounded-full pulse-dot"
          style={{ width: 5, height: 5, background: "#8DA078", flexShrink: 0 }}
        />
        <span className="caps-sm">
          {data.venues_online.join(" · ")} · {data.updated_at ? new Date(data.updated_at).toLocaleTimeString() : "—"}
        </span>
      </div>
    </div>
  );
}
