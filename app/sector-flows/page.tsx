"use client";

/**
 * app/sector-flows/page.tsx — Sector Capital Flow Matrix
 *
 * Tracks money flow, volume momentum, and relative performance
 * across 8 market sectors using MFI, OBV, and volume momentum.
 *
 * Sections:
 *   I.   Flow Matrix Heatmap
 *   II.  Sector Detail Cards
 *   III. Flow Interpretation Guide
 *
 * Data: GET /sector-flows/metrics (sector_flows_routes.py → yFinance)
 * Cache: 5 min backend
 */

import { useEffect, useState, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectorFlowMetric {
  name: string;
  ticker: string;
  current: number | null;
  change_5d: number | null;
  mfi: number | null;
  obv: number | null;
  volume_momentum: number | null;
  relative_performance: number | null;
  flow_signal: string | null;
}

interface SectorFlowResponse {
  updated_at: string;
  sectors: Record<string, SectorFlowMetric>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000;
const SECTOR_ORDER = ["equities", "tech", "financials", "energy", "realestate", "metals", "crypto", "bonds"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 2): string {
  if (val == null || isNaN(val)) return "–";
  return val.toFixed(decimals);
}

function SectionLabel({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4 pb-3 border-b border-slate-900">
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "#D9A84D", fontSize: 22 }}>
        {num}
      </span>
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: "#E8E6E0", fontSize: 20 }}>
        {title}
      </span>
    </div>
  );
}

// ─── Flow Signal Color ────────────────────────────────────────────────────────

function flowColor(signal: string | null): string {
  if (!signal) return "text-slate-500";
  if (signal.includes("Heavy Inflow") || signal.includes("Strong Inflow")) return "text-green-400";
  if (signal.includes("Inflow")) return "text-green-500";
  if (signal.includes("Heavy Outflow") || signal.includes("Strong Outflow")) return "text-red-400";
  if (signal.includes("Outflow")) return "text-red-500";
  return "text-slate-400";
}

function mfiColor(val: number | null | undefined): string {
  if (val == null) return "text-slate-500";
  if (val > 70) return "text-red-400";
  if (val > 60) return "text-amber-400";
  if (val < 30) return "text-green-400";
  if (val < 40) return "text-green-500";
  return "text-slate-400";
}

function obvColor(val: number | null | undefined): string {
  if (val == null) return "text-slate-500";
  if (val > 30) return "text-red-400";
  if (val < -30) return "text-green-400";
  return "text-slate-400";
}

function volMomColor(val: number | null | undefined): string {
  if (val == null) return "text-slate-500";
  if (val > 1.2) return "text-red-400";
  if (val > 1.0) return "text-amber-400";
  if (val < 0.8) return "text-green-400";
  return "text-slate-400";
}

// ─── Flow Matrix Heatmap ──────────────────────────────────────────────────────

function FlowMatrixHeatmap({ sectors }: { sectors: Record<string, SectorFlowMetric> }) {
  const normalize = (val: number | null | undefined, metric: string): number | null => {
    if (val == null) return null;
    switch (metric) {
      case "mfi":     return (val - 50) * 2;
      case "obv":     return val;
      case "vol_mom": return (val - 1) * 100;
      default:        return val;
    }
  };

  const heatColor = (val: number | null): string => {
    if (val == null) return "#3A3A3C";
    if (val > 60)  return "#E24B4A";
    if (val > 30)  return "#D9A84D";
    if (val > 0)   return "#6B6B6C";
    if (val > -30) return "#6B6B6C";
    if (val > -60) return "#7AB648";
    return "#2D7A3E";
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left px-3 py-2 text-slate-600 font-normal">Sector</th>
            <th className="text-center px-3 py-2 text-slate-600 font-normal">Flow Signal</th>
            <th className="text-center px-3 py-2 text-slate-600 font-normal">MFI</th>
            <th className="text-center px-3 py-2 text-slate-600 font-normal">OBV</th>
            <th className="text-center px-3 py-2 text-slate-600 font-normal">Vol Mom</th>
            <th className="text-right px-3 py-2 text-slate-600 font-normal">5d chg</th>
            <th className="text-right px-3 py-2 text-slate-600 font-normal">vs SPX</th>
          </tr>
        </thead>
        <tbody>
          {SECTOR_ORDER.map((key) => {
            const s = sectors[key];
            if (!s) return null;
            const mfi_n = normalize(s.mfi, "mfi");
            const obv_n = normalize(s.obv, "obv");
            const vm_n  = normalize(s.volume_momentum, "vol_mom");

            return (
              <tr key={key} className="border-b border-slate-900 hover:bg-slate-900 transition-colors">
                <td className="px-3 py-2.5 text-slate-300">{s.name}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`font-mono ${flowColor(s.flow_signal)}`}>
                    {s.flow_signal ?? "–"}
                  </span>
                </td>
                {[
                  { n: mfi_n,  v: s.mfi,             d: 0 },
                  { n: obv_n,  v: s.obv,              d: 0 },
                  { n: vm_n,   v: s.volume_momentum,  d: 2 },
                ].map(({ n, v, d }, i) => (
                  <td key={i} className="px-3 py-2.5 text-center">
                    <span style={{
                      background: heatColor(n),
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: 4,
                      display: "inline-block",
                    }}>
                      {fmt(v, d)}
                    </span>
                  </td>
                ))}
                <td className={`px-3 py-2.5 text-right font-mono ${s.change_5d != null && s.change_5d >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {s.change_5d != null ? `${s.change_5d >= 0 ? "+" : ""}${fmt(s.change_5d, 1)}%` : "–"}
                </td>
                <td className={`px-3 py-2.5 text-right font-mono ${s.relative_performance != null && s.relative_performance >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {s.relative_performance != null ? `${s.relative_performance >= 0 ? "+" : ""}${fmt(s.relative_performance, 1)}%` : "–"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sector Flow Card ─────────────────────────────────────────────────────────

function SectorFlowCard({ sector }: { sector: SectorFlowMetric }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">{sector.name}</div>
          <div className="text-[10px] font-mono text-slate-700 mt-0.5">{sector.ticker}</div>
        </div>
        <span className={`text-xs font-mono border px-2 py-0.5 rounded ${flowColor(sector.flow_signal)}`}
          style={{ borderColor: "currentColor", opacity: 0.7 }}>
          {sector.flow_signal ?? "–"}
        </span>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-xl text-slate-100">
          {sector.current != null ? sector.current.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "–"}
        </span>
        <span className={`font-mono text-xs ${sector.change_5d != null && sector.change_5d >= 0 ? "text-green-400" : "text-red-400"}`}>
          {sector.change_5d != null ? `${sector.change_5d >= 0 ? "+" : ""}${fmt(sector.change_5d, 1)}%` : ""}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-2 text-xs border-t border-slate-900 pt-3">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">MFI (14)</span>
          <span className={`font-mono ${mfiColor(sector.mfi)}`}>{fmt(sector.mfi, 0)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">OBV trend</span>
          <span className={`font-mono ${obvColor(sector.obv)}`}>{fmt(sector.obv, 0)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">Vol momentum</span>
          <span className={`font-mono ${volMomColor(sector.volume_momentum)}`}>
            {sector.volume_momentum != null ? `${fmt(sector.volume_momentum, 2)}x` : "–"}
          </span>
        </div>
        <div className="flex justify-between items-baseline border-t border-slate-900 pt-2">
          <span className="text-slate-600">vs S&amp;P 500 (5d)</span>
          <span className={`font-mono ${sector.relative_performance != null && sector.relative_performance >= 0 ? "text-green-400" : "text-red-400"}`}>
            {sector.relative_performance != null
              ? `${sector.relative_performance >= 0 ? "+" : ""}${fmt(sector.relative_performance, 1)}%`
              : "–"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SectorCapitalFlowMatrix() {
  const [data, setData]               = useState<SectorFlowResponse | null>(null);
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

  return (
    <main className="min-h-screen p-6"
      style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        <DashboardNav
          current="equity"
          title="Sector Capital Flow Matrix"
          lastUpdated={lastUpdated}
          onFlush={flushCache}
        />

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Analyzing sector flows…
          </div>
        )}

        {/* ── I. Flow Matrix Heatmap ──────────────────────────────────── */}
        {data && (
          <section>
            <SectionLabel num="I" title="Sector Flow Matrix" />
            <FlowMatrixHeatmap sectors={data.sectors} />
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              <strong className="text-slate-500">MFI:</strong> Money Flow Index (0–100). &gt;70 = overbought / heavy selling, &lt;30 = oversold / heavy buying.
              <strong className="text-slate-500 ml-4">OBV:</strong> On-Balance Volume trend (−100 to +100). Positive = net accumulation, negative = net distribution.
              <strong className="text-slate-500 ml-4">Vol Mom:</strong> Volume momentum (5d avg ÷ 20d avg). &gt;1.2 = strong inflow, &lt;0.8 = capital drying up.
            </p>
          </section>
        )}

        {/* ── II. Sector Detail Cards ─────────────────────────────────── */}
        {data && (
          <section>
            <SectionLabel num="II" title="Sector Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {SECTOR_ORDER.map((key) => {
                const s = data.sectors[key];
                return s ? <SectorFlowCard key={key} sector={s} /> : null;
              })}
            </div>
          </section>
        )}

        {/* ── III. Interpretation Guide ───────────────────────────────── */}
        <section className="rounded-xl border border-slate-800 bg-slate-950 p-6">
          <SectionLabel num="III" title="Flow Interpretation" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-400">
            <div>
              <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-3">Flow Signals</div>
              <ul className="space-y-1.5 text-xs">
                <li><span className="text-green-400">Heavy Inflow</span> — MFI &gt;70 + Vol Mom &gt;1.2 (capital rushing in)</li>
                <li><span className="text-green-500">Strong Inflow</span> — MFI &gt;60 + Vol Mom &gt;1.0 (sustained buying)</li>
                <li><span className="text-red-500">Weak Outflow</span>  — MFI &lt;40 + Vol Mom &lt;1.0 (gradual selling)</li>
                <li><span className="text-red-400">Heavy Outflow</span> — MFI &lt;30 + Vol Mom &lt;0.8 (capital fleeing)</li>
                <li><span className="text-slate-400">Stable</span>       — Mixed signals or neutral zone</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-3">Rotation Reads</div>
              <ul className="space-y-1.5 text-xs">
                <li>🟢 <span className="text-green-400">Metals inflow + Energy outflow</span> → risk-off, USD rally</li>
                <li>🔴 <span className="text-red-400">Crypto + Tech inflow + Bonds outflow</span> → risk-on</li>
                <li>⚪ <span className="text-slate-400">Equities stable + others rotating</span> → sector rotation, no systemic flow</li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>Data: yFinance (OHLCV) · MFI · OBV · Volume Momentum · 5min cache</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>

      </div>
    </main>
  );
}
