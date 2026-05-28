"use client";

/**
 * app/macro/page.tsx (EXTENDED) — Macro Dashboard with Equities & Commodities
 *
 * Matches the BTC dashboard design system:
 *   - Background: #0B0B0C
 *   - Accent: #D9A84D (amber)
 *   - Fonts: Instrument Serif (display) + IBM Plex Sans (body) + IBM Plex Mono (data)
 *
 * NEW SECTION: Equities & Commodities with 20/50/200 day SMAs
 *   - Nasdaq-100
 *   - VXN (Nasdaq Volatility)
 *   - S&P 500
 *   - Brent Crude Oil
 *
 * Add this page at:  app/macro/page.tsx
 */

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────

interface YieldTenor {
  label: string;
  current: number | null;
  d1_chg: number | null;
  d5_chg: number | null;
  percentile: number | null;
  alert: string;
  error?: string;
}

interface EquitySMACard {
  current: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  pct_from_sma20: number | null;
  pct_from_sma50: number | null;
  pct_from_sma200: number | null;
  percentile: number | null;
  alert: string;
  error?: string;
}

interface VolatilityIndex {
  current: number | null;
  d5_chg: number | null;
  d20_chg: number | null;
  percentile: number | null;
  alert: string;
  pattern: string;
  error?: string;
}

interface MacroMetrics {
  updated_at: string;
  yields: Record<"1y" | "2y" | "3y" | "5y" | "10y", YieldTenor>;
  curve: { spread_2y10y_bp: number | null; label: string };
  dxy: Record<string, any>;
  vix: Record<string, any>;
  hy_oas: Record<string, any>;
  nasdaq100: EquitySMACard;
  vxn: VolatilityIndex;
  sp500: EquitySMACard;
  brent: EquitySMACard;
}

interface BtcMetric {
  current: string;
  d7: string;
  vs30d: string;
  percentile: string;
  alert: string;
  pattern: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min

const ALERT_COLORS: Record<string, string> = {
  "extreme": "text-red-400 bg-red-950 border-red-900",
  "fear spike": "text-red-400 bg-red-950 border-red-900",
  "far below 200d": "text-red-400 bg-red-950 border-red-900",
  "below 200d": "text-orange-400 bg-orange-950 border-orange-900",
  "well above 200d": "text-green-400 bg-green-950 border-green-900",
  "above 200d": "text-green-400 bg-green-950 border-green-900",
  "tech volatility elevated": "text-red-400 bg-red-950 border-red-900",
  "tech volatility rising": "text-orange-400 bg-orange-950 border-orange-900",
};

function alertClass(alert: string): string {
  const key = alert.toLowerCase();
  for (const [k, v] of Object.entries(ALERT_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "text-slate-400 bg-slate-900 border-slate-800";
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtChg(val: number | null, suffix = ""): string {
  if (val === null) return "–";
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}${suffix}`;
}

function fmtPct(val: number | null, decimals = 1): string {
  if (val === null) return "–";
  return `${val >= 0 ? "+" : ""}${val.toFixed(decimals)}%`;
}

function pctColor(val: number | null, invert = false): string {
  if (val === null) return "text-slate-500";
  const positive = val > 0;
  const red = invert ? positive : !positive;
  return red ? "text-red-400" : "text-green-400";
}

function PercentileBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-600 font-mono text-xs">–</span>;
  const color =
    value >= 80 ? "#E24B4A" :
    value >= 60 ? "#D9A84D" :
    value <= 20 ? "#7AB648" : "#4A4A4C";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="font-mono text-xs" style={{ color }}>{value}th</span>
    </div>
  );
}

function Badge({ alert }: { alert: string }) {
  if (!alert || alert === "–" || alert === "Normal") return null;
  return (
    <span className={`inline-block text-xs font-mono border px-2 py-0.5 rounded ${alertClass(alert)}`}>
      {alert}
    </span>
  );
}

function SectionLabel({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-mono text-xs border px-2 py-0.5 rounded"
        style={{ color: "#3A3228", background: "#1A1508", borderColor: "#3A3228" }}>
        {num}
      </span>
      <span className="text-xs uppercase tracking-widest text-slate-600 font-medium">{title}</span>
    </div>
  );
}

// ─── New SMA Card Component ────────────────────────────────────────────────

function SMAPriceCard({ 
  title, 
  data, 
  unit = "" 
}: { 
  title: string;
  data: EquitySMACard;
  unit?: string;
}) {
  if (data.error && !data.current)
    return <ErrorCard title={title} error={data.error} />;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">{title}</div>
        <Badge alert={data.alert} />
      </div>

      {/* Current price — large display */}
      <div className="font-mono text-3xl text-slate-100 mb-4">
        {data.current !== null ? `${data.current.toLocaleString()}${unit}` : "–"}
      </div>

      {/* SMA values + percentage diffs */}
      <div className="space-y-2.5 text-sm border-t border-slate-900 pt-3">
        
        {/* 20-day SMA row */}
        <div className="flex justify-between items-center">
          <div>
            <div className="text-slate-600 text-xs">20d SMA</div>
            <div className="font-mono text-sm text-slate-400">
              {data.sma20 !== null ? data.sma20.toLocaleString() : "–"}
            </div>
          </div>
          <div className={`text-right font-mono text-sm ${pctColor(data.pct_from_sma20)}`}>
            {fmtPct(data.pct_from_sma20)}
          </div>
        </div>

        {/* 50-day SMA row */}
        <div className="flex justify-between items-center">
          <div>
            <div className="text-slate-600 text-xs">50d SMA</div>
            <div className="font-mono text-sm text-slate-400">
              {data.sma50 !== null ? data.sma50.toLocaleString() : "–"}
            </div>
          </div>
          <div className={`text-right font-mono text-sm ${pctColor(data.pct_from_sma50)}`}>
            {fmtPct(data.pct_from_sma50)}
          </div>
        </div>

        {/* 200-day SMA row */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-900">
          <div>
            <div className="text-slate-600 text-xs">200d SMA</div>
            <div className="font-mono text-sm text-slate-400">
              {data.sma200 !== null ? data.sma200.toLocaleString() : "–"}
            </div>
          </div>
          <div className={`text-right font-mono text-sm ${pctColor(data.pct_from_sma200)}`}>
            {fmtPct(data.pct_from_sma200)}
          </div>
        </div>

        {/* Percentile */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-slate-600 text-xs">90d percentile</span>
          <span className="font-mono text-xs text-slate-400">
            {data.percentile !== null ? `${data.percentile}th` : "–"}
          </span>
        </div>
      </div>

      <PercentileBar value={data.percentile} />
    </div>
  );
}

function VolatilityIndexCard({
  title,
  data,
}: {
  title: string;
  data: VolatilityIndex;
}) {
  if (data.error && !data.current)
    return <ErrorCard title={title} error={data.error} />;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">{title}</div>
        <Badge alert={data.alert} />
      </div>

      <div className="font-mono text-3xl text-slate-100 mb-4">
        {data.current !== null ? data.current.toFixed(2) : "–"}
      </div>

      <div className="space-y-2 text-sm border-t border-slate-900 pt-3">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">5d change</span>
          <span className={`font-mono text-xs ${pctColor(data.d5_chg, true)}`}>
            {fmtChg(data.d5_chg)}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">20d change</span>
          <span className={`font-mono text-xs ${pctColor(data.d20_chg, true)}`}>
            {fmtChg(data.d20_chg)}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">90d percentile</span>
          <span className="font-mono text-xs text-slate-400">
            {data.percentile !== null ? `${data.percentile}th` : "–"}
          </span>
        </div>
      </div>

      <PercentileBar value={data.percentile} />

      {data.pattern && (
        <p className="text-xs text-slate-600 mt-3">{data.pattern}</p>
      )}
    </div>
  );
}

function ErrorCard({ title, error, hint }: { title: string; error: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-2">{title}</div>
      <div className="text-sm text-red-400 font-mono">{error}</div>
      {hint && <div className="text-xs text-slate-600 mt-2">{hint}</div>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function MacroDashboard() {
  const [macro, setMacro] = useState<MacroMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const macroRes = await fetch(`${API}/macro/metrics`);

      if (!macroRes.ok) throw new Error(`Macro API ${macroRes.status}`);
      const macroData: MacroMetrics = await macroRes.json();
      setMacro(macroData);
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
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

  return (
    <main className="min-h-screen p-6" style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-900">
          <div className="flex items-baseline gap-4">
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, fontWeight: 400 }}>
              Macro Dashboard
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {lastUpdated ? `Updated ${lastUpdated} UTC` : "Loading…"}
            </div>
          </div>

          <nav className="flex gap-1">
            <a
              href="/"
              className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            >
              BTC
            </a>
            <span
              className="text-xs px-3 py-1.5 rounded-md border font-mono"
              style={{ background: "#1C1C1E", color: "#D9A84D", borderColor: "#3A3228" }}
            >
              Macro
            </span>
          </nav>
        </header>

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — check backend logs and ensure /macro/metrics is reachable.
          </div>
        )}

        {loading && !macro && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Fetching macro data…
          </div>
        )}

        {/* I. Treasury Yields */}
        {macro && (
          <section>
            <SectionLabel num="I" title="US Treasury Yields" />
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-600 uppercase tracking-wide font-normal">Tenor</th>
                    <th className="text-right px-4 py-2.5 text-xs font-mono text-slate-600 uppercase tracking-wide font-normal">Yield</th>
                    <th className="text-right px-4 py-2.5 text-xs font-mono text-slate-600 uppercase tracking-wide font-normal">1d chg</th>
                    <th className="text-right px-4 py-2.5 text-xs font-mono text-slate-600 uppercase tracking-wide font-normal">5d chg</th>
                    <th className="px-4 py-2.5 text-xs font-mono text-slate-600 uppercase tracking-wide font-normal">52w range</th>
                    <th className="text-right px-4 py-2.5 text-xs font-mono text-slate-600 uppercase tracking-wide font-normal">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {(["1y", "2y", "3y", "5y", "10y"] as const).map((t, i) => {
                    const y = macro.yields[t];
                    return (
                      <tr key={t} className={`border-b border-slate-900 hover:bg-slate-900 transition-colors ${i === 4 ? "border-b-0" : ""}`}>
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{t.toUpperCase()}</td>
                        <td className="px-4 py-3 font-mono text-right text-base text-slate-100">
                          {y.current != null ? `${y.current.toFixed(2)}%` : "–"}
                        </td>
                        <td className={`px-4 py-3 font-mono text-right text-xs ${pctColor(y.d1_chg)}`}>
                          {y.d1_chg != null ? `${y.d1_chg >= 0 ? "+" : ""}${y.d1_chg.toFixed(3)}` : "–"}
                        </td>
                        <td className={`px-4 py-3 font-mono text-right text-xs ${pctColor(y.d5_chg)}`}>
                          {y.d5_chg != null ? `${y.d5_chg >= 0 ? "+" : ""}${y.d5_chg.toFixed(3)}` : "–"}
                        </td>
                        <td className="px-4 py-3">
                          <PercentileBar value={y.percentile ?? null} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge alert={y.alert} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-6 text-xs text-slate-600">
                <span>
                  2Y–10Y spread:{" "}
                  <span className="font-mono" style={{ color: "#D9A84D" }}>
                    {macro.curve.spread_2y10y_bp !== null
                      ? `${macro.curve.spread_2y10y_bp >= 0 ? "+" : ""}${macro.curve.spread_2y10y_bp}bp`
                      : "–"}
                  </span>
                </span>
                <span>
                  Curve: <span style={{ color: "#D9A84D" }}>{macro.curve.label}</span>
                </span>
              </div>
            </div>
          </section>
        )}

        {/* II. Risk Indicators */}
        {macro && (
          <section>
            <SectionLabel num="II" title="Risk Indicators" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* DXY — existing component, simplified display */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1">DXY Dollar Index</div>
                <div className="font-mono text-3xl text-slate-100 mb-4">
                  {macro.dxy.current?.toFixed(2) ?? "–"}
                </div>
                <div className="space-y-2 text-sm border-t border-slate-900 pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">5d chg</span>
                    <span className={`font-mono text-xs ${pctColor(macro.dxy.d5_chg, true)}`}>
                      {fmtChg(macro.dxy.d5_chg)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">20d chg</span>
                    <span className={`font-mono text-xs ${pctColor(macro.dxy.d20_chg, true)}`}>
                      {fmtChg(macro.dxy.d20_chg)}
                    </span>
                  </div>
                </div>
                <PercentileBar value={macro.dxy.percentile} />
                <div className="mt-3">
                  <Badge alert={macro.dxy.alert} />
                </div>
              </div>

              {/* VIX */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1">VIX Volatility</div>
                <div className="font-mono text-3xl text-slate-100 mb-4">
                  {macro.vix.current?.toFixed(1) ?? "–"}
                </div>
                <div className="space-y-2 text-sm border-t border-slate-900 pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">5d chg</span>
                    <span className={`font-mono text-xs ${pctColor(macro.vix.d5_chg, true)}`}>
                      {fmtChg(macro.vix.d5_chg)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">20d chg</span>
                    <span className={`font-mono text-xs ${pctColor(macro.vix.d20_chg, true)}`}>
                      {fmtChg(macro.vix.d20_chg)}
                    </span>
                  </div>
                </div>
                <PercentileBar value={macro.vix.percentile} />
                <div className="mt-3">
                  <Badge alert={macro.vix.alert} />
                </div>
              </div>

              {/* HY OAS */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1">HY Credit Spread</div>
                <div className="font-mono text-3xl text-slate-100 mb-4">
                  {macro.hy_oas.current !== null ? `${macro.hy_oas.current.toFixed(2)}%` : "–"}
                </div>
                <div className="space-y-2 text-sm border-t border-slate-900 pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">5d chg</span>
                    <span className={`font-mono text-xs ${pctColor(macro.hy_oas.d5_chg, true)}`}>
                      {macro.hy_oas.d5_chg !== null ? `${macro.hy_oas.d5_chg >= 0 ? "+" : ""}${macro.hy_oas.d5_chg.toFixed(2)}%` : "–"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">20d chg</span>
                    <span className={`font-mono text-xs ${pctColor(macro.hy_oas.d20_chg, true)}`}>
                      {macro.hy_oas.d20_chg !== null ? `${macro.hy_oas.d20_chg >= 0 ? "+" : ""}${macro.hy_oas.d20_chg.toFixed(2)}%` : "–"}
                    </span>
                  </div>
                </div>
                <PercentileBar value={macro.hy_oas.percentile} />
                <div className="mt-3">
                  <Badge alert={macro.hy_oas.alert} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* III. EQUITIES & COMMODITIES — NEW SECTION */}
        {macro && (
          <section>
            <SectionLabel num="III" title="Equities & Commodities — SMA Analysis" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SMAPriceCard title="Nasdaq-100" data={macro.nasdaq100} unit="" />
              <VolatilityIndexCard title="VXN (Nasdaq Vol)" data={macro.vxn} />
              <SMAPriceCard title="S&P 500" data={macro.sp500} unit="" />
              <SMAPriceCard title="Brent Crude Oil" data={macro.brent} unit=" bbl" />
            </div>
          </section>
        )}

        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4">
          <span>Data: yFinance (yields, equities, commodities) · FRED (HY OAS) · Backend cache 5min</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>
      </div>
    </main>
  );
}
