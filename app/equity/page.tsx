"use client";

/**
 * app/equity/page.tsx — Equity Internals & Commercial Districts
 *
 * "Index level = total commercial activity.
 *  Breadth = how many shops are active.
 *  Weak breadth means concentration in a few names."
 *
 * Sections:
 *   I.   Market Assessment — district health read
 *   II.  Major Indices — SPX, Nasdaq, Russell 2000
 *   III. Market Breadth — RSP/SPY ratio, equal vs cap weight
 *   IV.  Key Sectors — Semis, Banks, Transports, Tech, Energy, Utilities
 *   V.   VIX — volatility / fear gauge
 *   VI.  Reference — commercial district metaphor map
 *
 * Data: GET /equity/metrics (equity_routes.py → yFinance)
 * Cache: 10 min backend
 */

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndexCard {
  key: string;
  name: string;
  district_label?: string;
  current?: number;
  d5_pct?: string;
  d20_pct?: string;
  yoy_pct?: string;
  percentile?: number;
  trend?: string;
  trend_level?: string;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  above_200sma?: boolean;
  above_50sma?: boolean;
  spark?: number[];
  error?: string;
}

interface SectorCard {
  key: string;
  name: string;
  district_label?: string;
  current?: number;
  d5_pct?: string;
  d20_pct?: string;
  rel_5d?: string;
  rel_20d?: string;
  rel_5d_raw?: number | null;
  percentile?: number;
  alert?: string;
  alert_level?: "extreme" | "notable" | "none";
  spark?: number[];
  error?: string;
}

interface BreadthData {
  label?: string;
  description?: string;
  alert_level?: "extreme" | "notable" | "none";
  rsp_spy_ratio?: number;
  ratio_20d_chg?: string;
  ratio_60d_chg?: string;
  percentile?: number;
  spark?: number[];
  note?: string;
  error?: string;
}

interface VixCard {
  current?: number;
  d5_chg?: string;
  d20_chg?: string;
  percentile?: number;
  alert?: string;
  alert_level?: "extreme" | "notable" | "none";
  spark?: number[];
}

interface Assessment {
  regime: string;
  regime_level: "extreme" | "notable" | "none";
  read: string;
  headwinds: string[];
  tailwinds: string[];
}

interface EquityMetrics {
  updated_at: string;
  indices:    Record<string, IndexCard>;
  sectors:    Record<string, SectorCard>;
  breadth:    BreadthData;
  vix:        VixCard | null;
  assessment: Assessment;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 10 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function alertColor(level?: string): string {
  if (level === "extreme") return "#E05252";
  if (level === "notable") return "#D9A84D";
  return "#6A9A6A";
}
function alertBg(level?: string): string {
  if (level === "extreme") return "rgba(224,82,82,0.09)";
  if (level === "notable") return "rgba(217,168,77,0.09)";
  return "rgba(106,154,106,0.09)";
}
function pctColor(pct?: number | null): string {
  if (pct == null) return "#55534B";
  if (pct >= 80) return "#E05252";
  if (pct >= 60) return "#D9A84D";
  if (pct <= 20) return "#6A9A6A";
  return "#8A8780";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-4 pb-3 border-b border-slate-900">
      <div className="flex items-baseline gap-3">
        <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "#D9A84D", fontSize: 22 }}>{num}</span>
        <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: "#E8E6E0", fontSize: 20 }}>{title}</span>
      </div>
      {subtitle && <span className="text-[10px] tracking-widest uppercase font-mono text-slate-600">{subtitle}</span>}
    </div>
  );
}

function Badge({ level, label }: { level?: string; label?: string }) {
  if (!label || label === "—") return null;
  const lv = level ?? "none";
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
      style={{ color: alertColor(lv), borderColor: alertColor(lv) + "44", background: alertBg(lv) }}>
      {label}
    </span>
  );
}

function PercentileBar({ value }: { value?: number | null }) {
  if (value == null) return <div className="h-1 bg-slate-800 rounded-full" />;
  const color = value >= 80 ? "#E05252" : value >= 60 ? "#D9A84D" : value <= 20 ? "#6A9A6A" : "#4A6FA5";
  return (
    <div className="relative h-1 bg-slate-800 rounded-full overflow-hidden">
      <div className="absolute left-0 top-0 h-full rounded-full transition-all"
        style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

function Sparkline({ data, color = "#D9A84D" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const w = 80, h = 28, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Assessment Banner ────────────────────────────────────────────────────────

function AssessmentBanner({ a }: { a: Assessment }) {
  const color = alertColor(a.regime_level);
  return (
    <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: color + "44", background: alertBg(a.regime_level) }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">🏙 Commercial District Health</div>
          <div className="text-2xl font-mono" style={{ color }}>{a.regime}</div>
        </div>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{a.read}</p>
      {(a.headwinds.length > 0 || a.tailwinds.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Headwinds</div>
            {a.headwinds.length > 0 ? a.headwinds.map((h, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <span className="text-[10px] mt-0.5" style={{ color: "#E05252" }}>▼</span>
                <span className="text-xs text-slate-400">{h}</span>
              </div>
            )) : <div className="text-xs text-slate-700">None active</div>}
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Tailwinds</div>
            {a.tailwinds.length > 0 ? a.tailwinds.map((t, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <span className="text-[10px] mt-0.5" style={{ color: "#6A9A6A" }}>▲</span>
                <span className="text-xs text-slate-400">{t}</span>
              </div>
            )) : <div className="text-xs text-slate-700">None active</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Index Card ───────────────────────────────────────────────────────────────

function IndexCard({ card }: { card: IndexCard }) {
  const trendColor = card.trend_level === "extreme" ? "#E05252" : card.trend_level === "notable" ? "#D9A84D" : "#6A9A6A";
  if (card.error) return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{card.name}</div>
      <div className="text-sm text-red-400 font-mono mt-2">{card.error}</div>
    </div>
  );
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{card.name}</div>
        {card.district_label && <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{card.district_label}</div>}
      </div>
      <div className="flex items-end justify-between">
        <div className="font-mono text-2xl text-slate-100">{card.current?.toLocaleString() ?? "—"}</div>
        <Sparkline data={card.spark ?? []} color={trendColor} />
      </div>
      {/* SMA context */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: card.above_200sma ? "rgba(106,154,106,0.15)" : "rgba(224,82,82,0.15)",
                   color: card.above_200sma ? "#6A9A6A" : "#E05252" }}>
          {card.above_200sma ? "▲" : "▼"} 200 SMA
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: card.above_50sma ? "rgba(106,154,106,0.15)" : "rgba(224,82,82,0.15)",
                   color: card.above_50sma ? "#6A9A6A" : "#E05252" }}>
          {card.above_50sma ? "▲" : "▼"} 50 SMA
        </span>
      </div>
      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
          <span>52w percentile</span>
          <span style={{ color: pctColor(card.percentile) }}>{card.percentile != null ? `${card.percentile}th` : "—"}</span>
        </div>
        <PercentileBar value={card.percentile} />
      </div>
      <div className="border-t border-slate-900 pt-3 space-y-1.5 text-xs">
        {card.d5_pct  && <div className="flex justify-between"><span className="text-slate-600 font-mono">5d</span><span className="font-mono text-slate-400">{card.d5_pct}</span></div>}
        {card.d20_pct && <div className="flex justify-between"><span className="text-slate-600 font-mono">20d</span><span className="font-mono text-slate-400">{card.d20_pct}</span></div>}
        {card.yoy_pct && <div className="flex justify-between"><span className="text-slate-600 font-mono">YoY</span><span className="font-mono text-slate-400">{card.yoy_pct}</span></div>}
      </div>
      <div className="text-[11px] font-mono" style={{ color: trendColor }}>{card.trend}</div>
    </div>
  );
}

// ─── Sector Card ──────────────────────────────────────────────────────────────

function SectorCardComp({ card }: { card: SectorCard }) {
  const level = card.alert_level ?? "none";
  const relColor = card.rel_5d_raw != null
    ? (card.rel_5d_raw >= 0 ? "#6A9A6A" : "#E05252")
    : "#55534B";

  if (card.error) return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{card.name}</div>
      <div className="text-xs text-red-400 font-mono mt-1">{card.error}</div>
    </div>
  );
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{card.name}</div>
          {card.district_label && <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{card.district_label}</div>}
        </div>
        <Sparkline data={card.spark ?? []} color={alertColor(level)} />
      </div>
      <div className="font-mono text-xl text-slate-100">{card.current?.toLocaleString() ?? "—"}</div>
      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
          <span>vs SPX (5d)</span>
          <span style={{ color: relColor }}>{card.rel_5d ?? "—"}</span>
        </div>
      </div>
      <div className="border-t border-slate-900 pt-2 space-y-1 text-xs">
        {card.d5_pct  && <div className="flex justify-between"><span className="text-slate-600 font-mono">5d abs</span><span className="font-mono text-slate-400">{card.d5_pct}</span></div>}
        {card.d20_pct && <div className="flex justify-between"><span className="text-slate-600 font-mono">20d abs</span><span className="font-mono text-slate-400">{card.d20_pct}</span></div>}
      </div>
      <Badge level={level} label={card.alert} />
    </div>
  );
}

// ─── Breadth Panel ────────────────────────────────────────────────────────────

function BreadthPanel({ breadth }: { breadth: BreadthData }) {
  const level = breadth.alert_level ?? "none";
  const color = alertColor(level);
  if (breadth.error) return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-red-400 font-mono">{breadth.error}</div>
  );
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">RSP / SPY Ratio — Equal vs Cap Weight</div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>How many shops are active</div>
        </div>
        <span className="text-sm font-mono" style={{ color }}>{breadth.label ?? "—"}</span>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">{breadth.description}</p>
          <div className="space-y-2 text-xs">
            {breadth.rsp_spy_ratio != null && (
              <div className="flex justify-between">
                <span className="text-slate-600 font-mono">RSP/SPY ratio</span>
                <span className="font-mono text-slate-300">{breadth.rsp_spy_ratio.toFixed(4)}</span>
              </div>
            )}
            {breadth.ratio_20d_chg && (
              <div className="flex justify-between">
                <span className="text-slate-600 font-mono">20d change</span>
                <span className="font-mono text-slate-400">{breadth.ratio_20d_chg}</span>
              </div>
            )}
            {breadth.ratio_60d_chg && (
              <div className="flex justify-between">
                <span className="text-slate-600 font-mono">60d change</span>
                <span className="font-mono text-slate-400">{breadth.ratio_60d_chg}</span>
              </div>
            )}
          </div>
          {breadth.note && <p className="text-[10px] text-slate-700 mt-3">{breadth.note}</p>}
        </div>
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Ratio trend</div>
          <Sparkline data={breadth.spark ?? []} color={color} />
          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
              <span>52w percentile of ratio</span>
              <span style={{ color: pctColor(breadth.percentile) }}>{breadth.percentile != null ? `${breadth.percentile}th` : "—"}</span>
            </div>
            <PercentileBar value={breadth.percentile} />
          </div>
          <div className="mt-4 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: "#6A9A6A" }}>▲ Rising ratio</span>
              <span className="text-slate-600">= more shops open (healthy breadth)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: "#E05252" }}>▼ Falling ratio</span>
              <span className="text-slate-600">= few mega-cap shops driving index (fragile)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VIX Card ─────────────────────────────────────────────────────────────────

function VixCard({ vix }: { vix: VixCard }) {
  const level = vix.alert_level ?? "none";
  const color = alertColor(level);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">VIX — Fear Gauge</div>
        <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>Weather alert for commercial districts</div>
      </div>
      <div className="flex items-end justify-between">
        <div className="font-mono text-3xl" style={{ color }}>{vix.current?.toFixed(2) ?? "—"}</div>
        <Sparkline data={vix.spark ?? []} color={color} />
      </div>
      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
          <span>52w percentile</span>
          <span style={{ color: pctColor(vix.percentile) }}>{vix.percentile != null ? `${vix.percentile}th` : "—"}</span>
        </div>
        <PercentileBar value={vix.percentile} />
      </div>
      <div className="border-t border-slate-900 pt-3 space-y-1.5 text-xs">
        {vix.d5_chg  && <div className="flex justify-between"><span className="text-slate-600 font-mono">5d chg</span><span className="font-mono text-slate-400">{vix.d5_chg}</span></div>}
        {vix.d20_chg && <div className="flex justify-between"><span className="text-slate-600 font-mono">20d chg</span><span className="font-mono text-slate-400">{vix.d20_chg}</span></div>}
      </div>
      <Badge level={level} label={vix.alert} />
      <div className="text-[10px] text-slate-700 border-t border-slate-900 pt-2">
        &gt;30 = fear/panic · 20–30 = elevated · 13–20 = normal · &lt;13 = complacent
      </div>
    </div>
  );
}

// ─── Metaphor Reference ───────────────────────────────────────────────────────

function MetaphorRef() {
  const rows = [
    { instrument: "S&P 500",        metaphor: "Total commercial activity",       signal: "Index level = how busy the city is overall." },
    { instrument: "Nasdaq / QQQ",   metaphor: "Tech & growth district",          signal: "Growth risk appetite. Leads BTC as a risk-on partner." },
    { instrument: "Russell 2000",   metaphor: "Small business district",         signal: "Health of smaller firms. Weakness = broad risk-off." },
    { instrument: "Breadth (RSP/SPY)", metaphor: "How many shops are open",     signal: "Falling ratio = mega-cap concentration. Fragile rally." },
    { instrument: "Semiconductors", metaphor: "Semiconductor quarter",           signal: "Tech cycle health. Semis lead tech. Semis lead BTC." },
    { instrument: "Banks (XLF)",    metaphor: "Banking district",                signal: "Credit stress indicator. Weak banks = broader concern." },
    { instrument: "Transports (IYT)","metaphor: Transport & logistics hub",     signal: "Dow Theory: if transports confirm, economy moving goods." },
    { instrument: "VIX",            metaphor: "City weather alert",              signal: "Spiking VIX = shelter from rain. Risk assets sold." },
  ];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-900">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Commercial District Metaphor Map</div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-900">
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal w-40">Instrument</th>
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal">Metaphor</th>
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal">BTC Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.instrument} className={`border-b border-slate-900 hover:bg-slate-900 transition-colors ${i === rows.length - 1 ? "border-b-0" : ""}`}>
              <td className="px-5 py-3 font-mono text-slate-300 whitespace-nowrap">{r.instrument}</td>
              <td className="px-5 py-3 font-mono text-[11px]" style={{ color: "#D9A84D88" }}>{r.metaphor}</td>
              <td className="px-5 py-3 text-slate-500">{r.signal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EquityDashboard() {
  const [data, setData]               = useState<EquityMetrics | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API}/equity/metrics`);
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const json: EquityMetrics = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const flushCache = async () => {
    await fetch(`${API}/equity/cache/flush`);
    fetchAll();
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [fetchAll]);

  const idx = data?.indices ?? {};
  const sec = data?.sectors ?? {};

  return (
    <main className="min-h-screen p-6"
      style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-900">
          <div className="flex items-baseline gap-4">
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, fontWeight: 400 }}>
              Equity Internals
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {lastUpdated ? `Updated ${lastUpdated} UTC` : "Loading…"}
            </div>
          </div>
          <nav className="flex gap-1 flex-wrap justify-end">
            <a href="/" className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">BTC</a>
            <a href="/macro" className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">Macro</a>
            <a href="/liquidity" className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">Liquidity</a>
            <a href="/forex" className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">Forex</a>
            <a href="/growth" className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">Growth</a>
            <span className="text-xs px-3 py-1.5 rounded-md border font-mono"
              style={{ background: "#1C1C1E", color: "#D9A84D", borderColor: "#3A3228" }}>
              Equity
            </span>
            <a href="/commodities" className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">Commodities</a>
            <button onClick={flushCache}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-600 hover:text-slate-300 hover:border-slate-600 transition-colors font-mono">
              ↺ flush
            </button>
          </nav>
        </header>

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — check backend and ensure /equity/metrics is reachable.
          </div>
        )}
        {loading && !data && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Surveying commercial districts…
          </div>
        )}

        {data && (
          <>
            {/* ── I. Assessment ─────────────────────────────────────────── */}
            <section>
              <SectionLabel num="I" title="District Health" subtitle="Equity internals · BTC backdrop" />
              <AssessmentBanner a={data.assessment} />
            </section>

            {/* ── II. Major Indices ─────────────────────────────────────── */}
            <section>
              <SectionLabel num="II" title="Major Indices" subtitle="S&P 500 · Nasdaq · Russell 2000 · yFinance" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <IndexCard card={idx.spx    ?? { key:"spx",    name:"S&P 500" }} />
                <IndexCard card={idx.qqq    ?? { key:"qqq",    name:"Nasdaq 100" }} />
                <IndexCard card={idx.iwm    ?? { key:"iwm",    name:"Russell 2000" }} />
              </div>
            </section>

            {/* ── III. Breadth ──────────────────────────────────────────── */}
            <section>
              <SectionLabel num="III" title="Market Breadth" subtitle="RSP/SPY ratio · equal vs cap-weight · how many shops are open" />
              <BreadthPanel breadth={data.breadth} />
            </section>

            {/* ── IV. Key Sectors ───────────────────────────────────────── */}
            <section>
              <SectionLabel num="IV" title="Key Sectors" subtitle="Semis · Banks · Transports · Tech · Energy · Utilities · vs S&P" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {["soxx", "xlf", "iyt", "xlk", "xle", "xlu"].map(k => (
                  <SectorCardComp key={k} card={sec[k] ?? { key: k, name: k.toUpperCase() }} />
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-slate-800 px-4 py-3 text-xs text-slate-600">
                Relative performance vs S&P 500. Semis (SOXX) and Banks (XLF) are the two most BTC-relevant: semis signal tech cycle / risk appetite, banks signal credit health.
                Transports (IYT) are the Dow Theory confirmation — if goods are moving, the economy is alive.
              </div>
            </section>

            {/* ── V. VIX ────────────────────────────────────────────────── */}
            <section>
              <SectionLabel num="V" title="VIX" subtitle="Fear gauge · city weather alert · CBOE" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.vix && <VixCard vix={data.vix} />}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">VIX and BTC</div>
                  <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#B8B5AA" }}>
                    A rapidly rising VIX signals that equity investors are rushing for shelter. When VIX spikes alongside falling Nasdaq and rising DXY, BTC is vulnerable to a correlated sell-off — especially if funding rates are elevated and OI is crowded.
                  </p>
                  <p className="text-[12px] leading-relaxed" style={{ color: "#8A8780" }}>
                    Conversely, a sustained low VIX (below 15) signals calm, complacent markets — conditions that have historically been favorable for BTC as traders reach for yield and volatility in risk assets.
                  </p>
                </div>
              </div>
            </section>

            {/* ── VI. Reference ─────────────────────────────────────────── */}
            <section>
              <SectionLabel num="VI" title="Commercial District Map" subtitle="Metaphor reference" />
              <MetaphorRef />
            </section>
          </>
        )}

        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>Data: yFinance · ^GSPC · QQQ · ^RUT · SOXX · XLF · IYT · XLK · XLE · XLU · RSP · SPY · ^VIX</span>
          <span>·</span>
          <span>Cache: 10min</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>
      </div>
    </main>
  );
}
