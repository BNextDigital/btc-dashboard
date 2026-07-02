"use client";

/**
 * app/sector-flows/page.tsx — Comprehensive Sector Capital Flow Matrix v3
 *
 * Sections:
 *   Regime Read  — composite risk-on / risk-off synthesis (banner)
 *   I.   Leading Indicators  — HYG/LQD · KRE/KBE · XLP/XLY · SOXX/EWY
 *   II.  Rotation Matrix     — all sectors ranked by RS vs SPY
 *   III. Technology
 *   IV.  Financials
 *   V.   Consumer
 *   VI.  Healthcare
 *   VII. Industrials
 *   VIII.Energy
 *   IX.  Materials
 *   X.   Real Estate
 *   XI.  Utilities
 *   XII. Korea & International
 *   XIII.Bonds
 *   XIV. Commodities
 *   XV.  Crypto
 *   XVI. COT Positioning
 *
 * Data: GET /sector-flows/metrics  (sector_flows_routes.py v3)
 * Cache: 5 min backend (OHLCV + shared yf_cache Close prices)
 */

import { useEffect, useState, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NameCard {
  key: string;
  ticker: string;
  current?: number | null;
  chg_5d?: number | null;
  rs_5d?: number | null;
  rs_20d?: number | null;
  above_sma50?: boolean | null;
  above_sma200?: boolean | null;
  pct_from_sma50?: number | null;
  pct_from_sma200?: number | null;
  percentile?: number | null;
  volume_momentum?: number | null;
  obv_zscore?: number | null;
  error?: string;
}

interface SectorCard {
  key: string;
  name: string;
  group: string;
  primary_etf: string;
  secondary_etf?: string | null;
  tier: number;
  btc_signal: string;
  index_ref?: string;
  current?: number | null;
  chg_1d?: number | null;
  chg_5d?: number | null;
  chg_20d?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  pct_from_sma20?: number | null;
  pct_from_sma50?: number | null;
  pct_from_sma200?: number | null;
  rs_5d?: number | null;
  rs_20d?: number | null;
  percentile?: number | null;
  mfi?: number | null;
  obv_zscore?: number | null;
  obv_normalized?: number | null;
  volume_momentum?: number | null;
  flow_signal?: string;
  flow_alert?: string;
  sma_alert?: string;
  spark?: number[];
  primary_vs_secondary_5d?: number | null;
  top_names?: Record<string, NameCard>;
  error?: string;
}

interface SpreadCard {
  name: string;
  description?: string;
  ratio?: number | null;
  d5_chg?: number | null;
  d20_chg?: number | null;
  percentile?: number | null;
  trend?: string;
  stress?: string;
  rotation?: string;
  signal?: string;
  alert_level?: string;
  btc_signal?: string;
  spark?: number[];
  soxx_rs_5d?: number | null;
  ewy_rs_5d?: number | null;
  soxx_rs_20d?: number | null;
  ewy_rs_20d?: number | null;
  divergence_5d?: number | null;
  error?: string;
}

interface RotationRow {
  key: string;
  name: string;
  group: string;
  tier?: number;
  rs_5d: number;
  rs_20d?: number | null;
  chg_5d?: number | null;
  mfi?: number | null;
  obv_zscore?: number | null;
  flow_signal?: string;
  flow_alert?: string;
  percentile?: number | null;
}

interface RegimeRead {
  regime: string;
  color_level: string;
  risk_on: number;
  risk_off: number;
  signals: Array<{ dir: string; text: string; weight: number }>;
  btc_read: string;
}

interface COTAsset {
  net_position?: number | null;
  wk_chg?: number | null;
  percentile?: number | null;
  report_date?: string;
  alert?: string;
  error?: string;
}

interface SectorFlowsResponse {
  updated_at: string;
  groups: Record<string, Record<string, SectorCard>>;
  sectors: Record<string, SectorCard>;
  leading: {
    hyg_lqd: SpreadCard;
    kre_kbe: SpreadCard;
    xlp_xly: SpreadCard;
    soxx_ewy: SpreadCard;
  };
  rotation_matrix: RotationRow[];
  regime_read: RegimeRead;
  cot: Record<string, COTAsset> & { error?: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000;

const GROUP_ORDER = [
  "technology", "financials", "consumer", "healthcare",
  "industrials", "energy", "materials", "real_estate",
  "utilities", "international", "bonds", "commodities", "crypto",
];

const GROUP_LABELS: Record<string, string> = {
  technology:    "Technology",
  financials:    "Financials",
  consumer:      "Consumer",
  healthcare:    "Healthcare",
  industrials:   "Industrials",
  energy:        "Energy",
  materials:     "Materials",
  real_estate:   "Real Estate",
  utilities:     "Utilities",
  international: "Korea & International",
  bonds:         "Bonds",
  commodities:   "Commodities",
  crypto:        "Crypto",
};

const GROUP_SECTION_NUMS: Record<string, string> = {
  technology:    "III",
  financials:    "IV",
  consumer:      "V",
  healthcare:    "VI",
  industrials:   "VII",
  energy:        "VIII",
  materials:     "IX",
  real_estate:   "X",
  utilities:     "XI",
  international: "XII",
  bonds:         "XIII",
  commodities:   "XIV",
  crypto:        "XV",
};

const GROUP_COLORS: Record<string, string> = {
  technology:    "#4A6FA5",
  financials:    "#D9A84D",
  consumer:      "#9A7A5A",
  healthcare:    "#7AB648",
  industrials:   "#8A8A8A",
  energy:        "#C06060",
  materials:     "#8A7A5A",
  real_estate:   "#6A8A6A",
  utilities:     "#4A8A9A",
  international: "#8A5A9A",
  bonds:         "#5A9A9A",
  commodities:   "#A8A84A",
  crypto:        "#E24B4A",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 2, suffix = ""): string {
  if (val == null || isNaN(val)) return "–";
  return `${val.toFixed(decimals)}${suffix}`;
}

function fmtSigned(val: number | null | undefined, decimals = 2, suffix = ""): string {
  if (val == null || isNaN(val)) return "–";
  return `${val >= 0 ? "+" : ""}${val.toFixed(decimals)}${suffix}`;
}

function alertColor(level: string | undefined): string {
  if (level === "extreme") return "#E24B4A";
  if (level === "notable") return "#D9A84D";
  return "#7AB648";
}

function rsColorClass(val: number | null | undefined): string {
  if (val == null) return "text-slate-500";
  if (val >= 3)  return "text-green-400";
  if (val >= 0)  return "text-green-600";
  if (val >= -3) return "text-red-500";
  return "text-red-400";
}

function chgColorClass(val: number | null | undefined): string {
  if (val == null) return "text-slate-500";
  return val >= 0 ? "text-green-400" : "text-red-400";
}

function mfiColorClass(val: number | null | undefined): string {
  if (val == null) return "text-slate-500";
  if (val > 70)  return "text-red-400";
  if (val > 60)  return "text-amber-400";
  if (val < 30)  return "text-green-400";
  if (val < 40)  return "text-green-600";
  return "text-slate-400";
}

function obvZColorClass(val: number | null | undefined): string {
  if (val == null) return "text-slate-500";
  if (val > 1.5)  return "text-green-400";
  if (val > 0)    return "text-green-600";
  if (val < -1.5) return "text-red-400";
  if (val < 0)    return "text-red-600";
  return "text-slate-400";
}

function flowSignalColor(signal: string | undefined): string {
  if (!signal) return "#6B7280";
  if (signal.includes("Heavy Inflow") || signal.includes("Strong Inflow")) return "#7AB648";
  if (signal.includes("Inflow"))  return "#6A9A6A";
  if (signal.includes("Heavy Outflow") || signal.includes("Strong Outflow")) return "#E24B4A";
  if (signal.includes("Outflow")) return "#C06060";
  return "#9CA3AF";
}

// ─── Base sub-components ──────────────────────────────────────────────────────

function SectionLabel({ num, title, subtitle }: {
  num: string; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 mb-4 pb-3 border-b border-slate-900">
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "#D9A84D", fontSize: 22 }}>
        {num}
      </span>
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: "#E8E6E0", fontSize: 20 }}>
        {title}
      </span>
      {subtitle && <span className="text-[10px] font-mono text-slate-600 ml-1">{subtitle}</span>}
    </div>
  );
}

function PercentileBar({ value }: { value?: number | null }) {
  if (value == null || isNaN(value)) return <div className="h-1 bg-slate-800 rounded-full" />;
  const color = value >= 80 ? "#E24B4A" : value >= 60 ? "#D9A84D" : value <= 20 ? "#7AB648" : "#4A6FA5";
  return (
    <div className="relative h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
      <div className="absolute left-0 top-0 h-full rounded-full transition-all"
        style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

function Sparkline({ data, height = 28, width = 72 }: {
  data?: number[]; height?: number; width?: number;
}) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const color = data[data.length - 1] >= data[0] ? "#7AB648" : "#E24B4A";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function TierBadge({ tier }: { tier: number }) {
  const colors: Record<number, string> = { 1: "#D9A84D", 2: "#4A6FA5", 3: "#6B7280" };
  const c = colors[tier] ?? "#6B7280";
  return (
    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
      style={{ color: c, borderColor: c + "44" }}>
      T{tier}
    </span>
  );
}

function FlowBadge({ signal }: { signal?: string }) {
  if (!signal || signal === "Insufficient data" || signal === "Stable") return null;
  const color = flowSignalColor(signal);
  return (
    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border"
      style={{ color, borderColor: color + "44", background: color + "15" }}>
      {signal}
    </span>
  );
}

// ─── Regime Read Banner ───────────────────────────────────────────────────────

function RegimeReadBanner({ regime }: { regime: RegimeRead }) {
  const color = alertColor(regime.color_level);
  const riskOff = regime.signals.filter(s => s.dir === "risk_off");
  const riskOn  = regime.signals.filter(s => s.dir === "risk_on");

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: color + "44", background: color + "08" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">
            Regime Synthesis — Sector Capital Flows
          </div>
          <div className="font-mono text-2xl" style={{ color }}>{regime.regime}</div>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-[10px] font-mono text-slate-600">Risk-on</div>
            <div className="font-mono text-xl text-green-400">{regime.risk_on}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-600">Risk-off</div>
            <div className="font-mono text-xl text-red-400">{regime.risk_off}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          {riskOff.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-red-400 mt-0.5 shrink-0">↑</span>
              <span className="text-slate-300">{s.text}</span>
            </div>
          ))}
          {riskOn.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-green-400 mt-0.5 shrink-0">↓</span>
              <span className="text-slate-300">{s.text}</span>
            </div>
          ))}
          {riskOff.length === 0 && riskOn.length === 0 && (
            <div className="text-xs text-slate-600 font-mono">No strong directional signals</div>
          )}
        </div>
        <div className="rounded-lg border p-4" style={{ background: "#1A1508", borderColor: "#3A3228" }}>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">BTC Read</div>
          <p className="text-xs text-slate-400 leading-relaxed">{regime.btc_read}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Leading Indicator Cards ──────────────────────────────────────────────────

function SpreadLeadingCard({ spread }: { spread: SpreadCard }) {
  if (spread.error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">{spread.name}</div>
        <div className="text-xs text-slate-600 font-mono">{spread.error}</div>
      </div>
    );
  }

  const level  = spread.alert_level ?? "none";
  const color  = alertColor(level);
  const status = spread.trend ?? spread.stress ?? spread.rotation ?? "—";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{spread.name}</div>
        {level !== "none" && (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border shrink-0 ml-2"
            style={{ color, borderColor: color + "44", background: color + "15" }}>
            {level}
          </span>
        )}
      </div>

      {spread.description && (
        <p className="text-[10px] text-slate-700 mb-3 leading-tight">{spread.description}</p>
      )}

      {spread.ratio != null && (
        <div className="font-mono text-2xl text-slate-100 mb-2">{fmt(spread.ratio, 4)}</div>
      )}

      {spread.spark && spread.spark.length > 1 && (
        <div className="mb-3">
          <Sparkline data={spread.spark} height={22} width={120} />
        </div>
      )}

      <div className="space-y-1.5 text-[10px] border-t border-slate-900 pt-3 mb-3">
        {spread.d5_chg != null && (
          <div className="flex justify-between">
            <span className="text-slate-600">5d chg</span>
            <span className={`font-mono ${chgColorClass(spread.d5_chg)}`}>{fmtSigned(spread.d5_chg, 4)}</span>
          </div>
        )}
        {spread.d20_chg != null && (
          <div className="flex justify-between">
            <span className="text-slate-600">20d chg</span>
            <span className={`font-mono ${chgColorClass(spread.d20_chg)}`}>{fmtSigned(spread.d20_chg, 4)}</span>
          </div>
        )}
        {spread.percentile != null && (
          <div className="flex justify-between">
            <span className="text-slate-600">90d pctile</span>
            <span className="font-mono text-slate-400">{spread.percentile}th</span>
          </div>
        )}
      </div>

      {spread.percentile != null && <PercentileBar value={spread.percentile} />}

      <div className="rounded p-2.5 mt-3" style={{ background: "#0F1018" }}>
        <div className="text-[10px] font-mono" style={{ color }}>{status}</div>
      </div>

      {spread.btc_signal && (
        <p className="text-[10px] text-slate-700 mt-2 leading-tight">{spread.btc_signal}</p>
      )}
    </div>
  );
}

function SoxxEwyCard({ spread }: { spread: SpreadCard }) {
  if (spread.error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">{spread.name}</div>
        <div className="text-xs text-slate-600 font-mono">{spread.error}</div>
      </div>
    );
  }

  const level = spread.alert_level ?? "none";
  const color = alertColor(level);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{spread.name}</div>
        {level !== "none" && (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border shrink-0 ml-2"
            style={{ color, borderColor: color + "44", background: color + "15" }}>
            {level}
          </span>
        )}
      </div>

      {spread.description && (
        <p className="text-[10px] text-slate-700 mb-3 leading-tight">{spread.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3 text-[10px] border-t border-slate-900 pt-3 mb-3">
        <div>
          <div className="text-slate-600 mb-1.5">SOXX vs SPY</div>
          <div className={`font-mono ${rsColorClass(spread.soxx_rs_5d)}`}>
            {fmtSigned(spread.soxx_rs_5d, 1, "% 5d")}
          </div>
          <div className={`font-mono text-[9px] ${rsColorClass(spread.soxx_rs_20d)}`}>
            {fmtSigned(spread.soxx_rs_20d, 1, "% 20d")}
          </div>
        </div>
        <div>
          <div className="text-slate-600 mb-1.5">EWY vs SPY</div>
          <div className={`font-mono ${rsColorClass(spread.ewy_rs_5d)}`}>
            {fmtSigned(spread.ewy_rs_5d, 1, "% 5d")}
          </div>
          <div className={`font-mono text-[9px] ${rsColorClass(spread.ewy_rs_20d)}`}>
            {fmtSigned(spread.ewy_rs_20d, 1, "% 20d")}
          </div>
        </div>
      </div>

      {spread.divergence_5d != null && (
        <div className="flex justify-between text-[10px] mb-3">
          <span className="text-slate-600">EWY − SOXX divergence</span>
          <span className={`font-mono ${chgColorClass(spread.divergence_5d)}`}>
            {fmtSigned(spread.divergence_5d, 1, "% 5d")}
          </span>
        </div>
      )}

      <div className="rounded p-2.5" style={{ background: "#0F1018" }}>
        <div className="text-[10px] font-mono" style={{ color }}>{spread.signal ?? "—"}</div>
      </div>

      {spread.btc_signal && (
        <p className="text-[10px] text-slate-700 mt-2 leading-tight">{spread.btc_signal}</p>
      )}
    </div>
  );
}

// ─── Rotation Matrix Table ────────────────────────────────────────────────────

function RotationMatrixTable({ rows }: { rows: RotationRow[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-x-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="border-b border-slate-800">
            {["#", "Sector", "Group", "RS 5d", "RS 20d", "5d chg", "MFI", "OBV Z", "Flow Signal", "Pctile"].map((h, i) => (
              <th key={h}
                className={`px-3 py-2.5 font-normal text-slate-600 ${i < 3 ? "text-left" : i >= 8 ? "text-center" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const gc = GROUP_COLORS[row.group] ?? "#6B7280";
            return (
              <tr key={row.key} className="border-b border-slate-900 hover:bg-slate-900 transition-colors">
                <td className="px-3 py-2 text-slate-600">{i + 1}</td>
                <td className="px-3 py-2 text-slate-200 whitespace-nowrap">{row.name}</td>
                <td className="px-3 py-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{ color: gc, background: gc + "22" }}>
                    {row.group}
                  </span>
                </td>
                <td className={`px-3 py-2 text-right ${rsColorClass(row.rs_5d)}`}>
                  {fmtSigned(row.rs_5d, 1, "%")}
                </td>
                <td className={`px-3 py-2 text-right ${rsColorClass(row.rs_20d)}`}>
                  {fmtSigned(row.rs_20d, 1, "%")}
                </td>
                <td className={`px-3 py-2 text-right ${chgColorClass(row.chg_5d)}`}>
                  {fmtSigned(row.chg_5d, 1, "%")}
                </td>
                <td className={`px-3 py-2 text-center ${mfiColorClass(row.mfi)}`}>
                  {fmt(row.mfi, 0)}
                </td>
                <td className={`px-3 py-2 text-center ${obvZColorClass(row.obv_zscore)}`}>
                  {fmt(row.obv_zscore, 1)}
                </td>
                <td className="px-3 py-2 text-center" style={{ color: flowSignalColor(row.flow_signal) }}>
                  {row.flow_signal ?? "—"}
                </td>
                <td className="px-3 py-2 text-center text-slate-600">
                  {row.percentile != null ? `${row.percentile}th` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Individual Name Mini-Card ────────────────────────────────────────────────

function NameMiniCard({ name }: { name: NameCard }) {
  if (name.error) {
    return (
      <div className="rounded border border-slate-800 px-2 py-1.5 text-[9px] font-mono text-slate-700">
        {name.ticker} — unavailable
      </div>
    );
  }
  const smaColor = name.above_sma200 === true
    ? "text-green-500"
    : name.above_sma200 === false
    ? "text-red-500"
    : "text-slate-700";

  return (
    <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-300">{name.ticker}</span>
        <span className={`text-[9px] font-mono ${smaColor}`}>
          {name.above_sma200 === true ? "▲200d" : name.above_sma200 === false ? "▼200d" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-mono ${rsColorClass(name.rs_5d)}`}>
          RS {fmtSigned(name.rs_5d, 1, "%")}
        </span>
        <span className={`text-[9px] font-mono ${chgColorClass(name.chg_5d)}`}>
          {fmtSigned(name.chg_5d, 1, "%")}
        </span>
      </div>
      {name.pct_from_sma200 != null && (
        <div className={`text-[9px] font-mono ${chgColorClass(name.pct_from_sma200)}`}>
          vs 200d {fmtSigned(name.pct_from_sma200, 1, "%")}
        </div>
      )}
    </div>
  );
}

// ─── Sector Detail Card ───────────────────────────────────────────────────────

function SectorDetailCard({ sector }: { sector: SectorCard }) {
  if (sector.error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">{sector.name}</div>
        <div className="text-xs text-slate-600 font-mono">{sector.error}</div>
      </div>
    );
  }

  const names    = Object.values(sector.top_names ?? {});
  const volColor = sector.volume_momentum != null
    ? sector.volume_momentum > 1.2 ? "text-green-400"
    : sector.volume_momentum < 0.8 ? "text-red-400"
    : "text-slate-400"
    : "text-slate-500";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest leading-tight">
            {sector.name}
          </div>
          <div className="text-[9px] font-mono text-slate-700 mt-0.5">
            {sector.primary_etf}
            {sector.secondary_etf && <span className="text-slate-800"> · {sector.secondary_etf}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <TierBadge tier={sector.tier} />
          <FlowBadge signal={sector.flow_signal} />
        </div>
      </div>

      {/* Price + Sparkline */}
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-xl text-slate-100 leading-none">
            {sector.current != null
              ? sector.current.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : "–"}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-mono ${chgColorClass(sector.chg_1d)}`}>
              {fmtSigned(sector.chg_1d, 1, "% 1d")}
            </span>
            <span className={`text-[9px] font-mono ${chgColorClass(sector.chg_5d)}`}>
              {fmtSigned(sector.chg_5d, 1, "% 5d")}
            </span>
            <span className={`text-[9px] font-mono ${chgColorClass(sector.chg_20d)}`}>
              {fmtSigned(sector.chg_20d, 1, "% 20d")}
            </span>
          </div>
        </div>
        <Sparkline data={sector.spark} height={28} width={72} />
      </div>

      {/* RS vs SPY + SMA position */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] border-t border-slate-900 pt-3">
        <div className="flex justify-between">
          <span className="text-slate-600">RS vs SPY 5d</span>
          <span className={`font-mono ${rsColorClass(sector.rs_5d)}`}>
            {fmtSigned(sector.rs_5d, 1, "%")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">RS vs SPY 20d</span>
          <span className={`font-mono ${rsColorClass(sector.rs_20d)}`}>
            {fmtSigned(sector.rs_20d, 1, "%")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">vs SMA50</span>
          <span className={`font-mono ${chgColorClass(sector.pct_from_sma50)}`}>
            {fmtSigned(sector.pct_from_sma50, 1, "%")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">vs SMA200</span>
          <span className={`font-mono ${chgColorClass(sector.pct_from_sma200)}`}>
            {fmtSigned(sector.pct_from_sma200, 1, "%")}
          </span>
        </div>
      </div>

      {/* Volume metrics */}
      <div className="grid grid-cols-3 gap-x-2 text-[10px] border-t border-slate-900 pt-2.5 text-center">
        <div>
          <div className="text-slate-600 mb-0.5">MFI</div>
          <div className={`font-mono ${mfiColorClass(sector.mfi)}`}>{fmt(sector.mfi, 0)}</div>
        </div>
        <div>
          <div className="text-slate-600 mb-0.5">OBV Z</div>
          <div className={`font-mono ${obvZColorClass(sector.obv_zscore)}`}>{fmt(sector.obv_zscore, 1)}</div>
        </div>
        <div>
          <div className="text-slate-600 mb-0.5">Vol Mom</div>
          <div className={`font-mono ${volColor}`}>
            {sector.volume_momentum != null ? `${sector.volume_momentum}×` : "–"}
          </div>
        </div>
      </div>

      {/* Percentile bar */}
      {sector.percentile != null && (
        <div>
          <div className="flex justify-between text-[9px] font-mono text-slate-700 mb-0.5">
            <span>90d pctile</span>
            <span>{sector.percentile}th</span>
          </div>
          <PercentileBar value={sector.percentile} />
        </div>
      )}

      {/* BTC signal */}
      {sector.btc_signal && (
        <p className="text-[9px] text-slate-700 leading-tight border-t border-slate-900 pt-2">
          {sector.btc_signal}
        </p>
      )}

      {/* Top names */}
      {names.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 border-t border-slate-900 pt-2">
          {names.slice(0, 3).map(n => (
            <NameMiniCard key={n.key} name={n} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COT Card ─────────────────────────────────────────────────────────────────

function COTCard({ asset, data }: { asset: string; data: COTAsset }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="text-xs font-mono text-slate-600 capitalize mb-1">{asset}</div>
        <div className="text-xs text-slate-600 font-mono">{data.error}</div>
      </div>
    );
  }
  const isExtreme = data.alert?.includes("Extreme");
  const isLong    = (data.net_position ?? 0) >= 0;
  const color     = isExtreme ? "#D9A84D" : isLong ? "#7AB648" : "#E24B4A";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-mono text-slate-600 capitalize">{asset}</div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border"
          style={{ color, borderColor: color + "44", background: color + "15" }}>
          {data.alert}
        </span>
      </div>
      <div className="font-mono text-2xl mb-3" style={{ color }}>
        {data.net_position != null
          ? `${data.net_position >= 0 ? "+" : ""}${data.net_position.toLocaleString()}`
          : "—"}
      </div>
      <div className="space-y-1.5 text-[10px] border-t border-slate-900 pt-2.5">
        <div className="flex justify-between">
          <span className="text-slate-600">Wk change</span>
          <span className={`font-mono ${chgColorClass(data.wk_chg)}`}>
            {data.wk_chg != null
              ? `${data.wk_chg >= 0 ? "+" : ""}${data.wk_chg.toLocaleString()}`
              : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">20w pctile</span>
          <span className="font-mono text-slate-400">
            {data.percentile != null ? `${data.percentile}th` : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Report date</span>
          <span className="font-mono text-slate-700">{data.report_date ?? "—"}</span>
        </div>
      </div>
      {data.percentile != null && <PercentileBar value={data.percentile} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SectorCapitalFlowMatrix() {
  const [data, setData]               = useState<SectorFlowsResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/sector-flows/metrics`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      setData(await res.json());
      setLastUpdated(
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
      );
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const flushCache = useCallback(async () => {
    await fetch(`${API}/sector-flows/cache/flush`);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [fetchData]);

  const cotEntries = data?.cot
    ? (Object.entries(data.cot).filter(([k]) => k !== "error") as [string, COTAsset][])
    : [];

  return (
    <main className="min-h-screen p-6"
      style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        <DashboardNav
          current="sector-flows"
          title="Sector Capital Flow Matrix"
          lastUpdated={lastUpdated}
          onFlush={flushCache}
        />

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — check backend and ensure /sector-flows/metrics is reachable.
          </div>
        )}

        {loading && !data && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Analyzing sector flows…
          </div>
        )}

        {/* ── Regime Read Banner ─────────────────────────────────────── */}
        {data?.regime_read && (
          <RegimeReadBanner regime={data.regime_read} />
        )}

        {/* ── I. Leading Indicators ───────────────────────────────────── */}
        {data?.leading && (
          <section>
            <SectionLabel num="I" title="Leading Indicators"
              subtitle="Credit · Bank stress · Consumer rotation · Semi/Korea divergence" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SpreadLeadingCard spread={data.leading.hyg_lqd} />
              <SpreadLeadingCard spread={data.leading.kre_kbe} />
              <SpreadLeadingCard spread={data.leading.xlp_xly} />
              <SoxxEwyCard       spread={data.leading.soxx_ewy} />
            </div>
          </section>
        )}

        {/* ── II. Rotation Matrix ─────────────────────────────────────── */}
        {data?.rotation_matrix && data.rotation_matrix.length > 0 && (
          <section>
            <SectionLabel num="II" title="Rotation Matrix"
              subtitle="All sectors ranked by 5d RS vs SPY — descending" />
            <RotationMatrixTable rows={data.rotation_matrix} />
          </section>
        )}

        {/* ── III–XV. Sector Groups ───────────────────────────────────── */}
        {data?.groups && GROUP_ORDER.map(group => {
          const groupSectors = data.groups[group];
          if (!groupSectors || Object.keys(groupSectors).length === 0) return null;
          return (
            <section key={group}>
              <SectionLabel
                num={GROUP_SECTION_NUMS[group] ?? ""}
                title={GROUP_LABELS[group] ?? group}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.values(groupSectors).map(sector => (
                  <SectorDetailCard key={sector.key} sector={sector} />
                ))}
              </div>
            </section>
          );
        })}

        {/* ── XVI. COT Positioning ────────────────────────────────────── */}
        {cotEntries.length > 0 && (
          <section>
            <SectionLabel num="XVI" title="CFTC COT Positioning"
              subtitle="Leveraged money net futures — Gold · Bonds · Crude · weekly release" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cotEntries.map(([asset, cotData]) => (
                <COTCard key={asset} asset={asset} data={cotData} />
              ))}
            </div>
            <p className="text-[10px] text-slate-700 mt-3 font-mono leading-relaxed">
              COT data released weekly with 3-day lag. Net position = leveraged longs minus shorts.
              Extreme readings = crowded positioning = elevated reversal risk.
            </p>
          </section>
        )}

        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>Data: yFinance (OHLCV + Close) · CFTC COT · 5min cache</span>
          <span>·</span>
          <span>T1 = critical daily · T2 = confirm/deny regime · T3 = structural context</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>

      </div>
    </main>
  );
}
