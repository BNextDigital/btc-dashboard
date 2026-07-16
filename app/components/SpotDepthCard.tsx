/**
 * SpotDepthCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Spot Depth & Liquidation Cascade Risk — frontend component
 *
 * INTEGRATION INTO page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Add state variable:
 *      const [spotDepth, setSpotDepth] = useState<SpotDepthData | null>(null);
 *
 * 2. Add to fetchAll() (runs every 60s):
 *      const depthRes = await fetch(`${API}/liquidity/depth`);
 *      const depthJson = await depthRes.json();
 *      if (!depthJson.error) setSpotDepth(depthJson);
 *
 * 3. Place component in Section I (Market State Snapshot) after the 8 metric cards,
 *    or create a new Section XIII: Liquidity & Cascade Risk.
 *      {spotDepth && <SpotDepthCard data={spotDepth} />}
 *
 * DESIGN
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches the existing dark theme exactly:
 *   background:  bg-surface / bg-slate-950
 *   border:      hairline / border-slate-800
 *   accent:      #D9A84D (amber)
 *   fonts:       IBM Plex Mono (data), system sans (labels)
 *   alert colors: red (extreme), amber (notable), sage (neutral), slate (none)
 *
 * Layout mirrors the existing MetricCard pattern:
 *   header → current value → band bars → coverage detail → alert badge
 */

import { Shield, AlertTriangle, TrendingDown, Minus, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertLevel = "extreme" | "notable" | "neutral" | "none";

type VenueBreakdown = {
  bid_2pct_usd: string;
  ask_2pct_usd: string;
  share_pct: number;
};

type SpotDepthData = {
  name: string;
  category: string;
  current: string;                     // adjusted coverage ratio e.g. "1.34x"
  current_dir: "up" | "down" | "flat";
  alert: string;
  alert_level: AlertLevel;
  pattern: string;                     // cascade risk label

  spot_price_usd: number;
  bid_depth_0_5pct_usd: string;
  bid_depth_1_0pct_usd: string;
  bid_depth_2_0pct_usd: string;
  ask_depth_2_0pct_usd: string;
  visible_depth_usd: string;
  adjusted_depth_usd: string;
  depth_haircut_pct: string;
  haircut_reason: "stressed" | "normal";

  depth_coverage_ratio: number;
  adjusted_coverage: number;

  liquidation_estimate_usd: string;
  liquidation_source: string;
  oi_usd: string;

  slippage_estimate: string;
  depth_vs_median_pct: number | null;
  venue_concentration_pct: number;
  venues_online: string[];

  cascade_risk_label: string;
  cascade_risk_level: AlertLevel;

  oi_alert_level: AlertLevel;
  funding_alert_level: AlertLevel;

  venue_breakdown: Record<string, VenueBreakdown>;

  updated_at: string;
};

// ─── Helpers (mirrors existing alertClasses pattern) ─────────────────────────

const alertColors: Record<AlertLevel, { text: string; bg: string; border: string; hex: string }> = {
  extreme: { text: "text-red-400",    bg: "bg-red-950/40",    border: "border-red-800",    hex: "#f87171" },
  notable: { text: "text-amber-400",  bg: "bg-amber-950/40",  border: "border-amber-700",  hex: "#D9A84D" },
  neutral: { text: "text-green-400",  bg: "bg-green-950/40",  border: "border-green-800",  hex: "#8DA078" },
  none:    { text: "text-slate-400",  bg: "bg-slate-900",     border: "border-slate-800",  hex: "#94a3b8" },
};

function coverageColor(ratio: number): string {
  if (ratio >= 1.5) return "#8DA078";   // sage — deep
  if (ratio >= 1.0) return "#D9A84D";   // amber — adequate
  if (ratio >= 0.75) return "#f97316";  // orange — thin
  return "#f87171";                      // red — fragile
}

function coverageLabel(ratio: number): string {
  if (ratio >= 1.5) return "Deep";
  if (ratio >= 1.0) return "Adequate";
  if (ratio >= 0.75) return "Thin";
  if (ratio >= 0.5)  return "Fragile";
  return "Critical";
}

function slippageColor(slippage: string): string {
  if (slippage === "< 0.5%")   return "#8DA078";
  if (slippage === "0.5–1.0%") return "#D9A84D";
  if (slippage === "1.0–2.0%") return "#f97316";
  return "#f87171";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Horizontal depth bar — proportional to band size */
function DepthBar({ label, value, max, color }: { label: string; value: string; max: number; color: string }) {
  // Extract raw number from formatted string (e.g. "$450M" → 450)
  const raw = parseFloat(value.replace(/[$BMK,]/g, "")) *
    (value.includes("B") ? 1000 : value.includes("M") ? 1 : 0.001);
  const pct = max > 0 ? Math.min((raw / max) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="font-mono text-slate-500 w-8 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-slate-300 w-14 text-right shrink-0">{value}</span>
    </div>
  );
}

/** Single venue share pill */
function VenuePill({ name, share, depth }: { name: string; share: number; depth: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="font-mono text-slate-500">{name}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-16 bg-slate-900 rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-slate-500 rounded-full"
            style={{ width: `${Math.min(share, 100)}%` }}
          />
        </div>
        <span className="font-mono text-slate-400 w-10 text-right">{depth}</span>
        <span className="text-slate-600 w-8 text-right">{share}%</span>
      </div>
    </div>
  );
}

/** Alert badge — matches existing Badge component pattern */
function Badge({ level, label }: { level: AlertLevel; label: string }) {
  if (!label || label === "—") return null;
  const c = alertColors[level];
  return (
    <span className={`text-[10px] font-mono px-2 py-[3px] border ${c.border} ${c.bg} ${c.text} uppercase tracking-wider`}>
      {label}
    </span>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

export default function SpotDepthCard({ data }: { data: SpotDepthData }) {
  const ac    = data.adjusted_coverage;
  const col   = alertColors[data.alert_level];
  const cvCol = coverageColor(ac);

  // Extract numeric max for bar scaling (use 2% bid depth as 100%)
  const depth2pctRaw = parseFloat(data.bid_depth_2_0pct_usd.replace(/[$BMK,]/g, "")) *
    (data.bid_depth_2_0pct_usd.includes("B") ? 1000 : data.bid_depth_2_0pct_usd.includes("M") ? 1 : 0.001);

  const DirIcon = data.current_dir === "up" ? TrendingDown : data.current_dir === "down" ? AlertTriangle : Minus;

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
        <Badge level={data.alert_level} label={
          data.alert === "—" ? "No alert" : data.alert.split("—")[0].trim()
        } />
      </div>

      {/* ── Coverage ratio — primary value ── */}
      <div className="flex items-end justify-between">
        <div>
          <div className="caps-sm text-faint mb-1">Adjusted coverage (2% depth)</div>
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono-data text-[28px] leading-none tracking-tight"
              style={{ color: cvCol }}
            >
              {data.current}
            </span>
            <span className="font-mono text-[11px]" style={{ color: cvCol }}>
              {coverageLabel(ac)}
            </span>
          </div>
          <div className="font-mono text-[10px] text-slate-600 mt-1">
            {data.adjusted_depth_usd} adjusted / {data.liquidation_estimate_usd} est. forced flow
          </div>
        </div>
        <div className="text-right">
          <div className="caps-sm text-faint mb-1">Visible coverage</div>
          <div className="font-mono text-slate-400 text-[14px]">
            {data.depth_coverage_ratio.toFixed(2)}x
          </div>
          <div className="font-mono text-[10px] text-slate-600">
            {data.depth_haircut_pct} haircut · {data.haircut_reason}
          </div>
        </div>
      </div>

      {/* ── Depth bands ── */}
      <div className="border-t border-slate-900 pt-3 flex flex-col gap-1.5">
        <div className="caps-sm text-faint mb-1">Bid depth by band (aggregated)</div>
        <DepthBar label="0.5%" value={data.bid_depth_0_5pct_usd} max={depth2pctRaw} color={cvCol} />
        <DepthBar label="1.0%" value={data.bid_depth_1_0pct_usd} max={depth2pctRaw} color={cvCol} />
        <DepthBar label="2.0%" value={data.bid_depth_2_0pct_usd} max={depth2pctRaw} color={cvCol} />
      </div>

      {/* ── Key stats row ── */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-900 pt-3 text-[11px]">
        <div>
          <div className="caps-sm text-faint mb-1">Slippage est.</div>
          <div
            className="font-mono"
            style={{ color: slippageColor(data.slippage_estimate) }}
          >
            {data.slippage_estimate}
          </div>
        </div>
        <div>
          <div className="caps-sm text-faint mb-1">Depth vs 30d med.</div>
          <div className={`font-mono ${
            data.depth_vs_median_pct == null ? "text-slate-600" :
            data.depth_vs_median_pct < 60 ? "text-red-400" :
            data.depth_vs_median_pct < 80 ? "text-amber-400" :
            "text-slate-300"
          }`}>
            {data.depth_vs_median_pct != null ? `${data.depth_vs_median_pct}%` : "building…"}
          </div>
        </div>
        <div>
          <div className="caps-sm text-faint mb-1">Venue conc.</div>
          <div className={`font-mono ${
            data.venue_concentration_pct > 70 ? "text-amber-400" : "text-slate-300"
          }`}>
            {data.venue_concentration_pct}%
          </div>
        </div>
      </div>

      {/* ── Venue breakdown ── */}
      {Object.keys(data.venue_breakdown).length > 0 && (
        <div className="border-t border-slate-900 pt-3 flex flex-col gap-1">
          <div className="caps-sm text-faint mb-1">Venue breakdown (2% bid depth)</div>
          {Object.entries(data.venue_breakdown).map(([venue, v]) => (
            <VenuePill key={venue} name={venue} share={v.share_pct} depth={v.bid_2pct_usd} />
          ))}
        </div>
      )}

      {/* ── Compound signals ── */}
      <div className="border-t border-slate-900 pt-3 flex flex-col gap-1 text-[10px]">
        <div className="caps-sm text-faint mb-1">Compound signals</div>
        <div className="flex gap-2 flex-wrap">
          <span className={`font-mono px-1.5 py-0.5 border ${alertColors[data.oi_alert_level].border} ${alertColors[data.oi_alert_level].bg} ${alertColors[data.oi_alert_level].text}`}>
            OI · {data.oi_alert_level}
          </span>
          <span className={`font-mono px-1.5 py-0.5 border ${alertColors[data.funding_alert_level].border} ${alertColors[data.funding_alert_level].bg} ${alertColors[data.funding_alert_level].text}`}>
            Funding · {data.funding_alert_level}
          </span>
          <span className="font-mono px-1.5 py-0.5 border border-slate-800 bg-slate-900 text-slate-500">
            Liq est · {data.liquidation_source === "CoinGlass heatmap" ? "live" : "heuristic"}
          </span>
        </div>
      </div>

      {/* ── Pattern label ── */}
      <div className="flex items-center justify-between border-t border-slate-900 pt-2">
        <span className="caps-sm text-faint">Assessment</span>
        <span className={`font-sans-body text-[11px] italic ${
          data.cascade_risk_level === "extreme" ? "text-red-400" :
          data.cascade_risk_level === "notable" ? "text-amber-400" :
          "text-slate-400"
        }`}>
          {data.cascade_risk_label}
        </span>
      </div>

      {/* ── Live indicator ── */}
      <div className="flex items-center gap-1 text-faint text-[10px]">
        <Activity size={8} className="text-slate-600" />
        <span className="font-mono">
          {data.venues_online.join(" · ")} · refreshes 60s
        </span>
      </div>
    </div>
  );
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * INTEGRATION CHECKLIST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Backend (main.py):
 *   from liquidity_depth_routes import liquidity_router
 *   app.include_router(liquidity_router)
 *
 * Frontend (page.tsx):
 *   1. Add to imports:
 *        import { SpotDepthCard } from "./SpotDepthCard";
 *        // Or paste the component inline if keeping single-file architecture
 *
 *   2. Add state:
 *        const [spotDepth, setSpotDepth] = useState<SpotDepthData | null>(null);
 *
 *   3. Add to fetchAll():
 *        try {
 *          const depthRes = await fetch(`${API}/liquidity/depth`);
 *          const depthJson = await depthRes.json();
 *          if (!depthJson.error) setSpotDepth(depthJson);
 *        } catch (e) { console.warn("Depth fetch failed", e); }
 *
 *   4. Add to JSX (Section I or new section):
 *        {spotDepth && <SpotDepthCard data={spotDepth} />}
 *
 * Type definition (add to page.tsx type block):
 *   type SpotDepthData = { ... }  // paste from top of this file
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TUNING
 * ─────────────────────────────────────────────────────────────────────────────
 * In liquidity_depth_routes.py:
 *   DEPTH_HAIRCUT_NORMAL   = 0.60  ← increase to be less conservative
 *   DEPTH_HAIRCUT_STRESSED = 0.40  ← tighten/loosen stress discount
 *   ASSESS_CACHE_TTL       = 60    ← reduce to 30 for faster updates
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
