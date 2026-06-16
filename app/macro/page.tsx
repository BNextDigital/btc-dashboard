"use client";

/**
 * app/macro/page.tsx — Macro Economic Dashboard
 *
 * Sections:
 *   I.   US Treasury Yields + curve shape
 *   II.  Risk Indicators — DXY, VIX, HY OAS
 *   III. Equities & Commodities — SMA analysis
 *   IV.  Metals — SMA analysis
 *   V.   Macro Causal Chain
 *
 * Data: GET /macro/metrics  (macro_routes.py → yFinance + FRED)
 * Cache: 5 min backend
 */

import { useEffect, useState, useCallback } from "react";
import DashboardNav from "@/components/DashboardNav";

// ─── Types ────────────────────────────────────────────────────────────────────

interface YieldTenor {
  label?: string;
  current?: number | null;
  d1_chg?: number | null;
  d5_chg?: number | null;
  percentile?: number | null;
  alert?: string;
}

interface EquitySMACard {
  current?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  pct_from_sma20?: number | null;
  pct_from_sma50?: number | null;
  pct_from_sma200?: number | null;
  percentile?: number | null;
  alert?: string;
  error?: string;
}

interface VolatilityCard {
  current?: number | null;
  d5_chg?: number | null;
  d20_chg?: number | null;
  percentile?: number | null;
  alert?: string;
  pattern?: string;
  error?: string;
}

interface MacroMetrics {
  updated_at?: string;
  yields?: Record<string, YieldTenor>;
  curve?: { spread_2y10y_bp?: number | null; label?: string };
  dxy?: VolatilityCard;
  vix?: VolatilityCard;
  hy_oas?: {
    current?: number | null;
    d5_chg?: number | null;
    d20_chg?: number | null;
    percentile?: number | null;
    alert?: string;
    error?: string;
  };
  nasdaq100?: EquitySMACard;
  vxn?: VolatilityCard;
  sp500?: EquitySMACard;
  brent?: EquitySMACard;
  gold?: EquitySMACard;
  silver?: EquitySMACard;
  platinum?: EquitySMACard;
  copper?: EquitySMACard;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 2, suffix = ""): string {
  if (val == null || isNaN(val)) return "–";
  return `${val.toFixed(decimals)}${suffix}`;
}

function fmtSigned(val: number | null | undefined, decimals = 2, suffix = ""): string {
  if (val == null || isNaN(val)) return "–";
  return `${val >= 0 ? "+" : ""}${val.toFixed(decimals)}${suffix}`;
}

function numColor(val: number | null | undefined, redWhenPositive = false): string {
  if (val == null || isNaN(val)) return "text-slate-500";
  const isPos = val > 0;
  return (redWhenPositive ? isPos : !isPos) ? "text-red-400" : "text-green-400";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function PercentileBar({ value }: { value?: number | null }) {
  if (value == null || isNaN(value)) return <div className="h-1 bg-slate-800 rounded-full" />;
  const color = value >= 80 ? "#E24B4A" : value >= 60 ? "#D9A84D" : value <= 20 ? "#7AB648" : "#4A6FA5";
  return (
    <div className="relative h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
      <div className="absolute left-0 top-0 h-full rounded-full transition-all"
        style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

function Badge({ alert }: { alert?: string }) {
  if (!alert || alert === "normal" || alert === "neutral") return null;
  const isExtreme = alert.toLowerCase().includes("extreme") || alert.toLowerCase().includes("stress") || alert.toLowerCase().includes("high");
  const color = isExtreme ? "#E24B4A" : "#D9A84D";
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
      style={{ color, borderColor: color + "44", background: color + "15" }}>
      {alert}
    </span>
  );
}

function BlankCard({ title, msg }: { title: string; msg?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-2">{title}</div>
      <div className="text-sm text-slate-600 font-mono">{msg ?? "–"}</div>
    </div>
  );
}

// ─── Yield Table ──────────────────────────────────────────────────────────────

function YieldTable({ yields, curve }: { yields?: MacroMetrics["yields"]; curve?: MacroMetrics["curve"] }) {
  const TENORS = ["1y", "2y", "3y", "5y", "10y"] as const;
  if (!yields) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {["Tenor", "Yield", "1d chg", "5d chg", "52w range", "Signal"].map((h, i) => (
              <th key={h}
                className={`py-2.5 px-4 text-xs font-mono text-slate-600 uppercase tracking-wide font-normal
                  ${i === 0 ? "text-left" : i < 4 ? "text-right" : i === 4 ? "" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TENORS.map((t, i) => {
            const y: YieldTenor = yields[t] ?? {};
            return (
              <tr key={t} className={`border-b border-slate-900 hover:bg-slate-900 transition-colors ${i === TENORS.length - 1 ? "border-b-0" : ""}`}>
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">{t.toUpperCase()}</td>
                <td className="px-4 py-3 font-mono text-right text-base text-slate-100">{fmt(y.current, 2, "%")}</td>
                <td className={`px-4 py-3 font-mono text-right text-xs ${numColor(y.d1_chg)}`}>{fmtSigned(y.d1_chg, 3)}</td>
                <td className={`px-4 py-3 font-mono text-right text-xs ${numColor(y.d5_chg)}`}>{fmtSigned(y.d5_chg, 3)}</td>
                <td className="px-4 py-3 w-28"><PercentileBar value={y.percentile} /></td>
                <td className="px-4 py-3 text-right"><Badge alert={y.alert} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-6 text-xs text-slate-600">
        <span>2Y–10Y spread: <span className="font-mono" style={{ color: "#D9A84D" }}>
          {curve?.spread_2y10y_bp != null
            ? `${curve.spread_2y10y_bp >= 0 ? "+" : ""}${curve.spread_2y10y_bp}bp`
            : "–"}
        </span></span>
        <span>Curve: <span style={{ color: "#D9A84D" }}>{curve?.label ?? "–"}</span></span>
      </div>
    </div>
  );
}

// ─── Volatility Card (DXY, VIX, VXN) ─────────────────────────────────────────

function VolCard({ title, data, suffix = "" }: { title: string; data?: VolatilityCard; suffix?: string }) {
  if (!data) return <BlankCard title={title} msg="No data" />;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">{title}</div>
        <Badge alert={data.alert} />
      </div>
      <div className="font-mono text-3xl text-slate-100 mb-4">
        {fmt(data.current, 2)}{suffix}
      </div>
      <div className="space-y-2 text-sm border-t border-slate-900 pt-3">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">5d chg</span>
          <span className={`font-mono text-xs ${numColor(data.d5_chg, true)}`}>{fmtSigned(data.d5_chg)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">20d chg</span>
          <span className={`font-mono text-xs ${numColor(data.d20_chg, true)}`}>{fmtSigned(data.d20_chg)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">90d percentile</span>
          <span className="font-mono text-xs text-slate-400">
            {data.percentile != null ? `${data.percentile}th` : "–"}
          </span>
        </div>
      </div>
      <PercentileBar value={data.percentile} />
      {data.pattern && <p className="text-xs text-slate-600 mt-3">{data.pattern}</p>}
    </div>
  );
}

// ─── HY OAS Card ──────────────────────────────────────────────────────────────

function HYOASCard({ hy_oas }: { hy_oas?: MacroMetrics["hy_oas"] }) {
  if (!hy_oas) return <BlankCard title="HY Credit Spread" msg="No data" />;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">HY Credit Spread</div>
        <Badge alert={hy_oas.alert} />
      </div>
      <div className="font-mono text-3xl text-slate-100 mb-4">
        {hy_oas.current != null ? `${fmt(hy_oas.current, 0)}bp` : "–"}
      </div>
      <div className="space-y-2 text-sm border-t border-slate-900 pt-3">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">5d chg</span>
          <span className={`font-mono text-xs ${numColor(hy_oas.d5_chg, true)}`}>
            {hy_oas.d5_chg != null ? `${fmtSigned(hy_oas.d5_chg, 0)}bp` : "–"}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">20d chg</span>
          <span className={`font-mono text-xs ${numColor(hy_oas.d20_chg, true)}`}>
            {hy_oas.d20_chg != null ? `${fmtSigned(hy_oas.d20_chg, 0)}bp` : "–"}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">90d percentile</span>
          <span className="font-mono text-xs text-slate-400">
            {hy_oas.percentile != null ? `${hy_oas.percentile}th` : "–"}
          </span>
        </div>
      </div>
      <PercentileBar value={hy_oas.percentile} />
    </div>
  );
}

// ─── SMA Price Card ───────────────────────────────────────────────────────────

function SMAPriceCard({ title, data }: { title: string; data?: EquitySMACard }) {
  if (!data || data.error) return <BlankCard title={title} msg={data?.error ?? "No data"} />;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">{title}</div>
        <Badge alert={data.alert} />
      </div>
      <div className="font-mono text-2xl text-slate-100 mb-4">
        {data.current != null ? data.current.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "–"}
      </div>
      <div className="space-y-2 text-sm border-t border-slate-900 pt-3">
        {[
          { label: "vs SMA20", val: data.pct_from_sma20 },
          { label: "vs SMA50", val: data.pct_from_sma50 },
          { label: "vs SMA200", val: data.pct_from_sma200 },
        ].map(({ label, val }) => (
          <div key={label} className="flex justify-between items-baseline">
            <span className="text-slate-600">{label}</span>
            <span className={`font-mono text-xs ${numColor(val, false)}`}>
              {val != null ? fmtSigned(val, 1, "%") : "–"}
            </span>
          </div>
        ))}
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">90d percentile</span>
          <span className="font-mono text-xs text-slate-400">
            {data.percentile != null ? `${data.percentile}th` : "–"}
          </span>
        </div>
      </div>
      <PercentileBar value={data.percentile} />
    </div>
  );
}

// ─── Macro Causal Chain ───────────────────────────────────────────────────────

function MacroCausalChain({ macro }: { macro: MacroMetrics }) {
  const { yields, dxy, vix, hy_oas } = macro;
  const signals: { dir: "up" | "down" | "neutral"; text: string }[] = [];

  const yield10y = yields?.["10y"];
  if (yield10y?.current != null) {
    if (yield10y.current >= 4.5)
      signals.push({ dir: "up", text: `10Y yield at ${fmt(yield10y.current, 2)}% — elevated gravity, risk asset headwind` });
    else if (yield10y.current <= 3.5)
      signals.push({ dir: "down", text: `10Y yield at ${fmt(yield10y.current, 2)}% — gravity easing, supports risk assets` });
    else
      signals.push({ dir: "neutral", text: `10Y yield at ${fmt(yield10y.current, 2)}% — neutral range` });
  }

  if (dxy?.current != null) {
    if (dxy.current >= 104)
      signals.push({ dir: "up", text: `DXY ${fmt(dxy.current, 1)} — strong dollar headwind for global risk assets` });
    else if ((dxy.d5_chg ?? 0) < -0.5)
      signals.push({ dir: "down", text: `DXY weakening (${fmtSigned(dxy.d5_chg, 2)} 5d) — dollar headwind easing` });
    else
      signals.push({ dir: "neutral", text: `DXY ${fmt(dxy.current, 1)} — neutral, no strong directional wind` });
  }

  if (vix?.current != null) {
    if ((vix.d5_chg ?? 0) < 0)
      signals.push({ dir: "down", text: `VIX compressing to ${fmt(vix.current, 1)} — risk appetite returning` });
    else if (vix.current >= 25)
      signals.push({ dir: "up", text: `VIX elevated at ${fmt(vix.current, 1)} — market stress, risk-off` });
    else
      signals.push({ dir: "neutral", text: `VIX at ${fmt(vix.current, 1)} — neutral volatility regime` });
  }

  if (hy_oas?.current != null) {
    if (hy_oas.current >= 450)
      signals.push({ dir: "up", text: `HY OAS at ${fmt(hy_oas.current, 0)}bp — credit stress elevated` });
    else if ((hy_oas.d5_chg ?? 0) < -15)
      signals.push({ dir: "down", text: `HY spreads tightening (${fmtSigned(hy_oas.d5_chg ?? 0, 0)}bp 5d) — credit improving` });
    else
      signals.push({ dir: "neutral", text: `HY OAS ${fmt(hy_oas.current, 0)}bp — moderately stressed, watch direction` });
  }

  const colorMap = { up: "#E24B4A", down: "#7AB648", neutral: "#D9A84D" };
  const arrowMap = { up: "↑", down: "↓", neutral: "→" };
  const bullish  = signals.filter(s => s.dir === "down").length;
  const bearish  = signals.filter(s => s.dir === "up").length;

  const contradiction =
    bullish > 0 && bearish > 0
      ? "Mixed macro environment — risk-on signals alongside tighter conditions. Watch HY spread direction as the tie-breaker."
      : bullish > bearish
      ? "Macro environment broadly supportive — weak dollar, compressed volatility, tightening credit spreads. Watch for yield ceiling as potential headwind."
      : bearish > bullish
      ? "Macro environment cautious — rising yields and credit stress dominate. BTC upside depends on ETF demand absorbing macro headwinds."
      : "Macro environment neutral — no strong directional signal. Focus on BTC-specific capital flows.";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-600 mb-3">Structural reads</div>
          <div className="space-y-2.5">
            {signals.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span style={{ color: colorMap[s.dir], fontSize: 16, lineHeight: 1.2 }}>{arrowMap[s.dir]}</span>
                <span className="text-sm text-slate-300">{s.text}</span>
              </div>
            ))}
            {signals.length === 0 && <div className="text-sm text-slate-600">Loading macro signals…</div>}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-600 mb-3">Main contradiction</div>
          <div className="rounded-lg border p-4" style={{ background: "#1A1508", borderColor: "#3A3228" }}>
            <p className="text-sm text-slate-400 leading-relaxed">{contradiction}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MacroDashboard() {
  const [macro, setMacro]           = useState<MacroMetrics | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API}/macro/metrics`);
      if (!res.ok) throw new Error(`Macro API ${res.status}`);
      const data: MacroMetrics = await res.json();
      setMacro(data);
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
    await fetch(`${API}/macro/cache/flush`);
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

        <DashboardNav
          current="macro"
          title="Macro Dashboard"
          lastUpdated={lastUpdated}
          onFlush={flushCache}
        />

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — check backend and ensure /macro/metrics is reachable.
          </div>
        )}

        {loading && !macro && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Fetching macro data…
          </div>
        )}

        {/* ── I. Treasury Yields ──────────────────────────────────────── */}
        {macro && (
          <section>
            <SectionLabel num="I" title="US Treasury Yields" />
            <YieldTable yields={macro.yields} curve={macro.curve} />
          </section>
        )}

        {/* ── II. Risk Indicators ─────────────────────────────────────── */}
        {macro && (
          <section>
            <SectionLabel num="II" title="Risk Indicators" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <VolCard title="DXY Dollar Index" data={macro.dxy} />
              <VolCard title="VIX Volatility"   data={macro.vix} />
              <HYOASCard hy_oas={macro.hy_oas} />
            </div>
          </section>
        )}

        {/* ── III. Equities & Commodities ─────────────────────────────── */}
        {macro && (
          <section>
            <SectionLabel num="III" title="Equities & Commodities — SMA Analysis" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SMAPriceCard title="Nasdaq-100"       data={macro.nasdaq100} />
              <VolCard      title="VXN (Nasdaq Vol)" data={macro.vxn} />
              <SMAPriceCard title="S&P 500"          data={macro.sp500} />
              <SMAPriceCard title="Brent Crude Oil"  data={macro.brent} />
            </div>
          </section>
        )}

        {/* ── IV. Metals ──────────────────────────────────────────────── */}
        {macro && (macro.gold || macro.silver || macro.platinum || macro.copper) && (
          <section>
            <SectionLabel num="IV" title="Metals — SMA Analysis" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SMAPriceCard title="Gold"     data={macro.gold} />
              <SMAPriceCard title="Silver"   data={macro.silver} />
              <SMAPriceCard title="Platinum" data={macro.platinum} />
              <SMAPriceCard title="Copper"   data={macro.copper} />
            </div>
          </section>
        )}

        {/* ── V. Macro Causal Chain ───────────────────────────────────── */}
        {macro && (
          <section>
            <SectionLabel num="V" title="Macro Causal Chain" />
            <MacroCausalChain macro={macro} />
          </section>
        )}

        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>Data: yFinance · FRED (HY OAS) · 5min cache</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>

      </div>
    </main>
  );
}
