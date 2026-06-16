"use client";

/**
 * app/commodities/page.tsx — Commodities: Energy & Materials
 *
 * "Oil reflects energy demand or supply shocks.
 *  Copper reflects industrial activity.
 *  Gold reflects insurance demand or real yield conditions."
 *
 * Sections:
 *   I.   Commodity Assessment — BTC macro read
 *   II.  Energy Complex — WTI, Natural Gas, Gasoline
 *   III. Metals — Gold, Silver, Copper
 *   IV.  Copper / Gold Ratio — growth vs insurance signal
 *   V.   Grains — Wheat, Corn, Soybeans
 *   VI.  Metaphor Reference
 *
 * Data: GET /commodities/metrics (commodity_routes.py → yFinance)
 * Cache: 10 min backend
 */

import { useEffect, useState, useCallback } from "react";
import DashboardNav from "@/components/DashboardNav";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommodityCard {
  key: string;
  name: string;
  ticker?: string;
  metaphor?: string;
  btc_note?: string;
  current?: string;
  current_raw?: number;
  d5_pct?: string;
  d20_pct?: string;
  yoy_pct?: string;
  percentile?: number;
  alert?: string;
  alert_level?: "extreme" | "notable" | "none";
  pattern?: string;
  spark?: number[];
  error?: string;
}

interface CopperGold {
  ratio?: string;
  ratio_raw?: number;
  percentile?: number;
  spark?: number[];
  read?: string;
  alert_level?: "extreme" | "notable" | "none";
  note?: string;
}

interface EnergyComplex {
  read?: string;
  alert_level?: "extreme" | "notable" | "none";
  avg_percentile?: number;
}

interface Assessment {
  regime: string;
  regime_level: "extreme" | "notable" | "none";
  read: string;
  headwinds: string[];
  tailwinds: string[];
}

interface CommodityMetrics {
  updated_at:     string;
  energy:         Record<string, CommodityCard>;
  metals:         Record<string, CommodityCard>;
  grains:         Record<string, CommodityCard>;
  copper_gold:    CopperGold;
  energy_complex: EnergyComplex;
  assessment:     Assessment;
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

// ─── Assessment Banner ────────────────────────────────────────────────────────

function AssessmentBanner({ a }: { a: Assessment }) {
  const color = alertColor(a.regime_level);
  return (
    <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: color + "44", background: alertBg(a.regime_level) }}>
      <div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">⛏ Commodity Complex · BTC Macro Read</div>
        <div className="text-2xl font-mono" style={{ color }}>{a.regime}</div>
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

// ─── Commodity Card ───────────────────────────────────────────────────────────

function CommodityCardComp({ card, size = "normal" }: { card: CommodityCard; size?: "normal" | "large" }) {
  const level = card.alert_level ?? "none";
  const color = alertColor(level);
  const isSm  = size === "normal";

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
        {card.metaphor && <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>{card.metaphor}</div>}
      </div>
      <div className="flex items-end justify-between">
        <div className={`font-mono ${isSm ? "text-2xl" : "text-3xl"} text-slate-100`}>{card.current ?? "—"}</div>
        <Sparkline data={card.spark ?? []} color={color} />
      </div>
      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
          <span>52w percentile</span>
          <span style={{ color }}>{card.percentile != null ? `${card.percentile}th` : "—"}</span>
        </div>
        <PercentileBar value={card.percentile} />
      </div>
      <div className="border-t border-slate-900 pt-3 space-y-1.5 text-xs">
        {card.d5_pct  && <div className="flex justify-between"><span className="text-slate-600 font-mono">5d</span><span className="font-mono text-slate-400">{card.d5_pct}</span></div>}
        {card.d20_pct && <div className="flex justify-between"><span className="text-slate-600 font-mono">20d</span><span className="font-mono text-slate-400">{card.d20_pct}</span></div>}
        {card.yoy_pct && <div className="flex justify-between"><span className="text-slate-600 font-mono">YoY</span><span className="font-mono text-slate-400">{card.yoy_pct}</span></div>}
      </div>
      <Badge level={level} label={card.alert} />
      {card.pattern && <p className="text-[11px] text-slate-600">{card.pattern}</p>}
      {card.btc_note && <p className="text-[10px] text-slate-700 border-t border-slate-900 pt-2">{card.btc_note}</p>}
    </div>
  );
}

// ─── Copper/Gold Ratio Panel ──────────────────────────────────────────────────

function CopperGoldPanel({ cg, copper, gold }: { cg: CopperGold; copper: CommodityCard; gold: CommodityCard }) {
  const level = cg.alert_level ?? "none";
  const color = alertColor(level);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Copper / Gold Ratio</div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: "#D9A84D88" }}>Industrial demand vs insurance demand</div>
        </div>
        <div className="flex items-center gap-3">
          {cg.spark && cg.spark.length > 1 && <Sparkline data={cg.spark} color={color} />}
          <div className="text-right">
            <div className="font-mono text-xl" style={{ color }}>{cg.ratio ?? "—"}</div>
            {cg.percentile != null && (
              <div className="text-[10px] font-mono text-slate-600">{cg.percentile}th pct (52w)</div>
            )}
          </div>
        </div>
      </div>
      {cg.percentile != null && (
        <div className="px-5 pt-3">
          <PercentileBar value={cg.percentile} />
        </div>
      )}
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">{cg.read}</p>
          {cg.note && <p className="text-[10px] text-slate-600">{cg.note}</p>}
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-mono">Copper</span>
            <span className="font-mono text-slate-300">{copper.current ?? "—"} <span style={{ color: alertColor(copper.alert_level) }}>({copper.percentile}th pct)</span></span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-mono">Gold</span>
            <span className="font-mono text-slate-300">{gold.current ?? "—"} <span style={{ color: alertColor(gold.alert_level) }}>({gold.percentile}th pct)</span></span>
          </div>
          <div className="border-t border-slate-900 pt-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 mb-1.5">
              <span style={{ color: "#6A9A6A" }}>▲ Rising ratio</span>
              <span>= growth confidence, industrial demand strong</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: "#E05252" }}>▼ Falling ratio</span>
              <span>= gold dominating, risk-off / growth fear</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Metaphor Reference ───────────────────────────────────────────────────────

function MetaphorRef() {
  const rows = [
    { commodity: "WTI Crude",    metaphor: "Energy demand / supply shock", signal: "Rising = inflationary pressure → Fed stays tight → BTC headwind. Falling = disinflationary." },
    { commodity: "Natural Gas",  metaphor: "Heating & power cost",         signal: "Energy cost input. Spike = adds to CPI stickiness." },
    { commodity: "Gold",         metaphor: "City vault / insurance",        signal: "Rising with BTC = anti-fiat narrative. Rising, BTC falling = pure risk-off." },
    { commodity: "Silver",       metaphor: "Industrial + monetary hybrid",  signal: "Outperforming gold = industrial demand healthy. Underperforming = risk-off." },
    { commodity: "Copper",       metaphor: "Industrial barometer (Dr. Cu)", signal: "Rising = global growth expanding. Falling = contraction warning." },
    { commodity: "Cu/Au Ratio",  metaphor: "Growth vs insurance ratio",    signal: "Falling ratio historically correlated with falling yields and risk-off." },
    { commodity: "Wheat",        metaphor: "Food cost pressure",           signal: "Food inflation is politically sensitive. High wheat → CPI upside risk." },
    { commodity: "Corn",         metaphor: "Agricultural input cost",      signal: "Broad agricultural / energy proxy (ethanol)." },
  ];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-900">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Commodity Metaphor Map — Energy & Materials</div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-900">
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal w-32">Commodity</th>
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal">Metaphor</th>
            <th className="text-left px-5 py-2 text-[10px] font-mono text-slate-600 uppercase font-normal">BTC Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.commodity} className={`border-b border-slate-900 hover:bg-slate-900 transition-colors ${i === rows.length - 1 ? "border-b-0" : ""}`}>
              <td className="px-5 py-3 font-mono text-slate-300 whitespace-nowrap">{r.commodity}</td>
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

export default function CommoditiesDashboard() {
  const [data, setData]               = useState<CommodityMetrics | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API}/commodities/metrics`);
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const json: CommodityMetrics = await res.json();
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
    await fetch(`${API}/commodities/cache/flush`);
    fetchAll();
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [fetchAll]);

  const en = data?.energy  ?? {};
  const mt = data?.metals  ?? {};
  const gr = data?.grains  ?? {};

  const blank = (key: string, name: string): CommodityCard => ({ key, name, current: "—", alert: "—", alert_level: "none" });

  return (
    <main className="min-h-screen p-6"
      style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <DashboardNav
          current="commodities"
          title="Commodities"
          lastUpdated={lastUpdated}
          onFlush={flushCache}
        />

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — check backend and ensure /commodities/metrics is reachable.
          </div>
        )}
        {loading && !data && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Checking energy prices and materials…
          </div>
        )}

        {data && (
          <>
            {/* ── I. Assessment ─────────────────────────────────────────── */}
            <section>
              <SectionLabel num="I" title="Commodity Assessment" subtitle="Energy & materials macro read · BTC context" />
              <AssessmentBanner a={data.assessment} />
            </section>

            {/* ── II. Energy Complex ────────────────────────────────────── */}
            <section>
              <SectionLabel num="II" title="Energy Complex" subtitle="WTI · Natural Gas · Gasoline · yFinance futures" />
              {data.energy_complex?.read && (
                <div className="mb-4 rounded-lg border px-4 py-3 text-xs"
                  style={{ borderColor: alertColor(data.energy_complex.alert_level) + "44",
                           background: alertBg(data.energy_complex.alert_level),
                           color: alertColor(data.energy_complex.alert_level) }}>
                  {data.energy_complex.read}
                  {data.energy_complex.avg_percentile != null && (
                    <span className="ml-2 text-slate-500">· avg {data.energy_complex.avg_percentile}th pct</span>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CommodityCardComp card={en.wti      ?? blank("wti",      "WTI Crude")} />
                <CommodityCardComp card={en.natgas   ?? blank("natgas",   "Natural Gas")} />
                <CommodityCardComp card={en.gasoline ?? blank("gasoline", "RBOB Gasoline")} />
              </div>
            </section>

            {/* ── III. Metals ───────────────────────────────────────────── */}
            <section>
              <SectionLabel num="III" title="Metals" subtitle="Gold · Silver · Copper · yFinance futures" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CommodityCardComp card={mt.gold   ?? blank("gold",   "Gold")}   size="large" />
                <CommodityCardComp card={mt.silver ?? blank("silver", "Silver")} />
                <CommodityCardComp card={mt.copper ?? blank("copper", "Copper")} />
              </div>
            </section>

            {/* ── IV. Copper/Gold Ratio ─────────────────────────────────── */}
            <section>
              <SectionLabel num="IV" title="Copper / Gold Ratio" subtitle="Industrial vs insurance demand · growth signal" />
              <CopperGoldPanel
                cg={data.copper_gold}
                copper={mt.copper ?? blank("copper", "Copper")}
                gold={mt.gold   ?? blank("gold",   "Gold")}
              />
            </section>

            {/* ── V. Grains ─────────────────────────────────────────────── */}
            <section>
              <SectionLabel num="V" title="Grains" subtitle="Wheat · Corn · Soybeans · food inflation signal · yFinance" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CommodityCardComp card={gr.wheat    ?? blank("wheat",    "Wheat")} />
                <CommodityCardComp card={gr.corn     ?? blank("corn",     "Corn")} />
                <CommodityCardComp card={gr.soybeans ?? blank("soybeans", "Soybeans")} />
              </div>
              <div className="mt-3 rounded-lg border border-slate-800 px-4 py-3 text-xs text-slate-600">
                Grain prices are a leading indicator of food CPI. Elevated grain prices flow into food-at-home costs with a 3–6 month lag. The 2022 grain spike (Ukraine war) was a key driver of the CPI overshoot.
              </div>
            </section>

            {/* ── VI. Metaphor Reference ────────────────────────────────── */}
            <section>
              <SectionLabel num="VI" title="Commodity Metaphor Map" subtitle="Energy & materials reference" />
              <MetaphorRef />
            </section>
          </>
        )}

        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>Data: yFinance futures · CL=F · NG=F · RB=F · GC=F · SI=F · HG=F · ZW=F · ZC=F · ZS=F</span>
          <span>·</span>
          <span>Cache: 10min</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>
      </div>
    </main>
  );
}
