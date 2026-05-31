"use client";

import { useEffect, useState, useCallback } from "react";

const FONT_LINK = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
  .font-display { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
  .font-display-italic { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; }
  .font-sans-body { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
  .font-mono-data { font-family: 'IBM Plex Mono', 'Courier New', monospace; font-feature-settings: 'tnum'; }
  .hairline { border-color: #22231F; }
  .hairline-b { border-bottom: 1px solid #22231F; }
  .hairline-t { border-top: 1px solid #22231F; }
  .caps-sm { letter-spacing: 0.22em; text-transform: uppercase; font-size: 9px; font-weight: 500; }
  .bg-ink { background-color: #0B0B0C; }
  .bg-surface { background-color: #131315; }
  .bg-surface-2 { background-color: #17171A; }
  .bg-surface-inset { background-color: #0E0E10; }
  .text-paper { color: #E8E4D9; }
  .text-paper-2 { color: #B8B5AA; }
  .text-muted { color: #8A8780; }
  .text-faint { color: #55534B; }
  .text-amber-sand { color: #D9A84D; }
  .text-alert-extreme { color: #C4614A; }
  .text-alert-notable { color: #C89A3F; }
  .text-neutral-sage { color: #8DA078; }
  .bg-amber-sand-10 { background-color: rgba(217,168,77,0.10); }
  .bg-extreme-10 { background-color: rgba(196,97,74,0.10); }
  .bg-notable-10 { background-color: rgba(200,154,63,0.10); }
  .bg-sage-10 { background-color: rgba(141,160,120,0.10); }
  .border-extreme { border-color: rgba(196,97,74,0.35); }
  .border-notable { border-color: rgba(200,154,63,0.35); }
  .border-sage { border-color: rgba(141,160,120,0.35); }
  .border-amber-sand { border-color: rgba(217,168,77,0.35); }
  .pulse-dot { animation: pulse-soft 2.4s ease-in-out infinite; }
  @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
`;

interface SectorFlowMetric {
  name: string; ticker: string;
  current?: number | null; change_5d?: number | null;
  mfi?: number | null; obv?: number | null;
  volume_momentum?: number | null; relative_performance?: number | null;
  flow_signal?: string;
}
interface SectorFlowResponse {
  updated_at: string;
  sectors: Record<string, SectorFlowMetric>;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000;
const SECTOR_ORDER = ["equities", "tech", "financials", "energy", "realestate", "metals", "crypto", "bonds"];

function fmt(val: number | null | undefined, decimals = 2): string {
  if (val == null || isNaN(val)) return "–";
  return val.toFixed(decimals);
}
function fmtSigned(val: number | null | undefined, decimals = 1, suffix = ""): string {
  if (val == null || isNaN(val)) return "–";
  return `${val >= 0 ? "+" : ""}${val.toFixed(decimals)}${suffix}`;
}

function SectionLabel({ numeral, title, subtitle }: { numeral: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-5 hairline-b pb-3">
      <div className="flex items-baseline gap-4">
        <span className="font-display-italic text-amber-sand text-[28px] leading-none">{numeral}</span>
        <h2 className="font-display text-paper text-[26px] leading-none">{title}</h2>
      </div>
      {subtitle && <span className="caps-sm text-faint">{subtitle}</span>}
    </div>
  );
}

function flowSignalStyle(signal?: string): string {
  if (!signal) return "bg-surface-2 hairline text-muted";
  const s = signal.toLowerCase();
  if (s.includes("heavy inflow") || s.includes("strong inflow")) return "bg-sage-10 border-sage text-neutral-sage";
  if (s.includes("heavy outflow") || s.includes("weak outflow")) return "bg-extreme-10 border-extreme text-alert-extreme";
  return "bg-surface-2 hairline text-muted";
}

function mfiColor(val?: number | null): string {
  if (val == null) return "text-muted";
  if (val > 70) return "text-alert-extreme";
  if (val > 60) return "text-alert-notable";
  if (val < 30) return "text-neutral-sage";
  if (val < 40) return "text-neutral-sage";
  return "text-paper-2";
}
function obvColor(val?: number | null): string {
  if (val == null) return "text-muted";
  if (val > 30) return "text-neutral-sage";
  if (val < -30) return "text-alert-extreme";
  return "text-paper-2";
}
function volMomColor(val?: number | null): string {
  if (val == null) return "text-muted";
  if (val > 1.2) return "text-neutral-sage";
  if (val < 0.8) return "text-alert-extreme";
  return "text-paper-2";
}

// Heatmap cell color using BTC palette
function heatColor(val: number | null): string {
  if (val == null) return "#22231F";
  if (val > 60) return "#6B1F1A";   // extreme red
  if (val > 30) return "#5A3A10";   // notable amber
  if (val > 0) return "#1C1C1E";    // neutral dark
  if (val > -30) return "#152415";  // subtle green
  if (val > -60) return "#1A3322";  // green
  return "#0F2B1C";                 // strong green
}
function heatTextColor(val: number | null): string {
  if (val == null) return "#55534B";
  if (val > 60) return "#C4614A";
  if (val > 30) return "#C89A3F";
  if (val > -30) return "#8A8780";
  return "#8DA078";
}

function SectorCard({ sector }: { sector: SectorFlowMetric }) {
  return (
    <div className="bg-surface border hairline p-5">
      <div className="flex items-start justify-between hairline-b pb-3 mb-3">
        <div>
          <div className="caps-sm text-faint">{sector.name}</div>
          <div className="font-mono-data text-muted text-[11px] mt-0.5">{sector.ticker}</div>
        </div>
        <div className="text-right">
          <div className="font-mono-data text-paper text-[15px]">{fmt(sector.current, 2)}</div>
          <div className={`font-mono-data text-[11px] ${sector.change_5d != null && sector.change_5d >= 0 ? "text-neutral-sage" : "text-alert-extreme"}`}>
            {fmtSigned(sector.change_5d, 1, "%")}
          </div>
        </div>
      </div>

      <div className={`inline-block caps-sm border px-2 py-[3px] mb-3 ${flowSignalStyle(sector.flow_signal)}`}>
        {sector.flow_signal ?? "–"}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="caps-sm text-faint">MFI (14)</span>
          <span className={`font-mono-data text-[12px] ${mfiColor(sector.mfi)}`}>{fmt(sector.mfi, 0)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="caps-sm text-faint">OBV trend</span>
          <span className={`font-mono-data text-[12px] ${obvColor(sector.obv)}`}>{fmt(sector.obv, 0)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="caps-sm text-faint">Vol momentum</span>
          <span className={`font-mono-data text-[12px] ${volMomColor(sector.volume_momentum)}`}>{fmt(sector.volume_momentum, 2)}x</span>
        </div>
        <div className="flex justify-between items-baseline hairline-t pt-2">
          <span className="caps-sm text-faint">vs S&P 500 (5d)</span>
          <span className={`font-mono-data text-[12px] ${sector.relative_performance != null && sector.relative_performance >= 0 ? "text-neutral-sage" : "text-alert-extreme"}`}>
            {fmtSigned(sector.relative_performance, 1, "%")}
          </span>
        </div>
      </div>
    </div>
  );
}

function FlowHeatmap({ sectors }: { sectors: Record<string, SectorFlowMetric> }) {
  const norm = (val: number | null | undefined, metric: string): number | null => {
    if (val == null) return null;
    if (metric === "mfi") return (val - 50) * 2;
    if (metric === "obv") return val;
    if (metric === "vm") return (val - 1) * 100;
    return val;
  };

  return (
    <div className="bg-surface border hairline overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="hairline-b bg-surface-inset">
            <th className="text-left px-5 py-3 caps-sm text-faint font-normal">Sector</th>
            <th className="text-center px-4 py-3 caps-sm text-faint font-normal">MFI</th>
            <th className="text-center px-4 py-3 caps-sm text-faint font-normal">OBV</th>
            <th className="text-center px-4 py-3 caps-sm text-faint font-normal">Vol Momentum</th>
            <th className="text-right px-5 py-3 caps-sm text-faint font-normal">Flow Signal</th>
          </tr>
        </thead>
        <tbody>
          {SECTOR_ORDER.map((key) => {
            const s = sectors[key];
            if (!s) return null;
            const mfi_n = norm(s.mfi, "mfi");
            const obv_n = norm(s.obv, "obv");
            const vm_n = norm(s.volume_momentum, "vm");
            return (
              <tr key={key} className="hairline-b hover:bg-surface-2 transition-colors last:border-0">
                <td className="px-5 py-3">
                  <div className="font-sans-body text-paper-2 text-[13px]">{s.name}</div>
                  <div className="font-mono-data text-faint text-[10px]">{s.ticker}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono-data text-[12px] px-2 py-0.5 rounded-sm"
                    style={{ background: heatColor(mfi_n), color: heatTextColor(mfi_n) }}>
                    {fmt(s.mfi, 0)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono-data text-[12px] px-2 py-0.5 rounded-sm"
                    style={{ background: heatColor(obv_n), color: heatTextColor(obv_n) }}>
                    {fmt(s.obv, 0)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono-data text-[12px] px-2 py-0.5 rounded-sm"
                    style={{ background: heatColor(vm_n), color: heatTextColor(vm_n) }}>
                    {fmt(s.volume_momentum, 2)}x
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`inline-block caps-sm border px-2 py-[3px] ${flowSignalStyle(s.flow_signal)}`}>
                    {s.flow_signal ?? "–"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-5 py-3 hairline-t bg-surface-inset flex items-center gap-6 caps-sm text-faint">
        <span><span style={{ color: "#C4614A" }}>■</span> Heavy selling / Outflow</span>
        <span><span style={{ color: "#C89A3F" }}>■</span> Moderate</span>
        <span><span style={{ color: "#8DA078" }}>■</span> Heavy buying / Inflow</span>
      </div>
    </div>
  );
}

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
    <main className="bg-ink min-h-screen" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <style>{FONT_LINK}</style>

      {/* Header */}
      <header className="hairline-b">
        <div className="max-w-[1440px] mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-baseline gap-6">
            <h1 className="font-display text-paper text-[30px] leading-none tracking-tight">
              Sector<span className="font-display-italic text-amber-sand"> · </span><span className="font-display-italic">Capital Flow Matrix</span>
            </h1>
            <span className="caps-sm text-faint hidden md:inline">AI organizes · humans decide</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="caps-sm text-muted border hairline px-3 py-1.5 hover:text-paper transition-colors">BTC</a>
            <a href="/macro" className="caps-sm text-muted border hairline px-3 py-1.5 hover:text-paper transition-colors">Macro</a>
            <span className="caps-sm text-amber-sand border border-amber-sand bg-amber-sand-10 px-3 py-1.5">Sector Flows</span>
            <div className="flex items-center gap-1.5 pl-4 border-l hairline">
              <div className="w-[7px] h-[7px] rounded-full bg-[#8DA078] pulse-dot" />
              <span className="caps-sm text-neutral-sage">{lastUpdated ?? "Loading"}</span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-[1440px] mx-auto px-8 py-3">
          <div className="bg-extreme-10 border-extreme border px-4 py-2 caps-sm text-alert-extreme">{error}</div>
        </div>
      )}
      {loading && !data && (
        <div className="max-w-[1440px] mx-auto px-8 py-20 text-center caps-sm text-faint">Analyzing sector flows…</div>
      )}

      <div className="max-w-[1440px] mx-auto px-8 py-8 space-y-12">

        {/* I. Heatmap */}
        {data && (
          <section>
            <SectionLabel numeral="I" title="Flow Matrix" subtitle="MFI · OBV · Volume momentum" />
            <FlowHeatmap sectors={data.sectors} />
            <div className="mt-3 flex flex-wrap gap-6 caps-sm text-faint">
              <span><span className="text-paper-2">MFI</span> — Money Flow Index (0–100). &gt;70 = overbought, &lt;30 = oversold</span>
              <span><span className="text-paper-2">OBV</span> — On-Balance Volume (-100 to +100). Positive = accumulation</span>
              <span><span className="text-paper-2">Vol Momentum</span> — 5d avg vol / 20d avg vol. &gt;1.2 = inflow, &lt;0.8 = drying up</span>
            </div>
          </section>
        )}

        {/* II. Sector Cards */}
        {data && (
          <section>
            <SectionLabel numeral="II" title="Sector Detail" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {SECTOR_ORDER.map((key) => {
                const s = data.sectors[key];
                return s ? <SectorCard key={key} sector={s} /> : null;
              })}
            </div>
          </section>
        )}

        {/* III. Interpretation */}
        <section>
          <SectionLabel numeral="III" title="Rotation Thesis" />
          <div className="bg-surface border hairline p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="caps-sm text-faint mb-3">Flow Signals</div>
              <div className="space-y-2 font-sans-body text-[12px]">
                <div><span className="text-neutral-sage">Heavy Inflow</span> <span className="text-muted">— MFI &gt;70 + Vol Mom &gt;1.2 (capital rushing in)</span></div>
                <div><span className="text-neutral-sage">Strong Inflow</span> <span className="text-muted">— MFI &gt;60 + Vol Mom &gt;1.0 (sustained buying)</span></div>
                <div><span className="text-alert-extreme">Heavy Outflow</span> <span className="text-muted">— MFI &lt;30 + Vol Mom &lt;0.8 (capital fleeing)</span></div>
                <div><span className="text-alert-extreme">Weak Outflow</span> <span className="text-muted">— MFI &lt;40 + Vol Mom &lt;1.0 (gradual selling)</span></div>
                <div><span className="text-paper-2">Stable</span> <span className="text-muted">— Mixed or neutral signals</span></div>
              </div>
            </div>
            <div>
              <div className="caps-sm text-faint mb-3">Rotation Signals</div>
              <div className="space-y-2 font-sans-body text-[12px]">
                <div><span className="text-neutral-sage">Metals in + Energy out</span> <span className="text-muted">— Risk-off, USD rally</span></div>
                <div><span className="text-neutral-sage">Crypto + Tech in + Bonds out</span> <span className="text-muted">— Risk-on, risk appetite expanding</span></div>
                <div><span className="text-alert-notable">Equities stable + Others rotating</span> <span className="text-muted">— Sector rotation, no systemic flow</span></div>
                <div><span className="text-alert-extreme">All sectors outflow simultaneously</span> <span className="text-muted">— De-risking event, cash flight</span></div>
              </div>
            </div>
          </div>
        </section>

      </div>

      <footer className="max-w-[1440px] mx-auto px-8 py-6 hairline-t">
        <span className="caps-sm text-faint">Data: yFinance (OHLCV) · Metrics: MFI, OBV, Volume Momentum · 5min cache · Capital flows reveal market psychology.</span>
      </footer>
    </main>
  );
}
