"use client";

/**
 * app/liquidity/page.tsx — Dollar Liquidity Dashboard
 *
 * The "City Water System" — Stop 1 in the BTC patrol route.
 * Tracks the actual supply of dollars flowing through the system:
 *   Fed Reserves · TGA · RRP · SOFR · EFFR · M2 · Net Liquidity composite
 *
 * Data: GET /liquidity/metrics  (liquidity_routes.py → FRED API)
 * Cache: 1hr backend (FRED is weekly/daily data)
 *
 * Design system matches BTC + Macro pages:
 *   Background: #0B0B0C · Accent: #D9A84D
 *   Fonts: Instrument Serif · IBM Plex Sans · IBM Plex Mono
 *
 * Nav: BTC · Macro · Liquidity (active) · Sector Flows
 */

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiquidityCard {
  name: string;
  city_label: string;
  current: string;
  current_raw?: number;
  d4w?: string;
  d5d?: string;
  d13w?: string;
  d20d?: string;
  d1m?: string;
  d3m?: string;
  yoy?: string;
  qoq?: string;
  percentile?: number;
  alert: string;
  alert_level: "extreme" | "notable" | "none";
  pattern?: string;
  note?: string;
  spark?: number[];
  source?: string;
  error?: string;
  formula?: string;
  components?: { reserves: string; rrp: string; tga: string };
}

interface LiquidityMetrics {
  updated_at: string;
  reserves:       LiquidityCard;
  tga:            LiquidityCard;
  rrp:            LiquidityCard;
  sofr:           LiquidityCard;
  effr:           LiquidityCard;
  m2:             LiquidityCard;
  net_liquidity:  LiquidityCard;
  city_read:      string;
  city_read_level: "bullish" | "bearish" | "neutral";
  tailwinds:      string[];
  headwinds:      string[];
}

interface YieldTenor {
  label: string;
  rate:  number;
  years: number;
}

interface YieldCurveData {
  updated_at:        string;
  source:            string;
  tenors:            YieldTenor[];
  spreads: {
    "2y10y":  number | null;
    "3m10y":  number | null;
    "2y30y":  number | null;
    "5y30y":  number | null;
    "10y30y": number | null;
  };
  shape:             string;
  shape_description: string;
  shape_level:       "extreme" | "notable" | "none";
  spread_2y10y_bp:   number;
  error?:            string;
}


// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min — data is hourly-cached on backend

// ─── Helpers ──────────────────────────────────────────────────────────────────

function alertColor(level: string): string {
  if (level === "extreme") return "#E05252";
  if (level === "notable") return "#D9A84D";
  return "#6A9A6A";
}

function alertBg(level: string): string {
  if (level === "extreme") return "rgba(224,82,82,0.08)";
  if (level === "notable") return "rgba(217,168,77,0.08)";
  return "rgba(106,154,106,0.08)";
}

function cityReadColor(level: string): string {
  if (level === "bullish")  return "#6A9A6A";
  if (level === "bearish")  return "#E05252";
  return "#D9A84D";
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color = "#D9A84D" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const w = 80, h = 28, pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Percentile Bar ───────────────────────────────────────────────────────────

function PercentileBar({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <div className="h-1 bg-slate-800 rounded-full" />;
  const color = value >= 80 ? "#E05252" : value >= 60 ? "#D9A84D" : value <= 20 ? "#6A9A6A" : "#4A6FA5";
  return (
    <div className="relative h-1 bg-slate-800 rounded-full overflow-hidden">
      <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── Alert Badge ──────────────────────────────────────────────────────────────

function Badge({ level, label }: { level: string; label: string }) {
  if (!label || label === "—") return null;
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
      style={{ color: alertColor(level), borderColor: alertColor(level) + "44", background: alertBg(level) }}>
      {label}
    </span>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-4 pb-3 border-b border-slate-900">
      <div className="flex items-baseline gap-3">
        <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "#D9A84D", fontSize: 22 }}>
          {num}
        </span>
        <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: "#E8E6E0", fontSize: 20 }}>
          {title}
        </span>
      </div>
      {subtitle && (
        <span className="text-[10px] tracking-widest uppercase font-mono text-slate-600">{subtitle}</span>
      )}
    </div>
  );
}

// ─── Balance Sheet Card (Reserves, TGA, RRP, M2) ─────────────────────────────

function BalanceCard({ card, deltas }: {
  card: LiquidityCard;
  deltas: { label: string; value: string | undefined }[];
}) {
  if (card.error && !card.current_raw) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">{card.name}</div>
        <div className="text-[10px] font-mono text-slate-700 mb-3">{card.city_label}</div>
        <div className="text-sm text-red-400 font-mono">{card.error}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      {/* Header */}
      <div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{card.name}</div>
        <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{card.city_label}</div>
      </div>

      {/* Current value + sparkline */}
      <div className="flex items-end justify-between">
        <div className="font-mono text-2xl text-slate-100">{card.current}</div>
        {card.spark && card.spark.length > 1 && (
          <Sparkline data={card.spark} />
        )}
      </div>

      {/* Percentile */}
      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
          <span>90d percentile</span>
          <span>{card.percentile !== undefined ? `${card.percentile}th` : "—"}</span>
        </div>
        <PercentileBar value={card.percentile} />
      </div>

      {/* Deltas */}
      <div className="border-t border-slate-900 pt-3 space-y-1.5">
        {deltas.map(d => d.value && (
          <div key={d.label} className="flex justify-between text-xs">
            <span className="text-slate-600 font-mono">{d.label}</span>
            <span className="font-mono text-slate-400">{d.value}</span>
          </div>
        ))}
      </div>

      {/* Alert + pattern */}
      <div className="space-y-1.5">
        <Badge level={card.alert_level} label={card.alert} />
        {card.pattern && (
          <p className="text-[11px] text-slate-600">{card.pattern}</p>
        )}
      </div>

      {/* Note */}
      {card.note && (
        <p className="text-[10px] text-slate-700 border-t border-slate-900 pt-2">{card.note}</p>
      )}
    </div>
  );
}

// ─── Rate Card (SOFR, EFFR) ───────────────────────────────────────────────────

function RateCard({ card, deltas }: {
  card: LiquidityCard;
  deltas: { label: string; value: string | undefined }[];
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{card.name}</div>
        <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{card.city_label}</div>
      </div>

      <div className="flex items-end justify-between">
        <div className="font-mono text-2xl text-slate-100">{card.current}</div>
        {card.spark && card.spark.length > 1 && (
          <Sparkline data={card.spark} color="#4A6FA5" />
        )}
      </div>

      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
          <span>90d percentile</span>
          <span>{card.percentile !== undefined ? `${card.percentile}th` : "—"}</span>
        </div>
        <PercentileBar value={card.percentile} />
      </div>

      <div className="border-t border-slate-900 pt-3 space-y-1.5">
        {deltas.map(d => d.value && (
          <div key={d.label} className="flex justify-between text-xs">
            <span className="text-slate-600 font-mono">{d.label}</span>
            <span className="font-mono text-slate-400">{d.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Badge level={card.alert_level} label={card.alert} />
        {card.pattern && <p className="text-[11px] text-slate-600">{card.pattern}</p>}
      </div>

      {card.note && (
        <p className="text-[10px] text-slate-700 border-t border-slate-900 pt-2">{card.note}</p>
      )}
    </div>
  );
}

// ─── Net Liquidity Composite Card ─────────────────────────────────────────────

function NetLiquidityCard({ card }: { card: LiquidityCard }) {
  const level = card.alert_level ?? "none";
  return (
    <div className="rounded-xl border p-6 flex flex-col gap-4"
      style={{ borderColor: alertColor(level) + "55", background: alertBg(level) }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{card.name}</div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{card.city_label}</div>
        </div>
        <Badge level={level} label={card.alert} />
      </div>

      {/* Big number */}
      <div>
        <div className="font-mono text-4xl mb-1" style={{ color: alertColor(level) }}>
          {card.current}
        </div>
        {card.formula && (
          <div className="text-[10px] font-mono text-slate-600">{card.formula}</div>
        )}
      </div>

      {/* Component breakdown */}
      {card.components && (
        <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-4">
          {[
            { label: "Reserves", value: card.components.reserves, icon: "▲", color: "#6A9A6A" },
            { label: "RRP", value: card.components.rrp, icon: "▲", color: "#6A9A6A" },
            { label: "TGA", value: card.components.tga, icon: "▼", color: "#E05252" },
          ].map(c => (
            <div key={c.label} className="text-center">
              <div className="text-[10px] font-mono text-slate-600 mb-1">{c.label}</div>
              <div className="font-mono text-sm" style={{ color: c.color }}>
                {c.icon} {c.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pattern */}
      {card.pattern && (
        <p className="text-xs text-slate-500 border-t border-slate-800 pt-3">{card.pattern}</p>
      )}

      {/* Note */}
      {card.note && (
        <p className="text-[10px] text-slate-600">{card.note}</p>
      )}
    </div>
  );
}

// ─── City Read Panel ──────────────────────────────────────────────────────────

function CityReadPanel({ data }: { data: LiquidityMetrics }) {
  const lvl = data.city_read_level;
  const color = cityReadColor(lvl);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4">
      {/* City assessment */}
      <div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
          City Water Assessment
        </div>
        <div className="text-sm font-mono" style={{ color }}>
          {data.city_read}
        </div>
      </div>

      {/* Tailwinds / Headwinds */}
      {(data.tailwinds.length > 0 || data.headwinds.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-4">
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
              Tailwinds
            </div>
            {data.tailwinds.length > 0
              ? data.tailwinds.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="text-[10px] mt-0.5" style={{ color: "#6A9A6A" }}>▲</span>
                    <span className="text-xs text-slate-400">{t}</span>
                  </div>
                ))
              : <div className="text-xs text-slate-700">No active tailwinds</div>
            }
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
              Headwinds
            </div>
            {data.headwinds.length > 0
              ? data.headwinds.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="text-[10px] mt-0.5" style={{ color: "#E05252" }}>▼</span>
                    <span className="text-xs text-slate-400">{h}</span>
                  </div>
                ))
              : <div className="text-xs text-slate-700">No active headwinds</div>
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── City Map Legend ──────────────────────────────────────────────────────────

function CityMapLegend() {
  const items = [
    { label: "Fed Reserves",   metaphor: "Main Reservoir",          btc: "Is the water tank full?" },
    { label: "TGA",            metaphor: "Treasury's Big Bucket",   btc: "Is Treasury hoarding or spending?" },
    { label: "RRP",            metaphor: "Reserve Water Tank",      btc: "How thick is the liquidity buffer?" },
    { label: "SOFR",           metaphor: "Water Pressure Gauge",    btc: "Is repo market stressed?" },
    { label: "EFFR",           metaphor: "Core Short-End Cost",     btc: "What is capital's floor cost?" },
    { label: "M2",             metaphor: "Total City Water Supply", btc: "How much dollar liquidity exists in total?" },
    { label: "Net Liquidity",  metaphor: "Water Actually Flowing",  btc: "The single number that leads BTC." },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-900">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
          City Map — What Each Indicator Means
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-900">
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase tracking-wide font-normal">Indicator</th>
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase tracking-wide font-normal">City Metaphor</th>
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase tracking-wide font-normal">The BTC Question</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.label}
              className={`border-b border-slate-900 hover:bg-slate-900 transition-colors ${i === items.length - 1 ? "border-b-0" : ""}`}>
              <td className="px-5 py-3 font-mono text-slate-300">{item.label}</td>
              <td className="px-5 py-3 font-mono" style={{ color: "#D9A84D88" }}>{item.metaphor}</td>
              <td className="px-5 py-3 text-slate-500">{item.btc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────


// ─── Yield Curve Section ──────────────────────────────────────────────────────

function YieldCurveSection({ yc }: { yc: YieldCurveData }) {
  if (yc.error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Yield Curve</div>
        <div className="text-sm text-red-400 font-mono">{yc.error}</div>
      </div>
    );
  }

  const shapeColor =
    yc.shape_level === "extreme" ? "#E05252" :
    yc.shape_level === "notable" ? "#D9A84D" : "#6A9A6A";

  const spreadColor = (bp: number | null) => {
    if (bp === null) return "#55534B";
    if (bp <= -50)  return "#E05252";
    if (bp < 0)     return "#E07A52";
    if (bp < 25)    return "#D9A84D";
    return "#6A9A6A";
  };

  // Build SVG curve — plot rate vs tenor years
  const plotPoints = yc.tenors.filter(t => t.years != null && t.rate != null);
  let curveSvg: string | null = null;
  if (plotPoints.length >= 3) {
    const W = 480, H = 120, PX = 32, PY = 16;
    const minYears = Math.min(...plotPoints.map(t => t.years));
    const maxYears = Math.max(...plotPoints.map(t => t.years));
    const minRate  = Math.min(...plotPoints.map(t => t.rate));
    const maxRate  = Math.max(...plotPoints.map(t => t.rate));
    const rateRange = maxRate - minRate || 0.5;
    const toX = (y: number) => PX + ((y - minYears) / (maxYears - minYears)) * (W - PX * 2);
    const toY = (r: number) => PY + (1 - (r - minRate) / rateRange) * (H - PY * 2);
    const pts = plotPoints.map(t => `${toX(t.years).toFixed(1)},${toY(t.rate).toFixed(1)}`).join(" ");
    // Area fill path
    const first = plotPoints[0];
    const last  = plotPoints[plotPoints.length - 1];
    const area  = `M${toX(first.years).toFixed(1)},${H - PY} ` +
                  plotPoints.map(t => `L${toX(t.years).toFixed(1)},${toY(t.rate).toFixed(1)}`).join(" ") +
                  ` L${toX(last.years).toFixed(1)},${H - PY} Z`;
    curveSvg = `
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px">
        <defs>
          <linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${shapeColor}" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="${shapeColor}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${area}" fill="url(#curve-fill)"/>
        <polyline points="${pts}" fill="none" stroke="${shapeColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${plotPoints.map(t => `<circle cx="${toX(t.years).toFixed(1)}" cy="${toY(t.rate).toFixed(1)}" r="3" fill="${shapeColor}" opacity="0.8"/>`).join("")}
      </svg>`;
  }

  const keyTenors = ["3M", "2Y", "5Y", "10Y", "30Y"];
  const tenorMap = Object.fromEntries(yc.tenors.map(t => [t.label, t]));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">

      {/* ── Header row ── */}
      <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {/* Shape pill */}
          <span className="text-sm font-mono font-medium" style={{ color: shapeColor }}>
            {yc.shape}
          </span>
          <span className="text-[11px] text-slate-500">{yc.shape_description}</span>
        </div>
        <div className="text-[10px] font-mono text-slate-700">{yc.source}</div>
      </div>

      {/* ── SVG curve + key tenor snapshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3">

        {/* Curve chart — 2/3 width */}
        <div className="lg:col-span-2 px-5 pt-4 pb-2 border-b lg:border-b-0 lg:border-r border-slate-900">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
            Curve Shape · Rate (%) vs Maturity
          </div>
          {curveSvg ? (
            <div dangerouslySetInnerHTML={{ __html: curveSvg }} />
          ) : (
            <div className="h-20 flex items-center justify-center text-xs text-slate-700 font-mono">
              Insufficient tenor data
            </div>
          )}
          {/* X-axis labels */}
          <div className="flex justify-between text-[9px] font-mono text-slate-700 mt-1 px-6">
            {yc.tenors.filter((_, i) => i % 2 === 0).map(t => (
              <span key={t.label}>{t.label}</span>
            ))}
          </div>
        </div>

        {/* Key tenors — 1/3 width */}
        <div className="px-5 py-4">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
            Key Tenors
          </div>
          <div className="space-y-2">
            {keyTenors.map(label => {
              const t = tenorMap[label];
              if (!t) return null;
              return (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500 w-10">{label}</span>
                  <div className="flex-1 mx-3 h-0.5 rounded-full bg-slate-800 relative">
                    {/* Simple rate bar — 0–8% range */}
                    <div className="absolute left-0 top-0 h-full rounded-full"
                      style={{ width: `${Math.min(t.rate / 8 * 100, 100)}%`, backgroundColor: shapeColor + "88" }} />
                  </div>
                  <span className="text-[12px] font-mono text-slate-200 w-12 text-right">
                    {t.rate.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Spreads row ── */}
      <div className="border-t border-slate-900 px-5 py-4">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
          Key Spreads
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "2Y–10Y", key: "2y10y",  note: "Primary recession signal" },
            { label: "3M–10Y", key: "3m10y",  note: "Fed's preferred signal" },
            { label: "2Y–30Y", key: "2y30y",  note: "Long-term steepness" },
            { label: "5Y–30Y", key: "5y30y",  note: "Back-end slope" },
            { label: "10Y–30Y", key: "10y30y", note: "Long-end curve" },
          ].map(({ label, key, note }) => {
            const bp = yc.spreads[key as keyof typeof yc.spreads];
            return (
              <div key={key} className="text-center">
                <div className="text-[9px] font-mono text-slate-600 mb-1">{label}</div>
                <div className="text-base font-mono" style={{ color: spreadColor(bp) }}>
                  {bp !== null ? `${bp >= 0 ? "+" : ""}${bp}bp` : "—"}
                </div>
                <div className="text-[9px] text-slate-700 mt-0.5">{note}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Full tenor table ── */}
      <div className="border-t border-slate-900 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-900">
              {yc.tenors.map(t => (
                <th key={t.label} className="px-3 py-2 text-[10px] font-mono text-slate-600 font-normal text-center">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {yc.tenors.map(t => (
                <td key={t.label} className="px-3 py-2.5 font-mono text-center text-slate-200 text-[12px]">
                  {t.rate.toFixed(2)}%
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LiquidityDashboard() {
  const [data, setData]               = useState<LiquidityMetrics | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [yieldCurve, setYieldCurve]   = useState<YieldCurveData | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [metricsRes, yieldRes] = await Promise.all([
        fetch(`${API}/liquidity/metrics`),
        fetch(`${API}/liquidity/yield-curve`),
      ]);
      if (!metricsRes.ok) throw new Error(`Backend returned ${metricsRes.status}`);
      const json: LiquidityMetrics = await metricsRes.json();
      setData(json);
      if (yieldRes.ok) {
        const yj: YieldCurveData = await yieldRes.json();
        setYieldCurve(yj);
      }
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

  const flushCache = async () => {
    await Promise.all([
      fetch(`${API}/liquidity/cache/flush`),
      fetch(`${API}/liquidity/yield-curve/cache/flush`),
    ]);
    fetchAll();
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [fetchAll]);

  return (
    <main className="min-h-screen p-6"
      style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-900">
          <div className="flex items-baseline gap-4">
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, fontWeight: 400 }}>
              Dollar Liquidity
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {lastUpdated ? `Updated ${lastUpdated} UTC` : "Loading…"}
            </div>
          </div>

          <nav className="flex gap-1 flex-wrap justify-end">
            <a href="/"
              className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
              BTC
            </a>
            <a href="/macro"
              className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
              Macro
            </a>
            <span className="text-xs px-3 py-1.5 rounded-md border font-mono"
              style={{ background: "#1C1C1E", color: "#D9A84D", borderColor: "#3A3228" }}>
              Liquidity
            </span>
            <a href="/sector-flows"
              className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
              Sector Flows
            </a>
            <button onClick={flushCache}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-600 hover:text-slate-300 hover:border-slate-600 transition-colors font-mono">
              ↺ flush
            </button>
          </nav>
        </header>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — check backend logs and ensure /liquidity/metrics is reachable.
            {!process.env.NEXT_PUBLIC_API_URL && (
              <span className="block mt-1 text-red-600">
                Tip: confirm FRED_API_KEY is set on the backend.
              </span>
            )}
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {loading && !data && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Fetching liquidity data from FRED…
          </div>
        )}

        {data && (
          <>
            {/* ── I. Net Liquidity Composite ────────────────────────────── */}
            <section>
              <SectionLabel
                num="I"
                title="Net Liquidity Composite"
                subtitle="Reserves + RRP − TGA · water actually flowing"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <NetLiquidityCard card={data.net_liquidity} />
                <CityReadPanel data={data} />
              </div>
            </section>

            {/* ── II. Balance Sheet Components ──────────────────────────── */}
            <section>
              <SectionLabel
                num="II"
                title="Fed Balance Sheet"
                subtitle="Reserves · TGA · RRP · weekly FRED data"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BalanceCard
                  card={data.reserves}
                  deltas={[
                    { label: "4w change",  value: data.reserves.d4w },
                    { label: "13w change", value: data.reserves.d13w },
                  ]}
                />
                <BalanceCard
                  card={data.tga}
                  deltas={[
                    { label: "4w change",  value: data.tga.d4w },
                    { label: "13w change", value: data.tga.d13w },
                  ]}
                />
                <BalanceCard
                  card={data.rrp}
                  deltas={[
                    { label: "5d change",  value: data.rrp.d5d },
                    { label: "20d change", value: data.rrp.d20d },
                  ]}
                />
              </div>
            </section>

            {/* ── III. Rate Indicators ──────────────────────────────────── */}
            <section>
              <SectionLabel
                num="III"
                title="Rate Indicators"
                subtitle="SOFR · EFFR · water pressure and core cost"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RateCard
                  card={data.sofr}
                  deltas={[
                    { label: "5d change",  value: data.sofr.d5d },
                    { label: "20d change", value: data.sofr.d20d },
                  ]}
                />
                <RateCard
                  card={data.effr}
                  deltas={[
                    { label: "1m change",  value: data.effr.d1m },
                    { label: "3m change",  value: data.effr.d3m },
                  ]}
                />
              </div>
            </section>

            {/* ── IV. M2 Money Supply ───────────────────────────────────── */}
            <section>
              <SectionLabel
                num="IV"
                title="M2 Money Supply"
                subtitle="Total city water supply · weekly FRED · M2SL"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BalanceCard
                  card={data.m2}
                  deltas={[
                    { label: "YoY",  value: data.m2.yoy },
                    { label: "QoQ",  value: data.m2.qoq },
                  ]}
                />
                {/* M2 context panel */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
                      Why M2 matters for BTC
                    </div>
                    <p className="text-[13px] leading-relaxed mb-4" style={{ color: "#B8B5AA" }}>
                      <span style={{ color: "#E8E4D9", fontWeight: 500 }}>M2</span> is the broadest measure of dollar liquidity — cash, checking, savings, and money market funds. When M2 grows, the city's total water supply is expanding. Historically, BTC has rallied 3–6 months after M2 inflects upward, as that new money eventually seeks yield in risk assets.
                    </p>
                    <p className="text-[12px] leading-relaxed" style={{ color: "#8A8780" }}>
                      M2 contractions (rare — 2022–2023 was the first since the 1940s) coincided with BTC's deepest drawdowns. A sustained return to positive YoY M2 growth is a key structural tailwind.
                    </p>
                  </div>
                  <div className="border-t border-slate-900 pt-3 mt-3">
                    <div className="text-[10px] font-mono text-slate-700">Source: FRED M2SL · weekly · seasonally adjusted</div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── V. City Map ───────────────────────────────────────────── */}
            <section>
              <SectionLabel
                num="V"
                title="City Map"
                subtitle="What each indicator means"
              />
              <CityMapLegend />
            </section>

            {/* ── VI. Yield Curve ───────────────────────────────────────── */}
            {yieldCurve && !yieldCurve.error && (
              <section>
                <SectionLabel
                  num="VI"
                  title="US Treasury Yield Curve"
                  subtitle="CMT rates · US Treasury direct · city gravity"
                />
                <YieldCurveSection yc={yieldCurve} />
              </section>
            )}
            {yieldCurve?.error && (
              <section>
                <SectionLabel num="VI" title="US Treasury Yield Curve" />
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-4 text-sm text-red-400 font-mono">
                  {yieldCurve.error}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>Data: FRED API · WRESBAL · WTREGEN · RRPONTSYD · SOFR · FEDFUNDS · M2SL · US Treasury CMT (yield curve)</span>
          <span>·</span>
          <span>Backend cache: 1hr</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>
      </div>
    </main>
  );
}
