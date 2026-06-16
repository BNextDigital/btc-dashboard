"use client";

/**
 * app/forex/page.tsx — USD & Forex Dashboard
 *
 * "FX is wind between cities."
 * Strong USD = global headwind. Weak USD = easing external pressure.
 *
 * Sections:
 *   I.   Wind Direction Summary — top-level BTC read
 *   II.  DXY — overall wind direction
 *   III. Major Pairs — EUR/USD · USD/JPY · USD/CNH
 *   IV.  Carry Trade Health — JPY carry barometer
 *   V.   Emerging Market FX Basket — EM gusts
 *   VI.  FX Volatility — wind turbulence index
 *   VII. FX Metaphor Map — city legend
 *
 * Data: GET /forex/metrics  (forex_routes.py → yFinance + FRED)
 * Cache: 5 min backend
 *
 * Nav: BTC · Macro · Liquidity · Forex (active) · Sector Flows
 */

import { useEffect, useState, useCallback } from "react";
import DashboardNav from "@/components/DashboardNav";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FxCard {
  name: string;
  city_label: string;
  current?: string;
  current_raw?: number;
  d5_chg?: string;
  d5_pct?: string;
  d20_chg?: string;
  d20_pct?: string;
  yoy_pct?: string;
  percentile?: number | null;
  alert: string;
  alert_level: "extreme" | "notable" | "none";
  pattern?: string;
  direction_note?: string;
  spark?: number[];
  note?: string;
  error?: string;
  // USD/JPY specific
  carry_signal?: string;
  carry_level?: "extreme" | "notable" | "none";
  chg5_abs?: number;
}

interface EmPair {
  current?: string;
  current_raw?: number;
  d5_pct?: string;
  d20_pct?: string;
  percentile?: number;
  spark?: number[];
  error?: string;
}

interface EmFxCard {
  name: string;
  city_label: string;
  pairs: Record<string, EmPair>;
  avg_percentile: number;
  alert: string;
  alert_level: "extreme" | "notable" | "none";
  note?: string;
}

interface FxVolCard {
  name: string;
  city_label: string;
  evz?: string;
  evz_raw?: number;
  evz_d5?: string;
  evz_d20?: string;
  percentile?: number | null;
  alert: string;
  alert_level: "extreme" | "notable" | "none";
  spark?: number[];
  broad_usd?: string;
  broad_usd_yoy?: string;
  broad_note?: string;
  note?: string;
}

interface CarryCard {
  name: string;
  city_label: string;
  signal: string;
  alert_level: "extreme" | "notable" | "none";
  summary: string;
  btc_impact: string;
  note?: string;
}

interface WindAssessment {
  direction: string;
  color_level: "extreme" | "notable" | "none";
  read: string;
  headwinds: string[];
  tailwinds: string[];
}

interface ForexMetrics {
  updated_at: string;
  dxy:    FxCard;
  eurusd: FxCard;
  usdjpy: FxCard;
  usdcnh: FxCard;
  em_fx:  EmFxCard;
  fxvol:  FxVolCard;
  carry:  CarryCard;
  wind:   WindAssessment;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function alertColor(level: string): string {
  if (level === "extreme") return "#E05252";
  if (level === "notable") return "#D9A84D";
  return "#6A9A6A";
}
function alertBg(level: string): string {
  if (level === "extreme") return "rgba(224,82,82,0.09)";
  if (level === "notable") return "rgba(217,168,77,0.09)";
  return "rgba(106,154,106,0.09)";
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

function Badge({ level, label }: { level: string; label: string }) {
  if (!label || label === "—") return null;
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
      style={{ color: alertColor(level), borderColor: alertColor(level) + "44", background: alertBg(level) }}>
      {label}
    </span>
  );
}

function PercentileBar({ value }: { value: number | null | undefined }) {
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
  const range = max - min || 0.001;
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

// ─── Wind Direction Banner ────────────────────────────────────────────────────

function WindBanner({ wind }: { wind: WindAssessment }) {
  const color = alertColor(wind.color_level);
  const bg    = alertBg(wind.color_level);
  return (
    <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: color + "44", background: bg }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">FX Wind Direction · BTC Impact</div>
          <div className="text-2xl font-mono" style={{ color }}>{wind.direction}</div>
        </div>
        <span className="text-xs font-mono px-3 py-1.5 rounded-full border"
          style={{ color, borderColor: color + "44", background: bg }}>
          {wind.color_level === "extreme" ? "High Alert" : wind.color_level === "notable" ? "Elevated" : "Calm"}
        </span>
      </div>

      <p className="text-sm text-slate-400 leading-relaxed">{wind.read}</p>

      {(wind.headwinds.length > 0 || wind.tailwinds.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Headwinds</div>
            {wind.headwinds.length > 0
              ? wind.headwinds.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="text-[10px] mt-0.5" style={{ color: "#E05252" }}>▼</span>
                    <span className="text-xs text-slate-400">{h}</span>
                  </div>
                ))
              : <div className="text-xs text-slate-700">None active</div>}
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Tailwinds</div>
            {wind.tailwinds.length > 0
              ? wind.tailwinds.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="text-[10px] mt-0.5" style={{ color: "#6A9A6A" }}>▲</span>
                    <span className="text-xs text-slate-400">{t}</span>
                  </div>
                ))
              : <div className="text-xs text-slate-700">None active</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DXY Card ─────────────────────────────────────────────────────────────────

function DXYCard({ dxy }: { dxy: FxCard }) {
  const level = dxy.alert_level ?? "none";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{dxy.name}</div>
        <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{dxy.city_label}</div>
      </div>
      <div className="flex items-end justify-between">
        <div className="font-mono text-3xl text-slate-100">{dxy.current ?? "—"}</div>
        <Sparkline data={dxy.spark ?? []} color={alertColor(level)} />
      </div>
      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
          <span>52w percentile</span>
          <span>{dxy.percentile != null ? `${dxy.percentile}th` : "—"}</span>
        </div>
        <PercentileBar value={dxy.percentile} />
      </div>
      <div className="border-t border-slate-900 pt-3 space-y-1.5 text-xs">
        {dxy.d5_pct  && <div className="flex justify-between"><span className="text-slate-600 font-mono">5d</span><span className="font-mono text-slate-400">{dxy.d5_pct}</span></div>}
        {dxy.d20_pct && <div className="flex justify-between"><span className="text-slate-600 font-mono">20d</span><span className="font-mono text-slate-400">{dxy.d20_pct}</span></div>}
        {dxy.yoy_pct && <div className="flex justify-between"><span className="text-slate-600 font-mono">YoY</span><span className="font-mono text-slate-400">{dxy.yoy_pct}</span></div>}
      </div>
      <Badge level={level} label={dxy.alert} />
      {dxy.pattern && <p className="text-[11px] text-slate-600">{dxy.pattern}</p>}
      {dxy.note    && <p className="text-[10px] text-slate-700 border-t border-slate-900 pt-2">{dxy.note}</p>}
    </div>
  );
}

// ─── Generic Pair Card ────────────────────────────────────────────────────────

function PairCard({ card }: { card: FxCard }) {
  const level = card.alert_level ?? "none";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{card.name}</div>
        <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{card.city_label}</div>
      </div>
      {card.error ? (
        <div className="text-sm text-red-400 font-mono">{card.error}</div>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div className="font-mono text-2xl text-slate-100">{card.current ?? "—"}</div>
            <Sparkline data={card.spark ?? []} />
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
              <span>52w percentile</span>
              <span>{card.percentile != null ? `${card.percentile}th` : "—"}</span>
            </div>
            <PercentileBar value={card.percentile} />
          </div>
          <div className="border-t border-slate-900 pt-3 space-y-1.5 text-xs">
            {card.d5_pct  && <div className="flex justify-between"><span className="text-slate-600 font-mono">5d</span><span className="font-mono text-slate-400">{card.d5_pct}</span></div>}
            {card.d20_pct && <div className="flex justify-between"><span className="text-slate-600 font-mono">20d</span><span className="font-mono text-slate-400">{card.d20_pct}</span></div>}
            {card.yoy_pct && <div className="flex justify-between"><span className="text-slate-600 font-mono">YoY</span><span className="font-mono text-slate-400">{card.yoy_pct}</span></div>}
          </div>
          <Badge level={level} label={card.alert} />
          {card.pattern        && <p className="text-[11px] text-slate-600">{card.pattern}</p>}
          {card.direction_note && <p className="text-[10px] text-slate-700 border-t border-slate-900 pt-2">{card.direction_note}</p>}
        </>
      )}
    </div>
  );
}

// ─── Carry Trade Card ─────────────────────────────────────────────────────────

function CarryCard({ carry, usdjpy }: { carry: CarryCard; usdjpy: FxCard }) {
  const level = carry.alert_level ?? "none";
  const color = alertColor(level);
  return (
    <div className="rounded-xl border p-5 flex flex-col gap-3"
      style={{ borderColor: color + "44", background: alertBg(level) }}>
      <div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{carry.name}</div>
        <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{carry.city_label}</div>
      </div>
      <div className="font-mono text-sm" style={{ color }}>{carry.signal}</div>
      <p className="text-xs text-slate-400 leading-relaxed">{carry.summary}</p>
      <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-600 font-mono">USD/JPY</span>
          <span className="font-mono text-slate-300">{usdjpy.current ?? "—"}</span>
        </div>
        {usdjpy.d5_pct && (
          <div className="flex justify-between">
            <span className="text-slate-600 font-mono">5d move</span>
            <span className="font-mono" style={{ color: usdjpy.d5_pct.startsWith("-") ? "#6A9A6A" : "#E05252" }}>
              {usdjpy.d5_pct}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-600 font-mono">BTC impact</span>
          <span className="font-mono" style={{ color: carry.btc_impact === "bearish" ? "#E05252" : "#6A9A6A" }}>
            {carry.btc_impact}
          </span>
        </div>
      </div>
      {carry.note && <p className="text-[10px] text-slate-700 border-t border-slate-800 pt-2">{carry.note}</p>}
    </div>
  );
}

// ─── EM FX Basket ─────────────────────────────────────────────────────────────

function EmFxPanel({ em }: { em: EmFxCard }) {
  const level = em.alert_level ?? "none";
  const pairEntries = Object.entries(em.pairs ?? {});
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{em.name}</div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{em.city_label}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-600">avg stress</div>
            <div className="text-sm font-mono" style={{ color: alertColor(level) }}>{em.avg_percentile}th pct</div>
          </div>
          <Badge level={level} label={em.alert} />
        </div>
      </div>

      {/* EM pair grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y divide-slate-900">
        {pairEntries.map(([label, pair]) => (
          <div key={label} className="px-4 py-3">
            <div className="text-[10px] font-mono text-slate-600 mb-1">USD/{label}</div>
            {pair.error ? (
              <div className="text-[10px] text-red-500 font-mono">—</div>
            ) : (
              <>
                <div className="font-mono text-sm text-slate-200">{pair.current ?? "—"}</div>
                <div className="flex gap-2 mt-1">
                  {pair.d5_pct && (
                    <span className="text-[10px] font-mono" style={{ color: pair.d5_pct?.startsWith("+") ? "#E05252" : "#6A9A6A" }}>
                      {pair.d5_pct} 5d
                    </span>
                  )}
                </div>
                {pair.percentile != null && (
                  <div className="mt-1.5">
                    <PercentileBar value={pair.percentile} />
                    <div className="text-[9px] font-mono text-slate-700 mt-0.5">{pair.percentile}th pct</div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {em.note && (
        <div className="px-5 py-3 border-t border-slate-900 text-[10px] text-slate-700">{em.note}</div>
      )}
    </div>
  );
}

// ─── FX Vol Card ──────────────────────────────────────────────────────────────

function FxVolCard({ fxvol }: { fxvol: FxVolCard }) {
  const level = fxvol.alert_level ?? "none";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{fxvol.name}</div>
        <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{fxvol.city_label}</div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] font-mono text-slate-600 mb-0.5">EUR/USD Implied Vol (EVZ)</div>
          <div className="font-mono text-2xl text-slate-100">{fxvol.evz ?? "—"}</div>
        </div>
        <Sparkline data={fxvol.spark ?? []} color={alertColor(level)} />
      </div>
      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
          <span>52w percentile</span>
          <span>{fxvol.percentile != null ? `${fxvol.percentile}th` : "—"}</span>
        </div>
        <PercentileBar value={fxvol.percentile} />
      </div>
      <div className="border-t border-slate-900 pt-3 space-y-1.5 text-xs">
        {fxvol.evz_d5  && <div className="flex justify-between"><span className="text-slate-600 font-mono">5d chg</span><span className="font-mono text-slate-400">{fxvol.evz_d5}</span></div>}
        {fxvol.evz_d20 && <div className="flex justify-between"><span className="text-slate-600 font-mono">20d chg</span><span className="font-mono text-slate-400">{fxvol.evz_d20}</span></div>}
        {fxvol.broad_usd && (
          <div className="flex justify-between">
            <span className="text-slate-600 font-mono">Broad USD</span>
            <span className="font-mono text-slate-400">{fxvol.broad_usd} ({fxvol.broad_usd_yoy})</span>
          </div>
        )}
      </div>
      <Badge level={level} label={fxvol.alert} />
      {fxvol.note && <p className="text-[10px] text-slate-700 border-t border-slate-900 pt-2">{fxvol.note}</p>}
    </div>
  );
}

// ─── FX Metaphor Map ──────────────────────────────────────────────────────────

function FxMetaphorMap() {
  const items = [
    { instrument: "DXY",        metaphor: "Overall wind direction",       btc: "Rising DXY = strong headwind. Falling = easing pressure." },
    { instrument: "EUR/USD",    metaphor: "European wind gauge",           btc: "Largest DXY component (58%). Rising = USD weaker = BTC tailwind." },
    { instrument: "USD/JPY",    metaphor: "Carry trade barometer",         btc: "Weak JPY = carry alive. Sharp JPY surge = forced unwind = sell-off." },
    { instrument: "USD/CNH",    metaphor: "Asia risk signal",              btc: "Weak CNH = regional stress / capital outflows. Watch PBOC." },
    { instrument: "EM FX",      metaphor: "Emerging market gusts",         btc: "Rising EM USD pairs = broad USD dominance = global headwind." },
    { instrument: "FX Vol",     metaphor: "Wind turbulence index",         btc: "Spiking FX vol often precedes deleveraging across risk assets." },
    { instrument: "Carry Trade", metaphor: "Borrow cheap water from Japan", btc: "Carry unwind = forced liquidation. Most dangerous tail risk from FX." },
  ];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-900">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">FX Metaphor Map — City Wind System</div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-900">
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal">Instrument</th>
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal">City Metaphor</th>
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal">BTC Signal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.instrument}
              className={`border-b border-slate-900 hover:bg-slate-900 transition-colors ${i === items.length - 1 ? "border-b-0" : ""}`}>
              <td className="px-5 py-3 font-mono text-slate-300">{item.instrument}</td>
              <td className="px-5 py-3 font-mono text-[11px]" style={{ color: "#D9A84D88" }}>{item.metaphor}</td>
              <td className="px-5 py-3 text-slate-500">{item.btc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ForexDashboard() {
  const [data, setData]               = useState<ForexMetrics | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API}/forex/metrics`);
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const json: ForexMetrics = await res.json();
      setData(json);
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
    await fetch(`${API}/forex/cache/flush`);
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
        <DashboardNav
          current="forex"
          title="USD &amp; Forex"
          lastUpdated={lastUpdated}
          onFlush={flushCache}
        />

        {/* ── Error ── */}
        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — check backend and ensure /forex/metrics is reachable.
          </div>
        )}

        {/* ── Loading ── */}
        {loading && !data && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Reading wind conditions…
          </div>
        )}

        {data && (
          <>
            {/* ── I. Wind Direction Summary ─────────────────────────────── */}
            <section>
              <SectionLabel num="I" title="Wind Direction" subtitle="FX aggregate · BTC impact read" />
              <WindBanner wind={data.wind} />
            </section>

            {/* ── II. DXY ───────────────────────────────────────────────── */}
            <section>
              <SectionLabel num="II" title="DXY — Dollar Index" subtitle="Overall wind direction · DX-Y.NYB" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <DXYCard dxy={data.dxy} />

                {/* DXY context panel */}
                <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
                      How DXY moves BTC
                    </div>
                    <p className="text-[13px] leading-relaxed mb-4" style={{ color: "#B8B5AA" }}>
                      <span style={{ color: "#E8E4D9", fontWeight: 500 }}>DXY</span> measures the dollar against a basket of six major currencies (EUR 57.6%, JPY 13.6%, GBP 11.9%, CAD 9.1%, SEK 4.2%, CHF 3.6%). When DXY rises, global risk assets face headwinds — BTC included. When DXY falls, it signals easing USD pressure globally and has historically been one of the cleanest macro tailwinds for BTC.
                    </p>
                    <p className="text-[12px] leading-relaxed" style={{ color: "#8A8780" }}>
                      The relationship isn't mechanical — BTC can rally through a rising DXY if ETF inflows and on-chain demand are strong enough to override macro headwinds. The key question: is capital coming in despite the wind?
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-900 pt-4">
                    {[
                      { label: "Current", value: data.dxy.current ?? "—" },
                      { label: "5d", value: data.dxy.d5_pct ?? "—" },
                      { label: "YoY", value: data.dxy.yoy_pct ?? "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <div className="text-[10px] font-mono text-slate-600 mb-1">{label}</div>
                        <div className="font-mono text-sm text-slate-300">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── III. Major Pairs ──────────────────────────────────────── */}
            <section>
              <SectionLabel
                num="III"
                title="Major Pairs"
                subtitle="EUR/USD · USD/JPY · USD/CNH · yFinance"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PairCard card={data.eurusd} />
                <PairCard card={data.usdjpy} />
                <PairCard card={data.usdcnh} />
              </div>
            </section>

            {/* ── IV. Carry Trade ───────────────────────────────────────── */}
            <section>
              <SectionLabel
                num="IV"
                title="Carry Trade Health"
                subtitle="JPY carry barometer · unwind risk signal"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CarryCard carry={data.carry} usdjpy={data.usdjpy} />

                {/* Carry context */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
                    Why carry trades matter for BTC
                  </div>
                  <p className="text-[13px] leading-relaxed mb-4" style={{ color: "#B8B5AA" }}>
                    The <span style={{ color: "#E8E4D9", fontWeight: 500 }}>JPY carry trade</span> involves borrowing in low-rate yen and investing in higher-yielding assets — equities, crypto, EM bonds. When JPY strengthens sharply (USD/JPY falls), these positions become unprofitable and investors are forced to sell assets to repay yen debt.
                  </p>
                  <p className="text-[12px] leading-relaxed" style={{ color: "#8A8780" }}>
                    The August 2024 carry unwind saw BTC drop ~20% in 48 hours as USD/JPY fell from 162 to 143. Watch for: rapid USD/JPY decline, BOJ rate hike signals, or sudden JPY strength vs peers.
                  </p>
                  <div className="border-t border-slate-900 pt-3 mt-3">
                    <div className="text-[10px] font-mono text-slate-700">Carry signal: USD/JPY 5d rate of change · primary trigger level: −3%</div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── V. EM FX ──────────────────────────────────────────────── */}
            <section>
              <SectionLabel
                num="V"
                title="Emerging Market FX"
                subtitle="BRL · MXN · INR · KRW · ZAR · EM stress basket"
              />
              <EmFxPanel em={data.em_fx} />
            </section>

            {/* ── VI. FX Volatility ─────────────────────────────────────── */}
            <section>
              <SectionLabel
                num="VI"
                title="FX Volatility"
                subtitle="EVZ implied vol · DTWEXBGS broad USD · wind turbulence"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FxVolCard fxvol={data.fxvol} />
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
                    FX vol and BTC
                  </div>
                  <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#B8B5AA" }}>
                    <span style={{ color: "#E8E4D9", fontWeight: 500 }}>EVZ</span> measures implied volatility on EUR/USD options — the market's expectation of future FX turbulence. Spikes in FX vol typically precede broader deleveraging as currency uncertainty makes leveraged positions harder to hold.
                  </p>
                  <p className="text-[12px] leading-relaxed" style={{ color: "#8A8780" }}>
                    The <span style={{ color: "#B8B5AA" }}>Broad USD Index (DTWEXBGS)</span> from FRED provides the long-run dollar trend vs 26 trading partners — broader than DXY and harder to manipulate by short-term flows.
                  </p>
                </div>
              </div>
            </section>

            {/* ── VII. FX Metaphor Map ──────────────────────────────────── */}
            <section>
              <SectionLabel num="VII" title="FX Metaphor Map" subtitle="City wind system · reference" />
              <FxMetaphorMap />
            </section>
          </>
        )}

        {/* ── Footer ── */}
        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>Data: yFinance (DXY · EUR/USD · USD/JPY · USD/CNH · EM pairs · EVZ) · FRED DTWEXBGS</span>
          <span>·</span>
          <span>Cache: 5min</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>
      </div>
    </main>
  );
}
