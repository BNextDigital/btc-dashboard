"use client";

import { useEffect, useState, useCallback } from "react";

interface SectorFlowMetric {
  name: string;
  ticker: string;
  current?: number | null;
  change_5d?: number | null;
  mfi?: number | null;
  obv?: number | null;
  volume_momentum?: number | null;
  relative_performance?: number | null;
  flow_signal?: string;
}

interface SectorFlowResponse {
  updated_at: string;
  sectors: Record<string, SectorFlowMetric>;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 2): string {
  if (val == null || isNaN(val)) return "–";
  return val.toFixed(decimals);
}

function flowColor(signal?: string): string {
  if (!signal) return "text-slate-500";
  if (signal.includes("Inflow")) return "text-green-400";
  if (signal.includes("Outflow")) return "text-red-400";
  return "text-slate-400";
}

function mfiColor(val?: number | null): string {
  if (val == null) return "text-slate-500";
  if (val > 70) return "text-red-400";      // overbought, selling
  if (val > 60) return "text-orange-400";   // strong selling
  if (val < 30) return "text-green-400";    // oversold, buying
  if (val < 40) return "text-emerald-400";  // buying
  return "text-slate-400";                  // neutral
}

function obvColor(val?: number | null): string {
  if (val == null) return "text-slate-500";
  if (val > 50) return "text-green-400";    // strong accumulation
  if (val > 0) return "text-emerald-400";   // accumulation
  if (val < -50) return "text-red-400";     // strong distribution
  if (val < 0) return "text-orange-400";    // distribution
  return "text-slate-400";
}

function volMomColor(val?: number | null): string {
  if (val == null) return "text-slate-500";
  if (val > 1.5) return "text-green-400";   // massive inflow
  if (val > 1.0) return "text-emerald-400"; // inflow
  if (val < 0.8) return "text-red-400";     // outflow
  return "text-slate-400";
}

function SectionLabel({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-mono text-xs border px-2 py-0.5 rounded" style={{ color: "#3A3228", background: "#1A1508", borderColor: "#3A3228" }}>
        {num}
      </span>
      <span className="text-xs uppercase tracking-widest text-slate-600 font-medium">{title}</span>
    </div>
  );
}

// ── Sector Flow Matrix Card ────────────────────────────────────────────────

function SectorFlowCard({ sector }: { sector: SectorFlowMetric }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">{sector.name}</div>
          <div className="text-sm font-mono text-slate-500">{sector.ticker}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg text-slate-100">{fmt(sector.current, 2)}</div>
          <div className={`font-mono text-xs ${sector.change_5d && sector.change_5d >= 0 ? "text-green-400" : "text-red-400"}`}>
            {sector.change_5d != null ? `${sector.change_5d >= 0 ? "+" : ""}${fmt(sector.change_5d, 1)}%` : "–"}
          </div>
        </div>
      </div>

      {/* Flow Signal Badge */}
      <div className="pt-2 border-t border-slate-900">
        <div className={`inline-block text-xs font-mono border px-2 py-1 rounded ${flowColor(sector.flow_signal)} border-current opacity-50`}>
          {sector.flow_signal ?? "–"}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="space-y-2 text-xs">
        {/* MFI */}
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">MFI (14)</span>
          <span className={`font-mono ${mfiColor(sector.mfi)}`}>
            {fmt(sector.mfi, 0)}
          </span>
        </div>

        {/* OBV */}
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">OBV trend</span>
          <span className={`font-mono ${obvColor(sector.obv)}`}>
            {fmt(sector.obv, 0)}
          </span>
        </div>

        {/* Volume Momentum */}
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">Vol momentum</span>
          <span className={`font-mono ${volMomColor(sector.volume_momentum)}`}>
            {fmt(sector.volume_momentum, 2)}x
          </span>
        </div>

        {/* Relative Performance */}
        <div className="flex justify-between items-baseline pt-1 border-t border-slate-900">
          <span className="text-slate-600">vs S&P 500 (5d)</span>
          <span className={`font-mono ${sector.relative_performance && sector.relative_performance >= 0 ? "text-green-400" : "text-red-400"}`}>
            {sector.relative_performance != null ? `${sector.relative_performance >= 0 ? "+" : ""}${fmt(sector.relative_performance, 1)}%` : "–"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Flow Matrix Heatmap ────────────────────────────────────────────────────

function FlowMatrixHeatmap({ sectors }: { sectors: Record<string, SectorFlowMetric> }) {
  const order = ["equities", "tech", "financials", "energy", "realestate", "metals", "crypto", "bonds"];
  
  // Normalize metrics to -100 to +100 for heatmap
  const normalize = (val: number | null | undefined, metric: string): number | null => {
    if (val == null) return null;
    
    switch (metric) {
      case "mfi": return (val - 50) * 2;     // 0-100 → -100 to +100
      case "obv": return val;                 // already -100 to +100
      case "vol_mom": return (val - 1) * 100; // 0.5-1.5 → -50 to +50
      default: return val;
    }
  };
  
  const getHeatmapColor = (val: number | null): string => {
    if (val == null) return "#4A4A4C";
    if (val > 60) return "#E24B4A";   // strong red (selling/outflow)
    if (val > 30) return "#D9A84D";   // amber (moderate selling)
    if (val > 0) return "#8B8B8C";    // neutral red
    if (val > -30) return "#8B8B8C";  // neutral green
    if (val > -60) return "#7AB648";  // green (buying/inflow)
    return "#2D7A3E";                 // strong green
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left px-3 py-2 text-slate-600">Sector</th>
            <th className="text-center px-2 py-2 text-slate-600">MFI</th>
            <th className="text-center px-2 py-2 text-slate-600">OBV</th>
            <th className="text-center px-2 py-2 text-slate-600">Vol Mom</th>
          </tr>
        </thead>
        <tbody>
          {order.map((key) => {
            const s = sectors[key];
            if (!s) return null;
            
            const mfi_norm = normalize(s.mfi, "mfi");
            const obv_norm = normalize(s.obv, "obv");
            const vm_norm = normalize(s.volume_momentum, "vol_mom");
            
            return (
              <tr key={key} className="border-b border-slate-900 hover:bg-slate-900 transition-colors">
                <td className="px-3 py-2 text-slate-400">{s.name}</td>
                <td className="px-2 py-2 text-center">
                  <span style={{ background: getHeatmapColor(mfi_norm), color: "#fff", padding: "2px 6px", borderRadius: "3px", display: "inline-block" }}>
                    {fmt(s.mfi, 0)}
                  </span>
                </td>
                <td className="px-2 py-2 text-center">
                  <span style={{ background: getHeatmapColor(obv_norm), color: "#fff", padding: "2px 6px", borderRadius: "3px", display: "inline-block" }}>
                    {fmt(s.obv, 0)}
                  </span>
                </td>
                <td className="px-2 py-2 text-center">
                  <span style={{ background: getHeatmapColor(vm_norm), color: "#fff", padding: "2px 6px", borderRadius: "3px", display: "inline-block" }}>
                    {fmt(s.volume_momentum, 2)}x
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="mt-4 text-xs text-slate-600 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded" style={{ background: "#E24B4A" }} />
          <span>Heavy selling / Outflow</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded" style={{ background: "#D9A84D" }} />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded" style={{ background: "#7AB648" }} />
          <span>Heavy buying / Inflow</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SectorCapitalFlowMatrix() {
  const [data, setData] = useState<SectorFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/sector-flows/metrics`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      setData(await res.json());
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [fetchData]);

  return (
    <main className="min-h-screen p-6" style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-900">
          <div className="flex items-baseline gap-4">
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, fontWeight: 400 }}>
              Sector Capital Flow Matrix
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {lastUpdated ? `Updated ${lastUpdated} UTC` : "Loading…"}
            </div>
          </div>

          <nav className="flex gap-1">
            <a href="/" className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">BTC</a>
            <a href="/macro" className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">Macro</a>
            <span className="text-xs px-3 py-1.5 rounded-md border font-mono" style={{ background: "#1C1C1E", color: "#D9A84D", borderColor: "#3A3228" }}>
              Sector Flows
            </span>
          </nav>
        </header>

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">{error}</div>
        )}
        {loading && !data && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">Analyzing sector flows…</div>
        )}

        {/* I. Flow Matrix Heatmap */}
        {data && (
          <section>
            <SectionLabel num="I" title="Sector Flow Matrix (Heatmap)" />
            <FlowMatrixHeatmap sectors={data.sectors} />
            <p className="text-xs text-slate-600 mt-3">
              <strong>MFI:</strong> Money Flow Index (0–100). &gt;70 = overbought (heavy selling), &lt;30 = oversold (heavy buying). 
              <strong className="ml-4">OBV:</strong> On-Balance Volume trend (-100 to +100). Positive = net accumulation, negative = net distribution.
              <strong className="ml-4">Vol Mom:</strong> Volume momentum (5d avg / 20d avg). &gt;1.2 = strong inflow, &lt;0.8 = capital drying up.
            </p>
          </section>
        )}

        {/* II. Detailed Sector Cards */}
        {data && (
          <section>
            <SectionLabel num="II" title="Sector Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {["equities", "tech", "financials", "energy", "realestate", "metals", "crypto", "bonds"].map((key) => {
                const s = data.sectors[key];
                return s ? <SectorFlowCard key={key} sector={s} /> : null;
              })}
            </div>
          </section>
        )}

        {/* III. Interpretation Guide */}
        <section className="rounded-xl border border-slate-800 bg-slate-950 p-6">
          <SectionLabel num="III" title="Flow Interpretation" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-400">
            <div>
              <div className="text-xs font-mono text-slate-600 uppercase mb-2">Flow Signals</div>
              <ul className="space-y-1 text-xs">
                <li><span className="text-green-400">Heavy Inflow</span> — MFI &gt;70 + Vol Mom &gt;1.2 (capital rushing in)</li>
                <li><span className="text-green-400">Strong Inflow</span> — MFI &gt;60 + Vol Mom &gt;1.0 (sustained buying)</li>
                <li><span className="text-red-400">Heavy Outflow</span> — MFI &lt;30 + Vol Mom &lt;0.8 (capital fleeing)</li>
                <li><span className="text-red-400">Weak Outflow</span> — MFI &lt;40 + Vol Mom &lt;1.0 (gradual selling)</li>
                <li><span className="text-slate-400">Stable</span> — Mixed signals or neutral zone</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-mono text-slate-600 uppercase mb-2">Rotation Thesis</div>
              <ul className="space-y-1 text-xs">
                <li>🟢 <span className="text-green-400">Metals inflow + Energy outflow</span> = Risk-off (USD rally)</li>
                <li>🔴 <span className="text-red-400">Crypto + Tech inflow + Bonds outflow</span> = Risk-on (risk appetite)</li>
                <li>⚪ <span className="text-slate-400">Equities stable + Others rotating</span> = Sector rotation (no systemic flow)</li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4">
          <span>Data: yFinance (OHLCV) · Metrics: MFI, OBV, Volume Momentum · 5min cache</span>
          <span>·</span>
          <span>Capital flows reveal market psychology.</span>
        </footer>
      </div>
    </main>
  );
}
