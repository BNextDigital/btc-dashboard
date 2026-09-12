"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardNav from "../components/DashboardNav";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000;

type AnyRecord = Record<string, unknown>;

type Signal = {
  label: string;
  detail: string;
  score: number;
  weight: number;
  available: boolean;
  freshness: "FAST" | "MARKET" | "HOURLY" | "SLOW" | "MISSING";
};

type Stage = {
  key: "powder" | "spark" | "cascade" | "exhaustion";
  label: string;
  question: string;
  score: number;
  coverage: number;
  signals: Signal[];
};

type Snapshot = {
  metrics: AnyRecord;
  macro: AnyRecord;
  equity: AnyRecord;
  leading: AnyRecord;
};

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? value as AnyRecord : {};
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[$,%+xBMTbp\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function pctString(value: unknown): number | null {
  if (typeof value !== "string") return num(value);
  const match = value.match(/([+-]?\d+(?:\.\d+)?)%/);
  return match ? Number(match[1]) : null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function metric(metrics: AnyRecord, key: string): AnyRecord {
  return asRecord(metrics[key]);
}

function scoreFromPercentile(value: unknown, start = 60, end = 90): number | null {
  const v = num(value);
  if (v == null) return null;
  return clamp(((v - start) / (end - start)) * 100);
}

function signedStress(value: number | null, mild: number, severe: number): number | null {
  if (value == null) return null;
  return clamp(((value - mild) / (severe - mild)) * 100);
}

function signal(
  label: string,
  detail: string,
  score: number | null,
  weight: number,
  freshness: Signal["freshness"],
): Signal {
  return {
    label,
    detail,
    score: score == null ? 0 : clamp(score),
    weight,
    available: score != null,
    freshness: score == null ? "MISSING" : freshness,
  };
}

function stage(key: Stage["key"], label: string, question: string, signals: Signal[]): Stage {
  const available = signals.filter(s => s.available);
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const availableWeight = available.reduce((sum, s) => sum + s.weight, 0);
  const weighted = available.reduce((sum, s) => sum + s.score * s.weight, 0);
  return {
    key,
    label,
    question,
    score: availableWeight ? Math.round(weighted / availableWeight) : 0,
    coverage: totalWeight ? Math.round((availableWeight / totalWeight) * 100) : 0,
    signals,
  };
}

function stateColor(state: string) {
  if (state === "CASCADE") return "#E05252";
  if (state === "TRIGGERED") return "#D9833B";
  if (state === "FRAGILE") return "#D9A84D";
  if (state === "EXHAUSTION") return "#6A9A6A";
  return "#7A7A78";
}

function scoreColor(score: number) {
  if (score >= 75) return "#E05252";
  if (score >= 55) return "#D9833B";
  if (score >= 35) return "#D9A84D";
  return "#6A9A6A";
}

function SectionLabel({ num: n, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-4 pb-3 border-b border-slate-900 gap-4">
      <div className="flex items-baseline gap-3">
        <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "#D9A84D", fontSize: 22 }}>{n}</span>
        <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: "#E8E6E0", fontSize: 20 }}>{title}</span>
      </div>
      {subtitle && <span className="text-[10px] tracking-widest uppercase font-mono text-slate-600 text-right">{subtitle}</span>}
    </div>
  );
}

function Meter({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 bg-slate-900 overflow-hidden">
      <div className="h-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
    </div>
  );
}

function StageCard({ data }: { data: Stage }) {
  const color = scoreColor(data.score);
  return (
    <div className="border border-slate-800 bg-slate-950 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600">{data.label}</div>
          <div className="text-xs text-slate-500 mt-1 leading-relaxed">{data.question}</div>
        </div>
        <div className="font-mono text-2xl" style={{ color }}>{data.score}</div>
      </div>
      <Meter score={data.score} color={color} />
      <div className="flex justify-between text-[10px] font-mono text-slate-700">
        <span>0</span><span>{data.coverage}% input coverage</span><span>100</span>
      </div>
    </div>
  );
}

function SignalTable({ data }: { data: Stage }) {
  return (
    <div className="border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-slate-500">{data.label}</div>
          <div className="text-[11px] text-slate-700 mt-1">{data.question}</div>
        </div>
        <div className="text-xs font-mono text-slate-600">coverage {data.coverage}%</div>
      </div>
      {data.signals.map((s) => (
        <div key={s.label} className="grid grid-cols-[1fr_auto] md:grid-cols-[180px_1fr_90px_70px] gap-3 px-4 py-3 border-b border-slate-900 last:border-b-0 items-center">
          <div className="text-xs text-slate-300">{s.label}</div>
          <div className="text-[11px] font-mono text-slate-600 hidden md:block">{s.detail}</div>
          <div className="text-right font-mono text-xs" style={{ color: s.available ? scoreColor(s.score) : "#4A4A4C" }}>
            {s.available ? `${Math.round(s.score)}/100` : "unavailable"}
          </div>
          <div className="text-right text-[9px] font-mono text-slate-700">{s.freshness}</div>
        </div>
      ))}
    </div>
  );
}

export default function PowderKegPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchAll = useCallback(async () => {
    try {
      const paths = ["/metrics", "/macro/metrics", "/equity/metrics", "/leading/all"];
      const responses = await Promise.all(paths.map(path => fetch(`${API}${path}`, { cache: "no-store" })));
      const failed = responses.findIndex(r => !r.ok);
      if (failed >= 0) throw new Error(`${paths[failed]} returned ${responses[failed].status}`);
      const [metrics, macro, equity, leading] = await Promise.all(responses.map(r => r.json()));
      setData({ metrics, macro, equity, leading });
      const stamps = [macro?.updated_at, equity?.updated_at, leading?.updated_at].filter(Boolean);
      const newest = stamps.length ? new Date(stamps.sort().at(-1) as string) : new Date();
      setLastUpdated(newest.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchAll]);

  const model = useMemo(() => {
    if (!data) return null;

    const oi = metric(data.metrics, "open_interest");
    const funding = metric(data.metrics, "funding");
    const volume = metric(data.metrics, "volume");
    const priceMove = metric(data.metrics, "price_move");
    const etfFlow = metric(data.metrics, "etf_flow");
    const cmeBasis = metric(data.metrics, "cme_basis");

    const macro = data.macro;
    const yields = asRecord(macro.yields);
    const twoY = asRecord(yields["2y"]);
    const dxy = asRecord(macro.dxy);
    const vix = asRecord(macro.vix);
    const hy = asRecord(macro.hy_oas);
    const nasdaq = asRecord(macro.nasdaq100);

    const equity = data.equity;
    const breadth = asRecord(equity.breadth);

    const leading = data.leading;
    const options = asRecord(leading.options);
    const enhancedBasis = asRecord(leading.basis_enhanced);
    const cot = asRecord(leading.cot);

    const oiPct = num(oi.percentile);
    const oi7 = pctString(oi.d7);
    const fundingPct = num(funding.percentile);
    const basisPct = num(cmeBasis.percentile) ?? num(enhancedBasis.percentile);
    const breadthPct = num(breadth.percentile);
    const breadthLabel = String(breadth.label ?? "").toLowerCase();
    const priceDaily = pctString(priceMove.current) ?? pctString(priceMove.d7);
    const twoY1d = num(twoY.d1_chg);
    const dxy5 = num(dxy.d5_chg);
    const vix5 = num(vix.d5_chg) ?? pctString(vix.d5_chg);
    const hy5 = num(hy.d5_chg);
    const nasdaqVs50 = num(nasdaq.pct_from_sma50);
    const volumeRatio = num(volume.current) ?? num(volume.ratio_30d);

    const powder = stage("powder", "POWDER", "How much combustible leverage and fragility is already present?", [
      signal("Open interest", oiPct == null ? "OI percentile unavailable" : `${Math.round(oiPct)}th percentile`, scoreFromPercentile(oiPct, 65, 92), 3, "FAST"),
      signal("Funding", fundingPct == null ? "Funding percentile unavailable" : `${Math.round(fundingPct)}th percentile`, scoreFromPercentile(fundingPct, 65, 92), 2, "FAST"),
      signal("Futures basis", basisPct == null ? "Basis percentile unavailable" : `${Math.round(basisPct)}th percentile`, scoreFromPercentile(basisPct, 65, 92), 2, "FAST"),
      signal("Equity breadth", breadth.label ? String(breadth.label) : "Breadth unavailable", breadthPct == null ? null : clamp(100 - breadthPct), 2, "MARKET"),
      signal("Options structure", options.alert ? String(options.alert) : "Options signal unavailable", options.alert_level === "extreme" ? 90 : options.alert_level === "notable" ? 65 : options.alert_level ? 20 : null, 1, "FAST"),
      signal("COT positioning", cot.alert ? String(cot.alert) : "COT unavailable", cot.alert_level === "extreme" ? 85 : cot.alert_level === "notable" ? 60 : cot.alert_level ? 20 : null, 0.5, "SLOW"),
    ]);

    const spark = stage("spark", "SPARK", "Has a macro, volatility, or price trigger begun to ignite the fragility?", [
      signal("BTC price shock", priceDaily == null ? "Price move unavailable" : `${priceDaily >= 0 ? "+" : ""}${priceDaily.toFixed(2)}%`, priceDaily == null ? null : clamp((-priceDaily - 1) / 5 * 100), 3, "FAST"),
      signal("2Y yield shock", twoY1d == null ? "2Y daily change unavailable" : `${twoY1d >= 0 ? "+" : ""}${twoY1d.toFixed(3)}`, signedStress(twoY1d, 0.02, 0.12), 2, "MARKET"),
      signal("Dollar pressure", dxy5 == null ? "DXY 5d change unavailable" : `${dxy5 >= 0 ? "+" : ""}${dxy5.toFixed(2)}`, signedStress(dxy5, 0.3, 2.5), 1.5, "MARKET"),
      signal("Nasdaq trend", nasdaqVs50 == null ? "Nasdaq vs SMA50 unavailable" : `${nasdaqVs50 >= 0 ? "+" : ""}${nasdaqVs50.toFixed(1)}% vs SMA50`, nasdaqVs50 == null ? null : clamp((-nasdaqVs50) / 8 * 100), 2, "MARKET"),
      signal("VIX acceleration", vix5 == null ? "VIX 5d change unavailable" : `${vix5 >= 0 ? "+" : ""}${vix5.toFixed(2)}`, signedStress(vix5, 1, 12), 2, "MARKET"),
    ]);

    const priceDown = priceDaily != null && priceDaily < 0;
    const oiDown = oi7 != null && oi7 < 0;
    const cascadeCore = priceDaily == null || oi7 == null ? null : priceDown && oiDown ? clamp((Math.abs(priceDaily) * 14) + (Math.abs(oi7) * 4)) : priceDown ? 35 : 5;

    const cascade = stage("cascade", "CASCADE", "Has the trigger become broad, urgent, and mechanically forced?", [
      signal("Price ↓ + OI ↓", oi7 == null ? "Waiting for reliable OI history" : `BTC ${priceDaily?.toFixed(2) ?? "–"}% · OI ${oi7 >= 0 ? "+" : ""}${oi7.toFixed(1)}%`, cascadeCore, 4, "FAST"),
      signal("Volume urgency", volumeRatio == null ? "Volume ratio unavailable" : `${volumeRatio.toFixed(2)}x`, volumeRatio == null ? null : clamp((volumeRatio - 1) / 1.2 * 100), 2, "FAST"),
      signal("VIX acceleration", vix5 == null ? "VIX change unavailable" : `${vix5 >= 0 ? "+" : ""}${vix5.toFixed(2)}`, signedStress(vix5, 1, 12), 2, "MARKET"),
      signal("Breadth deterioration", breadth.label ? String(breadth.label) : "Breadth unavailable", breadthPct == null ? null : clamp(100 - breadthPct), 2, "MARKET"),
      signal("Credit widening", hy5 == null ? "HY OAS change unavailable" : `${hy5 >= 0 ? "+" : ""}${hy5.toFixed(0)}bp`, signedStress(hy5, 5, 60), 2, "SLOW"),
      signal("Liquidations", "Liquidation feed not integrated yet", null, 4, "MISSING"),
    ]);

    const fundingNeutral = fundingPct == null ? null : clamp(100 - Math.abs(fundingPct - 50) * 2);
    const vixRollover = vix5 == null ? null : clamp((-vix5) / 8 * 100);
    const creditStable = hy5 == null ? null : clamp((-hy5 + 5) / 30 * 100);
    const etfAlert = String(etfFlow.alert ?? "").toLowerCase();
    const etfImprove = etfFlow.alert == null ? null : etfAlert.includes("outflow") ? 15 : etfAlert.includes("acceleration") ? 70 : 50;

    const exhaustion = stage("exhaustion", "EXHAUSTION", "Is forced selling losing intensity and leverage resetting?", [
      signal("OI washout", oi7 == null ? "Waiting for reliable OI history" : `${oi7 >= 0 ? "+" : ""}${oi7.toFixed(1)}%`, oi7 == null ? null : clamp((-oi7 - 2) / 12 * 100), 4, "FAST"),
      signal("Funding normalization", fundingPct == null ? "Funding percentile unavailable" : `${Math.round(fundingPct)}th percentile`, fundingNeutral, 2, "FAST"),
      signal("VIX rollover", vix5 == null ? "VIX change unavailable" : `${vix5 >= 0 ? "+" : ""}${vix5.toFixed(2)}`, vixRollover, 2, "MARKET"),
      signal("Credit stabilization", hy5 == null ? "HY OAS change unavailable" : `${hy5 >= 0 ? "+" : ""}${hy5.toFixed(0)}bp`, creditStable, 1.5, "SLOW"),
      signal("ETF flow improvement", etfFlow.alert ? String(etfFlow.alert) : "ETF flow unavailable", etfImprove, 1.5, "HOURLY"),
      signal("Liquidation decay", "Liquidation feed not integrated yet", null, 4, "MISSING"),
    ]);

    const stages = [powder, spark, cascade, exhaustion];
    let state = "CALM";
    if (cascade.score >= 60 && cascade.coverage >= 45) state = "CASCADE";
    else if (exhaustion.score >= 60 && cascade.score >= 35 && exhaustion.coverage >= 45) state = "EXHAUSTION";
    else if (spark.score >= 50 && powder.score >= 45) state = "TRIGGERED";
    else if (powder.score >= 55) state = "FRAGILE";

    const coverage = Math.round(stages.reduce((sum, s) => sum + s.coverage, 0) / stages.length);
    const confidence = coverage >= 80 ? "HIGH" : coverage >= 60 ? "MEDIUM" : "LOW";

    const allSignals = stages.flatMap(s => s.signals.map(sig => ({ ...sig, stage: s.label })));
    const supporting = allSignals.filter(s => s.available).sort((a, b) => b.score - a.score).slice(0, 5);
    const contradicting = allSignals.filter(s => s.available).sort((a, b) => a.score - b.score).slice(0, 4);

    const interpretation = state === "CASCADE"
      ? "Forced-selling conditions are present across multiple channels. Watch whether leverage contraction and volatility pressure begin to decay."
      : state === "EXHAUSTION"
      ? "Stress remains elevated, but several reset signals suggest forced selling may be losing intensity."
      : state === "TRIGGERED"
      ? "A trigger is active against a fragile backdrop. The key question is whether leverage and cross-market stress begin reinforcing each other."
      : state === "FRAGILE"
      ? "Fuel is present, but the dashboard does not yet show a convincing ignition-and-cascade sequence."
      : "No broad forced-selling sequence is currently visible from the available inputs.";

    return { stages, state, coverage, confidence, supporting, contradicting, interpretation };
  }, [data]);

  return (
    <main className="min-h-screen p-6" style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardNav current="powder-keg" title="Powder Keg" lastUpdated={lastUpdated} />

        {error && <div className="border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400 font-mono">{error}</div>}
        {loading && !data && <div className="text-center py-24 text-slate-700 font-mono text-sm animate-pulse">Assembling market structure…</div>}

        {model && (
          <>
            <section className="border border-slate-800 bg-slate-950 p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="max-w-3xl">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-600 mb-2">Market Structure State</div>
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <div className="text-4xl font-mono tracking-tight" style={{ color: stateColor(model.state) }}>{model.state}</div>
                    <div className="text-xs font-mono text-slate-600">{model.confidence} CONFIDENCE · {model.coverage}% MODEL COVERAGE</div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mt-4">{model.interpretation}</p>
                  <p className="text-xs text-slate-700 mt-3">This is a market-structure risk state, not an automatic buy or sell signal.</p>
                </div>
                <div className="min-w-[260px] border border-slate-900 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-3">Sequence</div>
                  <div className="font-mono text-xs text-slate-500 leading-7">FRAGILITY → TRIGGER → FORCED SELLING → EXHAUSTION</div>
                </div>
              </div>
            </section>

            <section>
              <SectionLabel num="I" title="State Console" subtitle="Four independent readings · 0–100" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {model.stages.map(s => <StageCard key={s.key} data={s} />)}
              </div>
            </section>

            <section>
              <SectionLabel num="II" title="Evidence" subtitle="What is pushing the state higher or lower" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="border border-slate-800 bg-slate-950 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-3">Supporting stress</div>
                  {model.supporting.map((s, i) => (
                    <div key={`${s.stage}-${s.label}-${i}`} className="flex justify-between gap-4 py-2 border-b border-slate-900 last:border-b-0">
                      <div><span className="text-xs text-slate-300">{s.label}</span><span className="text-[10px] font-mono text-slate-700 ml-2">{s.stage}</span></div>
                      <span className="font-mono text-xs" style={{ color: scoreColor(s.score) }}>{Math.round(s.score)}</span>
                    </div>
                  ))}
                </div>
                <div className="border border-slate-800 bg-slate-950 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-3">Contradicting / stabilizing</div>
                  {model.contradicting.map((s, i) => (
                    <div key={`${s.stage}-${s.label}-${i}`} className="flex justify-between gap-4 py-2 border-b border-slate-900 last:border-b-0">
                      <div><span className="text-xs text-slate-300">{s.label}</span><span className="text-[10px] font-mono text-slate-700 ml-2">{s.stage}</span></div>
                      <span className="font-mono text-xs text-green-500">{Math.round(s.score)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <SectionLabel num="III" title="Signal Matrix" subtitle="Value · contribution · freshness" />
              {model.stages.map(s => <SignalTable key={s.key} data={s} />)}
            </section>

            <section>
              <SectionLabel num="IV" title="Known Gaps" subtitle="Missing data lowers coverage; it is never scored as zero" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  ["Liquidations", "Needed for direct forced-selling confirmation and liquidation-spike decay."],
                  ["VIX term structure", "VIX9D / VIX / VIX3M will improve short-vol and panic-regime detection."],
                  ["10Y real yield", "Needed to separate nominal-rate pressure from real-rate tightening."],
                ].map(([title, text]) => (
                  <div key={title} className="border border-slate-800 bg-slate-950 p-4">
                    <div className="text-xs font-mono text-slate-400">{title}</div>
                    <div className="text-xs text-slate-600 leading-relaxed mt-2">{text}</div>
                    <div className="text-[9px] font-mono text-slate-700 mt-3">NOT YET IN MODEL</div>
                  </div>
                ))}
              </div>
            </section>

            <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex flex-wrap gap-4">
              <span>Inputs: BTC metrics · Macro · Equity breadth · Leading signals</span>
              <span>·</span>
              <span>Scores are transparent weighted contributions, not trade instructions.</span>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
