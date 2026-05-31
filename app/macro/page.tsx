"use client";

import { useEffect, useState, useCallback } from "react";

// ── Design system (matches BTC page.tsx) ─────────────────────────────────
// ── Types ─────────────────────────────────────────────────────────────────
interface YieldTenor {
  label?: string; current?: number | null; d1_chg?: number | null;
  d5_chg?: number | null; percentile?: number | null; alert?: string;
}
interface EquitySMACard {
  current?: number | null; sma20?: number | null; sma50?: number | null;
  sma200?: number | null; pct_from_sma20?: number | null;
  pct_from_sma50?: number | null; pct_from_sma200?: number | null;
  percentile?: number | null; alert?: string; error?: string;
}
interface VolatilityCard {
  current?: number | null; d5_chg?: number | null; d20_chg?: number | null;
  percentile?: number | null; alert?: string; pattern?: string; error?: string;
}
interface MacroMetrics {
  updated_at?: string;
  yields?: Record<string, YieldTenor>;
  curve?: { spread_2y10y_bp?: number | null; label?: string };
  dxy?: VolatilityCard; vix?: VolatilityCard;
  hy_oas?: { current?: number | null; d5_chg?: number | null; d20_chg?: number | null; percentile?: number | null; alert?: string; error?: string };
  nasdaq100?: EquitySMACard; vxn?: VolatilityCard; sp500?: EquitySMACard;
  brent?: EquitySMACard; gold?: EquitySMACard; silver?: EquitySMACard;
  platinum?: EquitySMACard; copper?: EquitySMACard;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────
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
function chgColor(val: number | null | undefined, redWhenPositive = false): string {
  if (val == null || isNaN(val)) return "text-muted";
  return (redWhenPositive ? val > 0 : val < 0) ? "text-alert-extreme" : "text-neutral-sage";
}

function PercentileBar({ value }: { value?: number | null }) {
  if (value == null || isNaN(value)) return null;
  const color = value >= 80 ? "#C4614A" : value >= 60 ? "#C89A3F" : value <= 20 ? "#8DA078" : "#55534B";
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-[3px] bg-surface-inset rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono-data caps-sm" style={{ color }}>{value}th</span>
    </div>
  );
}

function Badge({ alert }: { alert?: string }) {
  if (!alert || alert === "–" || alert === "Normal") return null;
  const lower = alert.toLowerCase();
  const cls = lower.includes("high") || lower.includes("spike") || lower.includes("far below") || lower.includes("distress")
    ? "bg-extreme-10 border-extreme text-alert-extreme"
    : lower.includes("below") || lower.includes("stressed") || lower.includes("elevated")
    ? "bg-notable-10 border-notable text-alert-notable"
    : lower.includes("above") || lower.includes("sage") || lower.includes("calm") || lower.includes("weakening")
    ? "bg-sage-10 border-sage text-neutral-sage"
    : "bg-surface-2 hairline text-muted";
  return <span className={`inline-block caps-sm border px-2 py-[3px] ${cls}`}>{alert}</span>;
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

// ── SMA Card ──────────────────────────────────────────────────────────────
function SMAPriceCard({ title, data }: { title: string; data?: EquitySMACard }) {
  if (!data) return <BlankCard title={title} />;
  return (
    <div className="bg-surface border hairline p-5">
      <div className="flex items-start justify-between hairline-b pb-3 mb-3">
        <span className="caps-sm text-faint">{title}</span>
        <Badge alert={data.alert} />
      </div>
      <div className="font-mono-data text-paper text-[24px] leading-none mb-4">{fmtLarge(data.current)}</div>
      <div className="space-y-2.5">
        {[
          { label: "20d SMA", sma: data.sma20, pct: data.pct_from_sma20 },
          { label: "50d SMA", sma: data.sma50, pct: data.pct_from_sma50 },
          { label: "200d SMA", sma: data.sma200, pct: data.pct_from_sma200 },
        ].map(({ label, sma, pct }) => (
          <div key={label} className="flex justify-between items-baseline">
            <div>
              <div className="caps-sm text-faint">{label}</div>
              <div className="font-mono-data text-paper-2 text-[12px]">{fmtLarge(sma)}</div>
            </div>
            <span className={`font-mono-data text-[13px] ${chgColor(pct)}`}>
              {fmtSigned(pct, 2, "%")}
            </span>
          </div>
        ))}
      </div>
      <PercentileBar value={data.percentile} />
    </div>
  );
}

// ── Volatility Card ───────────────────────────────────────────────────────
function VolCard({ title, data, suffix = "" }: { title: string; data?: VolatilityCard; suffix?: string }) {
  if (!data) return <BlankCard title={title} />;
  return (
    <div className="bg-surface border hairline p-5">
      <div className="flex items-start justify-between hairline-b pb-3 mb-3">
        <span className="caps-sm text-faint">{title}</span>
        <Badge alert={data.alert} />
      </div>
      <div className="font-mono-data text-paper text-[24px] leading-none mb-4">{fmt(data.current, 2)}{suffix}</div>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="caps-sm text-faint">5d chg</span>
          <span className={`font-mono-data text-[12px] ${chgColor(data.d5_chg, true)}`}>{fmtSigned(data.d5_chg)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="caps-sm text-faint">20d chg</span>
          <span className={`font-mono-data text-[12px] ${chgColor(data.d20_chg, true)}`}>{fmtSigned(data.d20_chg)}</span>
        </div>
      </div>
      <PercentileBar value={data.percentile} />
      {data.pattern && <p className="font-sans-body text-faint text-[11px] italic mt-3">{data.pattern}</p>}
    </div>
  );
}

function BlankCard({ title }: { title: string }) {
  return (
    <div className="bg-surface border hairline p-5">
      <span className="caps-sm text-faint">{title}</span>
      <div className="font-mono-data text-muted text-[13px] mt-3">No data</div>
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
      if (!res.ok) throw new Error(`API ${res.status}`);
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
    <main className="bg-ink min-h-screen" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="hairline-b">
        <div className="max-w-[1440px] mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-baseline gap-6">
            <h1 className="font-display text-paper text-[30px] leading-none tracking-tight">
              Macro<span className="font-display-italic text-amber-sand"> · </span><span className="font-display-italic">Dashboard</span>
            </h1>
            <span className="caps-sm text-faint hidden md:inline">AI organizes · humans decide</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="caps-sm text-muted border hairline px-3 py-1.5 hover:text-paper transition-colors">BTC</a>
            <a href="/sector-flows" className="caps-sm text-muted border hairline px-3 py-1.5 hover:text-paper transition-colors">Sector Flows</a>
            <span className="caps-sm text-amber-sand border border-amber-sand bg-amber-sand-10 px-3 py-1.5">Macro</span>
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
      {loading && !macro && (
        <div className="max-w-[1440px] mx-auto px-8 py-20 text-center caps-sm text-faint">Fetching macro data…</div>
      )}

      <div className="max-w-[1440px] mx-auto px-8 py-8 space-y-12">

        {/* I. Treasury Yields */}
        {macro && (
          <section>
            <SectionLabel numeral="I" title="US Treasury Yields" subtitle="yFinance · daily" />
            <div className="bg-surface border hairline overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="hairline-b">
                    {["Tenor", "Yield", "1d chg", "5d chg", "52w range", "Signal"].map((h, i) => (
                      <th key={h} className={`px-5 py-3 caps-sm text-faint font-normal ${i === 0 ? "text-left" : i < 4 ? "text-right" : i === 5 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TENORS.map((t, i) => {
                    const y: YieldTenor = macro.yields?.[t] ?? {};
                    return (
                      <tr key={t} className={`hover:bg-surface-2 transition-colors ${i < TENORS.length - 1 ? "hairline-b" : ""}`}>
                        <td className="px-5 py-3 font-mono-data caps-sm text-faint">{t.toUpperCase()}</td>
                        <td className="px-5 py-3 font-mono-data text-paper text-right text-[15px]">{fmt(y.current, 2, "%")}</td>
                        <td className={`px-5 py-3 font-mono-data text-right text-[12px] ${chgColor(y.d1_chg)}`}>{fmtSigned(y.d1_chg, 3)}</td>
                        <td className={`px-5 py-3 font-mono-data text-right text-[12px] ${chgColor(y.d5_chg)}`}>{fmtSigned(y.d5_chg, 3)}</td>
                        <td className="px-5 py-3 w-36"><PercentileBar value={y.percentile} /></td>
                        <td className="px-5 py-3 text-right"><Badge alert={y.alert} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-5 py-3 hairline-t bg-surface-inset flex items-center gap-6 caps-sm text-faint">
                <span>2Y–10Y spread: <span className="text-amber-sand font-mono-data">
                  {macro.curve?.spread_2y10y_bp != null ? `${macro.curve.spread_2y10y_bp >= 0 ? "+" : ""}${macro.curve.spread_2y10y_bp}bp` : "–"}
                </span></span>
                <span>Curve: <span className="text-amber-sand">{macro.curve?.label ?? "–"}</span></span>
              </div>
            </div>
          </section>
        )}

        {/* II. Risk Indicators */}
        {macro && (
          <section>
            <SectionLabel numeral="II" title="Risk Indicators" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <VolCard title="DXY Dollar Index" data={macro.dxy} />
              <VolCard title="VIX Volatility" data={macro.vix} />
              <div className="bg-surface border hairline p-5">
                <div className="flex items-start justify-between hairline-b pb-3 mb-3">
                  <span className="caps-sm text-faint">HY Credit Spread</span>
                  <Badge alert={macro.hy_oas?.alert} />
                </div>
                <div className="font-mono-data text-paper text-[24px] leading-none mb-4">
                  {macro.hy_oas?.current != null ? `${fmt(macro.hy_oas.current, 2)}%` : "–"}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="caps-sm text-faint">5d chg</span>
                    <span className={`font-mono-data text-[12px] ${chgColor(macro.hy_oas?.d5_chg, true)}`}>
                      {macro.hy_oas?.d5_chg != null ? fmtSigned(macro.hy_oas.d5_chg, 2, "%") : "–"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="caps-sm text-faint">20d chg</span>
                    <span className={`font-mono-data text-[12px] ${chgColor(macro.hy_oas?.d20_chg, true)}`}>
                      {macro.hy_oas?.d20_chg != null ? fmtSigned(macro.hy_oas.d20_chg, 2, "%") : "–"}
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
            <SectionLabel numeral="III" title="Equities & Commodities" subtitle="SMA analysis" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SMAPriceCard title="Nasdaq-100" data={macro.nasdaq100} />
              <VolCard title="VXN — Nasdaq Vol" data={macro.vxn} />
              <SMAPriceCard title="S&P 500" data={macro.sp500} />
              <SMAPriceCard title="Brent Crude Oil" data={macro.brent} />
            </div>
          </section>
        )}

        {/* IV. Metals */}
        {macro && (
          <section>
            <SectionLabel numeral="IV" title="Metals" subtitle="SMA analysis" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SMAPriceCard title="Gold" data={macro.gold} />
              <SMAPriceCard title="Silver" data={macro.silver} />
              <SMAPriceCard title="Platinum" data={macro.platinum} />
              <SMAPriceCard title="Copper" data={macro.copper} />
            </div>
          </section>
        )}

      </div>

      <footer className="max-w-[1440px] mx-auto px-8 py-6 hairline-t">
        <span className="caps-sm text-faint">Data: yFinance · FRED (HY OAS) · 5min cache · AI organizes reality. Humans make decisions.</span>
      </footer>
    </main>
  );
}
