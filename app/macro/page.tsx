"use client";

/**
 * app/macro/page.tsx  — Macro Economic Dashboard
 *
 * Matches the BTC dashboard design system:
 *   - Background: #0B0B0C
 *   - Accent: #D9A84D (amber)
 *   - Fonts: Instrument Serif (display) + IBM Plex Sans (body) + IBM Plex Mono (data)
 *
 * Data sources:
 *   /macro/metrics  — yields, DXY, VIX, HY OAS  (from macro_routes.py)
 *   /metrics        — reuses stablecoin, ETF flow, funding, OI cards
 *
 * Add this page at:  app/macro/page.tsx
 * Add nav link in:   app/page.tsx header  →  href="/macro"
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

interface MacroMetrics {
  updated_at: string;
  yields: Record<"1y" | "2y" | "3y" | "5y" | "10y", YieldTenor>;
  curve: { spread_2y10y_bp: number | null; label: string };
  dxy: {
    current: number | null;
    d5_chg: number | null;
    d5_pct: number | null;
    d20_chg: number | null;
    d20_pct: number | null;
    percentile: number | null;
    alert: string;
    pattern: string;
    error?: string;
  };
  vix: {
    current: number | null;
    d5_chg: number | null;
    d5_pct: number | null;
    d20_chg: number | null;
    d20_pct: number | null;
    percentile: number | null;
    alert: string;
    pattern: string;
    error?: string;
  };
  hy_oas: {
    current: number | null;
    d5_chg: number | null;
    d20_chg: number | null;
    percentile: number | null;
    alert: string;
    pattern: string;
    error?: string;
  };
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
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min — macro data is slow

// Alert → color token map (matches existing dashboard conventions)
const ALERT_COLORS: Record<string, string> = {
  "extreme": "text-red-400 bg-red-950 border-red-900",
  "fear spike": "text-red-400 bg-red-950 border-red-900",
  "stressed": "text-red-400 bg-red-950 border-red-900",
  "distress": "text-red-400 bg-red-950 border-red-900",
  "extreme inflow": "text-red-400 bg-red-950 border-red-900",
  "extreme leverage": "text-red-400 bg-red-950 border-red-900",
  "near 52w high": "text-amber-400 bg-amber-950 border-amber-900",
  "elevated": "text-amber-400 bg-amber-950 border-amber-900",
  "moderately stressed": "text-amber-400 bg-amber-950 border-amber-900",
  "watch": "text-amber-400 bg-amber-950 border-amber-900",
  "usd weakening": "text-green-400 bg-green-950 border-green-900",
  "cooling": "text-green-400 bg-green-950 border-green-900",
  "dry powder rising": "text-green-400 bg-green-950 border-green-900",
  "flow acceleration": "text-amber-400 bg-amber-950 border-amber-900",
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

function fmtPct(val: number | null): string {
  if (val === null) return "";
  return ` (${val >= 0 ? "+" : ""}${val.toFixed(1)}%)`;
}

function dxyLevelLabel(val: number | null): { label: string; color: string } {
  if (val === null) return { label: "", color: "" };
  if (val > 108)  return { label: "Significant tightening", color: "#E24B4A" };
  if (val > 105)  return { label: "Increasing risk",        color: "#E24B4A" };
  if (val > 103)  return { label: "Tightening",             color: "#D9A84D" };
  if (val >= 100) return { label: "Neutral",                color: "#6B6966" };
  return              { label: "Loose",                     color: "#7AB648" };
}

function dxyChgLabel(pct: number | null): { label: string; color: string } {
  if (pct === null) return { label: "", color: "" };
  const abs = Math.abs(pct);
  if (abs >= 4)  return { label: "Very large move", color: "#E24B4A" };
  if (abs >= 2)  return { label: "Strong move",     color: "#D9A84D" };
  if (abs >= 1)  return { label: "Watch",           color: "#D9A84D" };
  return              { label: "Normal",            color: "#6B6966" };
}

function chgColor(val: number | null, invertPositive = false): string {
  if (val === null) return "text-slate-500";
  const positive = val > 0;
  const red = invertPositive ? positive : !positive;
  return red ? "text-red-400" : "text-green-400";
}

// For yields, rising = warning; for DXY/VIX, falling is often good for BTC
function yieldChgColor(val: number | null): string {
  if (val === null) return "text-slate-500";
  return val > 0 ? "text-red-400" : "text-green-400";
}

function oasChgLabel(chg: number | null): { label: string; color: string } {
  if (chg === null) return { label: "", color: "" };
  if (chg > 1.0)  return { label: "Rapid deterioration", color: "#E24B4A" };
  if (chg > 0.5)  return { label: "Clear tightening",    color: "#E24B4A" };
  if (chg > 0.2)  return { label: "Watch",               color: "#D9A84D" };
  return               { label: "Normal",               color: "#6B6966" };
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

// ─── Sub-components ──────────────────────────────────────────────────────

function YieldTable({ yields, curve }: { yields: MacroMetrics["yields"]; curve: MacroMetrics["curve"] }) {
  const tenors: Array<"1y" | "2y" | "3y" | "5y" | "10y"> = ["1y", "2y", "3y", "5y", "10y"];
  return (
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
          {tenors.map((t, i) => {
            const y = yields[t];
            return (
              <tr key={t} className={`border-b border-slate-900 hover:bg-slate-900 transition-colors ${i === tenors.length - 1 ? "border-b-0" : ""}`}>
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">{t.toUpperCase()}</td>
                <td className="px-4 py-3 font-mono text-right text-base text-slate-100">
                  {y.current != null ? `${y.current.toFixed(2)}%` : "–"}
                </td>
                <td className={`px-4 py-3 font-mono text-right text-xs ${yieldChgColor(y.d1_chg)}`}>
                  {y.d1_chg != null ? `${y.d1_chg >= 0 ? "+" : ""}${y.d1_chg.toFixed(3)}` : "–"}
                </td>
                <td className={`px-4 py-3 font-mono text-right text-xs ${yieldChgColor(y.d5_chg)}`}>
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
            {curve.spread_2y10y_bp !== null
              ? `${curve.spread_2y10y_bp >= 0 ? "+" : ""}${curve.spread_2y10y_bp}bp`
              : "–"}
          </span>
        </span>
        <span>
          Curve: <span style={{ color: "#D9A84D" }}>{curve.label}</span>
        </span>
      </div>
    </div>
  );
}

function DXYCard({ dxy }: { dxy: MacroMetrics["dxy"] }) {
  if (dxy.error && !dxy.current)
    return <ErrorCard title="DXY Dollar Index" error={dxy.error} />;

  const level = dxyLevelLabel(dxy.current);
  const chg5  = dxyChgLabel(dxy.d5_pct);
  const chg20 = dxyChgLabel(dxy.d20_pct);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1">DXY Dollar Index</div>

      {/* Current value + level interpretation */}
      <div className="flex items-baseline gap-3 mb-1">
        <div className="font-mono text-3xl text-slate-100">
          {dxy.current?.toFixed(2) ?? "–"}
        </div>
        {level.label && (
          <span className="font-mono text-xs" style={{ color: level.color }}>
            {level.label}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm border-t border-slate-900 pt-3 mt-3">
        {/* T-5 row */}
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">T−5 (1w)</span>
          <div className="flex items-baseline gap-2">
            {chg5.label && chg5.label !== "Normal" && (
              <span className="font-mono text-xs" style={{ color: chg5.color }}>{chg5.label}</span>
            )}
            <span className={`font-mono text-xs ${chgColor(dxy.d5_chg, true)}`}>
              {fmtChg(dxy.d5_chg)}{fmtPct(dxy.d5_pct)}
            </span>
          </div>
        </div>

        {/* T-20 row */}
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">T−20 (1m)</span>
          <div className="flex items-baseline gap-2">
            {chg20.label && chg20.label !== "Normal" && (
              <span className="font-mono text-xs" style={{ color: chg20.color }}>{chg20.label}</span>
            )}
            <span className={`font-mono text-xs ${chgColor(dxy.d20_chg, true)}`}>
              {fmtChg(dxy.d20_chg)}{fmtPct(dxy.d20_pct)}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">52w percentile</span>
          <span className="font-mono text-xs text-slate-400">
            {dxy.percentile !== null ? `${dxy.percentile}th` : "–"}
          </span>
        </div>
      </div>

      <PercentileBar value={dxy.percentile} />
      <div className="mt-3 flex flex-col gap-1.5">
        <Badge alert={dxy.alert} />
        {dxy.pattern && (
          <p className="text-xs text-slate-600 mt-1">{dxy.pattern}</p>
        )}
      </div>
    </div>
  );
}

function VIXCard({ vix }: { vix: MacroMetrics["vix"] }) {
  if (vix.error && !vix.current)
    return <ErrorCard title="VIX Volatility Index" error={vix.error} />;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1">VIX Volatility Index</div>
      <div className="font-mono text-3xl text-slate-100 mb-4">
        {vix.current?.toFixed(1) ?? "–"}
      </div>
      <div className="space-y-2 text-sm border-t border-slate-900 pt-3">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">T−5 (1w)</span>
          <span className={`font-mono text-xs ${chgColor(vix.d5_chg, true)}`}>
            {fmtChg(vix.d5_chg)}{fmtPct(vix.d5_pct)}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">T−20 (1m)</span>
          <span className={`font-mono text-xs ${chgColor(vix.d20_chg, true)}`}>
            {fmtChg(vix.d20_chg)}{fmtPct(vix.d20_pct)}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">90d percentile</span>
          <span className="font-mono text-xs text-slate-400">
            {vix.percentile !== null ? `${vix.percentile}th` : "–"}
          </span>
        </div>
      </div>
      <PercentileBar value={vix.percentile} />
      <div className="mt-3 flex flex-col gap-1.5">
        <Badge alert={vix.alert} />
        {vix.pattern && (
          <p className="text-xs text-slate-600 mt-1">{vix.pattern}</p>
        )}
      </div>
    </div>
  );
}

function HYOASCard({ hy_oas }: { hy_oas: MacroMetrics["hy_oas"] }) {
  if (hy_oas.error && !hy_oas.current)
    return <ErrorCard title="HY Credit Spread (OAS)" error={hy_oas.error}
      hint="Set FRED_API_KEY in backend .env — free at fred.stlouisfed.org" />;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1">HY Credit Spread (OAS)</div>
      <div className="font-mono text-3xl text-slate-100 mb-4">
        {hy_oas.current !== null ? `${hy_oas.current.toFixed(2)}%` : "–"}
      </div>
      <div className="space-y-2 text-sm border-t border-slate-900 pt-3">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">T−5 (1w)</span>
          <span className={`font-mono text-xs ${chgColor(hy_oas.d5_chg, true)}`}>
            {hy_oas.d5_chg !== null ? `${hy_oas.d5_chg >= 0 ? "+" : ""}${hy_oas.d5_chg.toFixed(2)}%` : "–"}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
  <span className="text-slate-600">T−20 (1m)</span>
  <div className="flex items-baseline gap-2">
    {(() => {
      const chg20 = oasChgLabel(hy_oas.d20_chg);
      return chg20.label && chg20.label !== "Normal" ? (
        <span className="font-mono text-xs" style={{ color: chg20.color }}>{chg20.label}</span>
      ) : null;
    })()}
    <span className={`font-mono text-xs ${chgColor(hy_oas.d20_chg, true)}`}>
      {hy_oas.d20_chg !== null ? `${hy_oas.d20_chg >= 0 ? "+" : ""}${hy_oas.d20_chg.toFixed(2)}%` : "–"}
    </span>
  </div>
</div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">90d percentile</span>
          <span className="font-mono text-xs text-slate-400">
            {hy_oas.percentile !== null ? `${hy_oas.percentile}th` : "–"}
          </span>
        </div>
      </div>
      <PercentileBar value={hy_oas.percentile} />
      <div className="mt-3 flex flex-col gap-1.5">
        <Badge alert={hy_oas.alert} />
        {hy_oas.pattern && (
          <p className="text-xs text-slate-600 mt-1">{hy_oas.pattern}</p>
        )}
      </div>
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

// BTC metric card — reused from page 1 but simplified for the macro context
function BtcMetricCard({ name, metric }: { name: string; metric: BtcMetric }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">{name}</div>
        <Badge alert={metric.alert} />
      </div>
      <div className="font-mono text-2xl text-slate-100 mb-3">{metric.current}</div>
      <div className="space-y-1.5 text-xs border-t border-slate-900 pt-3">
        <div className="flex justify-between">
          <span className="text-slate-600">7d</span>
          <span className="font-mono text-slate-400">{metric.d7}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">vs 30d avg</span>
          <span className="font-mono text-slate-400">{metric.vs30d}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">90d percentile</span>
          <span className="font-mono text-slate-400">{metric.percentile}</span>
        </div>
      </div>
      {metric.pattern && metric.pattern !== "--" && (
        <p className="text-xs text-slate-600 mt-2">{metric.pattern}</p>
      )}
    </div>
  );
}

function MacroCausalChain({ macro }: { macro: MacroMetrics | null }) {
  if (!macro) return null;

  const signals: { dir: "up" | "down" | "neutral"; text: string }[] = [];
  const { dxy, vix, hy_oas, yields } = macro;

  if (dxy.percentile !== null) {
    if (dxy.percentile <= 25)
      signals.push({ dir: "down", text: "Dollar weakening (DXY low percentile) — historically BTC positive" });
    else if (dxy.percentile >= 75)
      signals.push({ dir: "up", text: "Dollar strengthening — headwind for risk assets" });
  }

  if (vix.current !== null) {
    if (vix.current < 16 && (vix.d20_chg ?? 0) < 0)
      signals.push({ dir: "down", text: `VIX compressing to ${vix.current.toFixed(1)} — risk appetite returning` });
    else if (vix.current >= 25)
      signals.push({ dir: "up", text: `VIX elevated at ${vix.current.toFixed(1)} — market stress, risk-off` });
    else
      signals.push({ dir: "neutral", text: `VIX at ${vix.current.toFixed(1)} — neutral volatility regime` });
  }

  if (hy_oas.current !== null) {
    if (hy_oas.current >= 450)
      signals.push({ dir: "up", text: `HY OAS at ${hy_oas.current.toFixed(0)}bp — credit stress elevated` });
    else if ((hy_oas.d5_chg ?? 0) < -15)
      signals.push({ dir: "down", text: `HY spreads tightening (${hy_oas.d5_chg?.toFixed(0)}bp 1w) — credit improving` });
    else
      signals.push({ dir: "neutral", text: `HY OAS ${hy_oas.current.toFixed(0)}bp — moderately stressed, watch direction` });
  }

  if (yields["10y"].percentile !== null && yields["10y"].percentile >= 75)
    signals.push({ dir: "up", text: `10Y yield near 52w high (${yields["10y"].percentile}th pctile) — tightening real rates` });

  const colorMap = {
    up: "#E24B4A",
    down: "#7AB648",
    neutral: "#D9A84D",
  };
  const arrowMap = { up: "↑", down: "↓", neutral: "→" };

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
            {signals.length === 0 && (
              <div className="text-sm text-slate-600">Loading macro signals…</div>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-600 mb-3">Main contradiction</div>
          <div className="rounded-lg border p-4" style={{ background: "#1A1508", borderColor: "#3A3228" }}>
            <p className="text-sm text-slate-400 leading-relaxed">
              {(() => {
                const bullish = signals.filter(s => s.dir === "down").length;
                const bearish = signals.filter(s => s.dir === "up").length;
                if (bullish > 0 && bearish > 0)
                  return "Mixed macro environment — some risk-on signals (USD/VIX) alongside tighter financial conditions (yields/credit). BTC acting as both risk asset and macro hedge. Watch HY spread direction as tie-breaker.";
                if (bullish > bearish)
                  return "Macro environment broadly supportive — weak dollar, compressed volatility, tightening credit spreads. Watch for yield ceiling as potential headwind.";
                if (bearish > bullish)
                  return "Macro environment cautious — rising yields and credit stress dominate. BTC upside may depend on ETF demand absorbing macro headwinds.";
                return "Macro environment neutral — no strong directional signal. Focus on BTC-specific capital flows.";
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function MacroDashboard() {
  const [macro, setMacro]       = useState<MacroMetrics | null>(null);
  const [btcMetrics, setBtcMetrics] = useState<Record<string, BtcMetric>>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [macroRes, btcRes] = await Promise.all([
        fetch(`${API}/macro/metrics`),
        fetch(`${API}/metrics`),
      ]);

      if (!macroRes.ok) throw new Error(`Macro API ${macroRes.status}`);
      const macroData: MacroMetrics = await macroRes.json();
      setMacro(macroData);
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));

      if (btcRes.ok) {
        const btcData = await btcRes.json();
        // Only pull the 3 metrics we show on macro page
        const relevant: Record<string, BtcMetric> = {};
        if (btcData.stablecoin_supply) relevant["stablecoin_supply"] = btcData.stablecoin_supply;
        if (btcData.etf_flow)          relevant["etf_flow"]          = btcData.etf_flow;
        if (btcData.funding)           relevant["funding"]            = btcData.funding;
        setBtcMetrics(relevant);
      }

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

          {/* Nav — matches BTC page nav pattern */}
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
            <YieldTable yields={macro.yields} curve={macro.curve} />
          </section>
        )}

        {/* II. Risk Indicators */}
        {macro && (
          <section>
            <SectionLabel num="II" title="Risk Indicators" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DXYCard dxy={macro.dxy} />
              <VIXCard vix={macro.vix} />
              <HYOASCard hy_oas={macro.hy_oas} />
            </div>
          </section>
        )}

        {/* III. BTC Capital Metrics (reused from page 1) */}
        <section>
          <SectionLabel num="III" title="BTC Capital Metrics" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {btcMetrics.stablecoin_supply && (
              <BtcMetricCard name="Stablecoin Market Cap" metric={btcMetrics.stablecoin_supply} />
            )}
            {btcMetrics.etf_flow && (
              <BtcMetricCard name="BTC ETF Net Flow" metric={btcMetrics.etf_flow} />
            )}
            {btcMetrics.funding && (
              <BtcMetricCard name="Funding Rate" metric={btcMetrics.funding} />
            )}
            {Object.keys(btcMetrics).length === 0 && !loading && (
              <div className="col-span-3 text-sm text-slate-600 font-mono">
                BTC metrics unavailable — check /metrics endpoint.
              </div>
            )}
          </div>
        </section>

        {/* IV. Macro Causal Chain */}
        {macro && (
          <section>
            <SectionLabel num="IV" title="Macro Causal Chain" />
            <MacroCausalChain macro={macro} />
          </section>
        )}

        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4">
          <span>Data: yFinance (yields, DXY, VIX) · FRED (HY OAS) · Backend cache 5min</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>
      </div>
    </main>
  );
}
