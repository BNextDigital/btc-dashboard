"use client";

/**
 * app/growth/page.tsx — Growth & Inflation Dashboard
 *
 * Two metaphors:
 *   INFLATION = pipe temperature
 *     Too hot → Fed cannot ease → risk assets under pressure
 *     Cooling  → space for easing → supportive backdrop
 *     Too fast → demand collapse → recession risk
 *
 *   GROWTH/EMPLOYMENT = city income & activity
 *     Goldilocks: slowing from hot, employment stable, no recession
 *
 * Sections:
 *   I.   Pipe Temperature — inflation regime assessment
 *   II.  Core Inflation — CPI, Core CPI, PCE, Core PCE
 *   III. Producer & Wage Pressure — PPI, Wages
 *   IV.  Market Inflation Expectations — Breakevens, Inflation Swaps note
 *   V.   Housing & Rent Inflation — Rent, OER
 *   VI.  Energy Inputs — WTI Oil, Gasoline
 *   VII. City Income — growth regime assessment
 *   VIII.Labor Market — Payrolls, Unemployment, Claims, JOLTS
 *   IX.  Output & Activity — GDP, ISM, Retail Sales, Sentiment
 *   X.   Metaphor Reference
 *
 * Data: GET /growth/metrics (growth_inflation_routes.py → FRED API)
 * Cache: 4hr backend (monthly/weekly releases)
 */

import { useEffect, useState, useCallback } from "react";
import DashboardNav from "@/components/DashboardNav";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricCard {
  key: string;
  city_label: string;
  current: string;
  current_raw?: number | null;
  latest_date?: string;
  mom?: string;
  mom_raw?: number | null;
  qoq?: string;
  yoy?: string;
  target?: string;
  percentile?: number | null;
  alert: string;
  alert_level: "extreme" | "notable" | "none";
  pattern?: string;
  spark?: number[];
  // commodity extras
  d5_pct?: string;
  d20_pct?: string;
  yoy_pct?: string;
  error?: string;
}

interface Assessment {
  regime: string;
  regime_level: "extreme" | "notable" | "none";
  regime_read: string;
  headwinds: string[];
  tailwinds: string[];
  signals?: string[];
  fed_target?: string;
  goldilocks_check?: {
    growth_slowing: boolean;
    employment_stable: boolean;
    no_recession: boolean;
  };
}

interface GrowthMetrics {
  updated_at: string;
  inflation: Record<string, MetricCard>;
  energy:    Record<string, MetricCard>;
  growth:    Record<string, MetricCard>;
  pipe:      Assessment;
  city:      Assessment;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 min — data is 4hr cached

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
  const w = 72, h = 24, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 0.01;
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

// ─── Regime Banner ────────────────────────────────────────────────────────────

function RegimeBanner({ assessment, icon }: { assessment: Assessment; icon: string }) {
  const level = assessment.regime_level;
  const color = alertColor(level);
  return (
    <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: color + "44", background: alertBg(level) }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">{icon}</div>
          <div className="text-2xl font-mono" style={{ color }}>{assessment.regime}</div>
        </div>
        {"fed_target" in assessment && assessment.fed_target && (
          <div className="text-[10px] font-mono text-slate-600 text-right">
            Fed target: {assessment.fed_target}
          </div>
        )}
        {"goldilocks_check" in assessment && assessment.goldilocks_check && (
          <div className="flex gap-3 text-[10px] font-mono">
            {Object.entries(assessment.goldilocks_check).map(([k, v]) => (
              <span key={k} style={{ color: v ? "#6A9A6A" : "#E05252" }}>
                {v ? "✓" : "✗"} {k.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{assessment.regime_read}</p>
      {(assessment.headwinds.length > 0 || assessment.tailwinds.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Headwinds</div>
            {assessment.headwinds.length > 0
              ? assessment.headwinds.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="text-[10px] mt-0.5" style={{ color: "#E05252" }}>▼</span>
                    <span className="text-xs text-slate-400">{h}</span>
                  </div>
                ))
              : <div className="text-xs text-slate-700">None active</div>}
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Tailwinds</div>
            {assessment.tailwinds.length > 0
              ? assessment.tailwinds.map((t, i) => (
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

// ─── Inflation Metric Card ────────────────────────────────────────────────────

function InflationCard({ card, name }: { card: MetricCard; name: string }) {
  const level = card.alert_level;
  const color = alertColor(level);
  if (card.error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">{name}</div>
        <div className="text-sm text-red-400 font-mono">{card.error}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{name}</div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{card.city_label}</div>
        </div>
        <Sparkline data={card.spark ?? []} color={color} />
      </div>
      <div className="font-mono text-3xl" style={{ color }}>{card.current}</div>
      {card.target && card.target !== "—" && (
        <div className="text-[10px] font-mono text-slate-600">Target: {card.target}</div>
      )}
      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
          <span>historical percentile</span>
          <span>{card.percentile != null ? `${card.percentile}th` : "—"}</span>
        </div>
        <PercentileBar value={card.percentile} />
      </div>
      <div className="border-t border-slate-900 pt-3 space-y-1.5 text-xs">
        {card.mom && <div className="flex justify-between"><span className="text-slate-600 font-mono">MoM</span><span className="font-mono text-slate-400">{card.mom}</span></div>}
        {card.yoy && card.yoy !== "—" && <div className="flex justify-between"><span className="text-slate-600 font-mono">YoY</span><span className="font-mono text-slate-400">{card.yoy}</span></div>}
        {card.latest_date && <div className="flex justify-between"><span className="text-slate-600 font-mono">as of</span><span className="font-mono text-slate-500">{card.latest_date}</span></div>}
      </div>
      <Badge level={level} label={card.alert} />
      {card.pattern && <p className="text-[11px] text-slate-600">{card.pattern}</p>}
    </div>
  );
}

// ─── Growth Metric Card ───────────────────────────────────────────────────────

function GrowthCard({ card, name }: { card: MetricCard; name: string }) {
  const level = card.alert_level;
  const color = alertColor(level);
  if (card.error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">{name}</div>
        <div className="text-sm text-red-400 font-mono">{card.error}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{name}</div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{card.city_label}</div>
        </div>
        <Sparkline data={card.spark ?? []} color={color} />
      </div>
      <div className="font-mono text-2xl" style={{ color }}>{card.current}</div>
      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
          <span>percentile</span>
          <span>{card.percentile != null ? `${card.percentile}th` : "—"}</span>
        </div>
        <PercentileBar value={card.percentile} />
      </div>
      <div className="border-t border-slate-900 pt-2 space-y-1 text-xs">
        {card.mom && <div className="flex justify-between"><span className="text-slate-600 font-mono">chg</span><span className="font-mono text-slate-400">{card.mom}</span></div>}
        {card.yoy && <div className="flex justify-between"><span className="text-slate-600 font-mono">YoY</span><span className="font-mono text-slate-400">{card.yoy}</span></div>}
        {card.latest_date && <div className="flex justify-between"><span className="text-slate-600 font-mono">as of</span><span className="font-mono text-slate-500">{card.latest_date}</span></div>}
      </div>
      <Badge level={level} label={card.alert} />
    </div>
  );
}

// ─── Energy Card ──────────────────────────────────────────────────────────────

function EnergyCard({ card, name }: { card: MetricCard; name: string }) {
  const level = card.alert_level;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{name}</div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{card.city_label}</div>
        </div>
        <Sparkline data={card.spark ?? []} color={alertColor(level)} />
      </div>
      <div className="font-mono text-3xl text-slate-100">{card.current}</div>
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
        {card.latest_date && <div className="flex justify-between"><span className="text-slate-600 font-mono">as of</span><span className="font-mono text-slate-500">{card.latest_date}</span></div>}
      </div>
      <Badge level={level} label={card.alert} />
    </div>
  );
}

// ─── Metaphor Reference Table ─────────────────────────────────────────────────

function MetaphorTable() {
  const inflation_items = [
    { metric: "CPI / Core CPI",    metaphor: "Headline & core pipe temperature",  signal: "Rising = pipes overheating. Cooling = easing conditions." },
    { metric: "PCE / Core PCE",    metaphor: "Fed's primary thermometer",          signal: "Core PCE is the Fed's actual target. >2% = can't ease." },
    { metric: "PPI",               metaphor: "Upstream pipe pressure",             signal: "PPI leads CPI by ~3 months. Rising PPI = CPI pressure ahead." },
    { metric: "Wages",             metaphor: "Labor cost feeding into temperature", signal: "Wage spiral is the stickiest inflation. Hard to cool." },
    { metric: "Breakevens",        metaphor: "Market's temperature forecast",       signal: "Rising = market doubts cooling. Anchored = credible disinflationary path." },
    { metric: "Rent / OER",        metaphor: "Housing pipe (stickiest section)",    signal: "Rent is the last to cool. High weight in CPI (~33%)." },
    { metric: "WTI / Gasoline",    metaphor: "Fuel feeding the pipes",             signal: "Energy is the most volatile. Soft energy = faster disinflation." },
  ];
  const growth_items = [
    { metric: "Payrolls",     metaphor: "City job creation engine",          signal: "<100K slowing. Negative = contraction. Key monthly signal." },
    { metric: "Unemployment", metaphor: "City unemployment rate",            signal: "Sahm Rule: rises >0.5pp from 12m low = recession signal." },
    { metric: "Claims",       metaphor: "Weekly job loss signal (fastest)",  signal: "Best high-frequency read on labor. >300K = serious deterioration." },
    { metric: "JOLTS",        metaphor: "City job vacancy board",           signal: "High = tight labor market. Falling fast = cooling." },
    { metric: "GDP",          metaphor: "City total output growth",          signal: "2 negative quarters = technical recession. Best viewed quarterly." },
    { metric: "ISM PMI",      metaphor: "Factory activity gauge",           signal: "<50 = contraction. <45 = significant weakness." },
    { metric: "Retail Sales", metaphor: "Consumer spending in the city",    signal: "70% of GDP is consumption. Soft retail = slowing economy." },
    { metric: "Sentiment",    metaphor: "Citizen confidence index",         signal: "Leading indicator. Recession-era lows precede spending cuts." },
  ];

  return (
    <div className="space-y-4">
      {[
        { title: "Inflation — Pipe Temperature", items: inflation_items },
        { title: "Growth — City Income", items: growth_items },
      ].map(({ title, items }) => (
        <div key={title} className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-900">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{title}</div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-900">
                <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal w-36">Metric</th>
                <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal">Metaphor</th>
                <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal">BTC Signal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.metric}
                  className={`border-b border-slate-900 hover:bg-slate-900 transition-colors ${i === items.length - 1 ? "border-b-0" : ""}`}>
                  <td className="px-5 py-3 font-mono text-slate-300 whitespace-nowrap">{item.metric}</td>
                  <td className="px-5 py-3 font-mono text-[11px]" style={{ color: "#D9A84D88" }}>{item.metaphor}</td>
                  <td className="px-5 py-3 text-slate-500">{item.signal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GrowthInflationDashboard() {
  const [data, setData]               = useState<GrowthMetrics | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API}/growth/metrics`);
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const json: GrowthMetrics = await res.json();
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
    await fetch(`${API}/growth/cache/flush`);
    fetchAll();
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [fetchAll]);

  const inf = data?.inflation ?? {};
  const eng = data?.energy   ?? {};
  const grw = data?.growth   ?? {};

  return (
    <main className="min-h-screen p-6"
      style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <DashboardNav
          current="growth"
          title="Growth &amp; Inflation"
          lastUpdated={lastUpdated}
          onFlush={flushCache}
        />

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — check backend and ensure /growth/metrics is reachable.
          </div>
        )}
        {loading && !data && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Reading pipe temperature and city income…
          </div>
        )}

        {data && (
          <>
            {/* ── I. Pipe Temperature ────────────────────────────────────── */}
            <section>
              <SectionLabel num="I" title="Pipe Temperature" subtitle="Inflation regime assessment · Fed policy space" />
              <RegimeBanner assessment={data.pipe} icon="🌡 Inflation · Pipe Temperature" />
            </section>

            {/* ── II. Core Inflation ─────────────────────────────────────── */}
            <section>
              <SectionLabel num="II" title="Core Inflation" subtitle="CPI · Core CPI · PCE · Core PCE · FRED monthly" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <InflationCard card={inf.cpi      ?? { key:"cpi",      city_label:"", current:"—", alert:"—", alert_level:"none" }} name="CPI" />
                <InflationCard card={inf.core_cpi ?? { key:"core_cpi", city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Core CPI" />
                <InflationCard card={inf.pce      ?? { key:"pce",      city_label:"", current:"—", alert:"—", alert_level:"none" }} name="PCE" />
                <InflationCard card={inf.core_pce ?? { key:"core_pce", city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Core PCE ★" />
              </div>
              <p className="text-[11px] text-slate-700 mt-2 font-mono">★ Fed's primary inflation target · 2.0%</p>
            </section>

            {/* ── III. Producer & Wage Pressure ──────────────────────────── */}
            <section>
              <SectionLabel num="III" title="Producer & Wage Pressure" subtitle="PPI · Average Hourly Earnings · upstream inputs" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InflationCard card={inf.ppi   ?? { key:"ppi",   city_label:"", current:"—", alert:"—", alert_level:"none" }} name="PPI Final Demand" />
                <InflationCard card={inf.wages ?? { key:"wages", city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Avg Hourly Earnings" />
              </div>
              <div className="mt-3 rounded-lg border border-slate-800 px-4 py-3 text-xs text-slate-600">
                PPI leads CPI by approximately 3 months — upstream price pressures eventually flow into consumer prices.
                Wage growth &gt;4% sustained historically makes returning core inflation to 2% very difficult.
              </div>
            </section>

            {/* ── IV. Inflation Expectations ─────────────────────────────── */}
            <section>
              <SectionLabel num="IV" title="Inflation Expectations" subtitle="5Y · 10Y breakevens · market's thermometer forecast · FRED daily" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InflationCard card={inf.be_5y  ?? { key:"be_5y",  city_label:"", current:"—", alert:"—", alert_level:"none" }} name="5Y Breakeven" />
                <InflationCard card={inf.be_10y ?? { key:"be_10y", city_label:"", current:"—", alert:"—", alert_level:"none" }} name="10Y Breakeven" />
              </div>
              <div className="mt-3 rounded-lg border border-slate-800 px-4 py-3 text-xs text-slate-600">
                <span className="text-slate-400">Breakeven = nominal Treasury yield − TIPS yield</span>
                {" — "}the market's best guess at average inflation over the period.
                Rising breakevens = market doubts the cooling narrative. Anchored breakevens = Fed credibility intact.
                <span className="block mt-1 text-slate-700">
                  Note: Inflation swaps data requires Bloomberg Terminal access. Breakevens are the best free-tier substitute.
                </span>
              </div>
            </section>

            {/* ── V. Housing & Rent Inflation ────────────────────────────── */}
            <section>
              <SectionLabel num="V" title="Housing & Rent Inflation" subtitle="Rent of primary residence · OER · stickiest pipes · FRED monthly" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InflationCard card={inf.rent ?? { key:"rent", city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Rent (Primary Residence)" />
                <InflationCard card={inf.oer  ?? { key:"oer",  city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Owners' Equivalent Rent" />
              </div>
              <div className="mt-3 rounded-lg border border-slate-800 px-4 py-3 text-xs text-slate-600">
                Shelter accounts for ~33% of CPI weight — the single largest component.
                OER (owners' equivalent rent) lags real-time asking rents by 12–18 months.
                Once rent inflation finally cools in CPI, it often stays low — this is both the stickiest pipe and eventually the biggest disinflationary force.
              </div>
            </section>

            {/* ── VI. Energy ─────────────────────────────────────────────── */}
            <section>
              <SectionLabel num="VI" title="Energy Inputs" subtitle="WTI crude · retail gasoline · fuel cost to pipes · FRED" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EnergyCard card={eng.oil      ?? { key:"oil",      city_label:"", current:"—", alert:"—", alert_level:"none" }} name="WTI Crude Oil" />
                <EnergyCard card={eng.gasoline ?? { key:"gasoline", city_label:"", current:"—", alert:"—", alert_level:"none" }} name="US Retail Gasoline" />
              </div>
            </section>

            {/* ── VII. City Income ───────────────────────────────────────── */}
            <section>
              <SectionLabel num="VII" title="City Income" subtitle="Growth regime assessment · recession / goldilocks / slowdown" />
              <RegimeBanner assessment={data.city} icon="🏙 Growth & Employment · City Income" />
            </section>

            {/* ── VIII. Labor Market ─────────────────────────────────────── */}
            <section>
              <SectionLabel num="VIII" title="Labor Market" subtitle="Payrolls · Unemployment · Claims · JOLTS · FRED" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <GrowthCard card={grw.payrolls    ?? { key:"payrolls",   city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Nonfarm Payrolls" />
                <GrowthCard card={grw.unrate      ?? { key:"unrate",     city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Unemployment Rate" />
                <GrowthCard card={grw.claims      ?? { key:"claims",     city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Initial Claims" />
                <GrowthCard card={grw.jolts       ?? { key:"jolts",      city_label:"", current:"—", alert:"—", alert_level:"none" }} name="JOLTS Openings" />
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <GrowthCard card={grw.cont_claims ?? { key:"cont_claims", city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Continuing Claims" />
                <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-600 flex flex-col justify-center gap-1.5">
                  <div className="text-slate-500 font-mono uppercase tracking-widest text-[10px]">Sahm Rule</div>
                  <div>If the 3-month average unemployment rate rises ≥0.5pp above its 12-month low, a recession has likely begun.</div>
                  <div className="text-slate-700">Historically triggered before the NBER formally declares recessions.</div>
                </div>
              </div>
            </section>

            {/* ── IX. Output & Activity ──────────────────────────────────── */}
            <section>
              <SectionLabel num="IX" title="Output & Activity" subtitle="GDP · ISM · Retail Sales · Consumer Sentiment · FRED" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <GrowthCard card={grw.gdp       ?? { key:"gdp",       city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Real GDP Growth" />
                <GrowthCard card={grw.ism       ?? { key:"ism",       city_label:"", current:"—", alert:"—", alert_level:"none" }} name="ISM Mfg PMI" />
                <GrowthCard card={grw.retail    ?? { key:"retail",    city_label:"", current:"—", alert:"—", alert_level:"none" }} name="Retail Sales" />
                <GrowthCard card={grw.sentiment ?? { key:"sentiment", city_label:"", current:"—", alert:"—", alert_level:"none" }} name="UMich Sentiment" />
              </div>
              <div className="mt-3">
                <GrowthCard card={grw.inf_exp ?? { key:"inf_exp", city_label:"", current:"—", alert:"—", alert_level:"none" }} name="1Y Inflation Expectations (UMich)" />
              </div>
            </section>

            {/* ── X. Metaphor Reference ──────────────────────────────────── */}
            <section>
              <SectionLabel num="X" title="Metaphor Reference" subtitle="Pipe temperature · city income" />
              <MetaphorTable />
            </section>
          </>
        )}

        {/* ── Footer ── */}
        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>Data: FRED API · CPI · PCE · PPI · wages · breakevens · rent · WTI · gasoline · payrolls · claims · GDP · ISM · retail · sentiment</span>
          <span>·</span>
          <span>Cache: 4hr</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>
      </div>
    </main>
  );
}
