"use client";

import { useEffect, useState, useCallback } from "react";

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
  hy_oas?: { current?: number | null; d5_chg?: number | null; d20_chg?: number | null; percentile?: number | null; alert?: string; error?: string };
  nasdaq100?: EquitySMACard;
  vxn?: VolatilityCard;
  sp500?: EquitySMACard;
  brent?: EquitySMACard;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 2, suffix = ""): string {
  if (val == null || isNaN(val)) return "–";
  return `${val.toFixed(decimals)}${suffix}`;
}

function fmtSigned(val: number | null | undefined, decimals = 2, suffix = ""): string {
  if (val == null || isNaN(val)) return "–";
  return `${val >= 0 ? "+" : ""}${val.toFixed(decimals)}${suffix}`;
}

function fmtLarge(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "–";
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function numColor(val: number | null | undefined, redWhenPositive = false): string {
  if (val == null || isNaN(val)) return "text-slate-500";
  const isPos = val > 0;
  return (redWhenPositive ? isPos : !isPos) ? "text-red-400" : "text-green-400";
}

function PercentileBar({ value }: { value?: number | null }) {
  if (value == null || isNaN(value)) return <span className="text-slate-600 font-mono text-xs">–</span>;
  const color = value >= 80 ? "#E24B4A" : value >= 60 ? "#D9A84D" : value <= 20 ? "#7AB648" : "#4A4A4C";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color }}>{value}th</span>
    </div>
  );
}

const ALERT_COLORS: Record<string, string> = {
  "fear spike":              "text-red-400 bg-red-950 border-red-900",
  "far below 200d":          "text-red-400 bg-red-950 border-red-900",
  "tech volatility elevated":"text-red-400 bg-red-950 border-red-900",
  "distress":                "text-red-400 bg-red-950 border-red-900",
  "below 200d":              "text-orange-400 bg-orange-950 border-orange-900",
  "tech volatility rising":  "text-orange-400 bg-orange-950 border-orange-900",
  "elevated":                "text-amber-400 bg-amber-950 border-amber-900",
  "well above 200d":         "text-green-400 bg-green-950 border-green-900",
  "above 200d":              "text-green-400 bg-green-950 border-green-900",
  "usd weakening":           "text-green-400 bg-green-950 border-green-900",
};

function Badge({ alert }: { alert?: string }) {
  if (!alert || alert === "–" || alert === "Normal") return null;
  const key = alert.toLowerCase();
  const cls = Object.entries(ALERT_COLORS).find(([k]) => key.includes(k))?.[1]
    ?? "text-slate-400 bg-slate-900 border-slate-800";
  return <span className={`inline-block text-xs font-mono border px-2 py-0.5 rounded ${cls}`}>{alert}</span>;
}

function SectionLabel({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-mono text-xs border px-2 py-0.5 rounded" style={{ color: "#3A3228", background: "#1A1508", borderColor: "#3A3228" }}>{num}</span>
      <span className="text-xs uppercase tracking-widest text-slate-600 font-medium">{title}</span>
    </div>
  );
}

// ── SMA Card ──────────────────────────────────────────────────────────────

function SMAPriceCard({ title, data, unit = "" }: { title: string; data?: EquitySMACard; unit?: string }) {
  if (!data) return <BlankCard title={title} msg="No data" />;
  if (data.error && data.current == null) return <BlankCard title={title} msg={data.error} />;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">{title}</div>
        <Badge alert={data.alert} />
      </div>
      <div className="font-mono text-3xl text-slate-100 mb-4">
        {fmtLarge(data.current)}{data.current != null ? unit : ""}
      </div>
      <div className="space-y-2.5 text-sm border-t border-slate-900 pt-3">
        {[
          { label: "20d SMA", sma: data.sma20, pct: data.pct_from_sma20 },
          { label: "50d SMA", sma: data.sma50, pct: data.pct_from_sma50 },
          { label: "200d SMA", sma: data.sma200, pct: data.pct_from_sma200 },
        ].map(({ label, sma, pct }, i) => (
          <div key={label} className={`flex justify-between items-center ${i === 2 ? "pb-2 border-b border-slate-900" : ""}`}>
            <div>
              <div className="text-slate-600 text-xs">{label}</div>
              <div className="font-mono text-sm text-slate-400">{fmtLarge(sma)}</div>
            </div>
            <div className={`text-right font-mono text-sm ${numColor(pct)}`}>
              {fmtSigned(pct, 2, "%")}
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center pt-2">
          <span className="text-slate-600 text-xs">90d percentile</span>
          <span className="font-mono text-xs text-slate-400">{data.percentile != null ? `${data.percentile}th` : "–"}</span>
        </div>
      </div>
      <PercentileBar value={data.percentile} />
    </div>
  );
}

// ── Volatility Card (VIX, VXN, DXY) ──────────────────────────────────────

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
          <span className="font-mono text-xs text-slate-400">{data.percentile != null ? `${data.percentile}th` : "–"}</span>
        </div>
      </div>
      <PercentileBar value={data.percentile} />
      {data.pattern && <p className="text-xs text-slate-600 mt-3">{data.pattern}</p>}
    </div>
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

// ── Page ──────────────────────────────────────────────────────────────────

export default function MacroDashboard() {
  const [macro, setMacro] = useState<MacroMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API}/macro/metrics`);
      if (!res.ok) throw new Error(`Macro API ${res.status}`);
      setMacro(await res.json());
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
    const t = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [fetchAll]);

  const TENORS = ["1y", "2y", "3y", "5y", "10y"] as const;

  return (
    <main className="min-h-screen p-6" style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-900">
          <div className="flex items-baseline gap-4">
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, fontWeight: 400 }}>Macro Dashboard</h1>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {lastUpdated ? `Updated ${lastUpdated} UTC` : "Loading…"}
            </div>
          </div>
          <nav className="flex gap-1">
            <a href="/" className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">BTC</a>
            <span className="text-xs px-3 py-1.5 rounded-md border font-mono" style={{ background: "#1C1C1E", color: "#D9A84D", borderColor: "#3A3228" }}>Macro</span>
          </nav>
        </header>

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">{error}</div>
        )}
        {loading && !macro && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">Fetching macro data…</div>
        )}

        {/* I. Treasury Yields */}
        {macro && (
          <section>
            <SectionLabel num="I" title="US Treasury Yields" />
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {["Tenor", "Yield", "1d chg", "5d chg", "52w range", "Signal"].map((h, i) => (
                      <th key={h} className={`py-2.5 px-4 text-xs font-mono text-slate-600 uppercase tracking-wide font-normal ${i === 0 ? "text-left" : i < 4 ? "text-right" : i === 4 ? "" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TENORS.map((t, i) => {
                    const y: YieldTenor = macro.yields?.[t] ?? {};
                    return (
                      <tr key={t} className={`border-b border-slate-900 hover:bg-slate-900 transition-colors ${i === TENORS.length - 1 ? "border-b-0" : ""}`}>
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{t.toUpperCase()}</td>
                        <td className="px-4 py-3 font-mono text-right text-base text-slate-100">{fmt(y.current, 2, "%")}</td>
                        <td className={`px-4 py-3 font-mono text-right text-xs ${numColor(y.d1_chg)}`}>{fmtSigned(y.d1_chg, 3)}</td>
                        <td className={`px-4 py-3 font-mono text-right text-xs ${numColor(y.d5_chg)}`}>{fmtSigned(y.d5_chg, 3)}</td>
                        <td className="px-4 py-3"><PercentileBar value={y.percentile} /></td>
                        <td className="px-4 py-3 text-right"><Badge alert={y.alert} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-6 text-xs text-slate-600">
                <span>2Y–10Y spread: <span className="font-mono" style={{ color: "#D9A84D" }}>
                  {macro.curve?.spread_2y10y_bp != null ? `${macro.curve.spread_2y10y_bp >= 0 ? "+" : ""}${macro.curve.spread_2y10y_bp}bp` : "–"}
                </span></span>
                <span>Curve: <span style={{ color: "#D9A84D" }}>{macro.curve?.label ?? "–"}</span></span>
              </div>
            </div>
          </section>
        )}

        {/* II. Risk Indicators */}
        {macro && (
          <section>
            <SectionLabel num="II" title="Risk Indicators" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <VolCard title="DXY Dollar Index" data={macro.dxy} />
              <VolCard title="VIX Volatility" data={macro.vix} />
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">HY Credit Spread</div>
                  <Badge alert={macro.hy_oas?.alert} />
                </div>
                <div className="font-mono text-3xl text-slate-100 mb-4">
                  {macro.hy_oas?.current != null ? `${fmt(macro.hy_oas.current, 2)}%` : "–"}
                </div>
                <div className="space-y-2 text-sm border-t border-slate-900 pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">5d chg</span>
                    <span className={`font-mono text-xs ${numColor(macro.hy_oas?.d5_chg, true)}`}>
                      {macro.hy_oas?.d5_chg != null ? `${fmtSigned(macro.hy_oas.d5_chg, 2)}%` : "–"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">20d chg</span>
                    <span className={`font-mono text-xs ${numColor(macro.hy_oas?.d20_chg, true)}`}>
                      {macro.hy_oas?.d20_chg != null ? `${fmtSigned(macro.hy_oas.d20_chg, 2)}%` : "–"}
                    </span>
                  </div>
                </div>
                <PercentileBar value={macro.hy_oas?.percentile} />
              </div>
            </div>
          </section>
        )}

        {/* III. Equities & Commodities */}
        {macro && (
          <section>
            <SectionLabel num="III" title="Equities & Commodities — SMA Analysis" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SMAPriceCard title="Nasdaq-100" data={macro.nasdaq100} />
              <VolCard title="VXN (Nasdaq Vol)" data={macro.vxn} />
              <SMAPriceCard title="S&P 500" data={macro.sp500} />
              <SMAPriceCard title="Brent Crude Oil" data={macro.brent} />
            </div>
          </section>
        )}

        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4">
          <span>Data: yFinance · FRED (HY OAS) · 5min cache</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>
      </div>
    </main>
  );
}
