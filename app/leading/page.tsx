"use client";

/**
 * app/leading/page.tsx — Leading Signals Dashboard
 *
 * Matches the existing design system exactly:
 *   Background: #0B0B0C  |  Accent: #D9A84D  |  Fonts: Instrument Serif + IBM Plex Sans + IBM Plex Mono
 *
 * Data source: GET /leading/all
 *
 * Place this file at: app/leading/page.tsx
 * Add nav link in: app/page.tsx and app/macro/page.tsx headers → href="/leading"
 */

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadingIndicator {
  name:        string;
  category:    string;
  lead_time:   string;
  alert:       string;
  alert_level: "extreme" | "notable" | "neutral" | "none";
  pattern?:    string;
  error?:      string;
  [key: string]: unknown;
}

interface LeadingAll {
  updated_at:         string;
  options:            LeadingIndicator;
  coinbase_premium:   LeadingIndicator;
  funding_cumulative: LeadingIndicator;
  tether_mints:       LeadingIndicator;
  basis_enhanced:     LeadingIndicator;
  global_m2:          LeadingIndicator;
  cot:                LeadingIndicator;
  breakevens:         LeadingIndicator;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min — /leading/all is slow

// ─── Alert helpers ────────────────────────────────────────────────────────────

function alertBorder(level: string) {
  switch (level) {
    case "extreme": return "border-red-900";
    case "notable": return "border-amber-900";
    case "neutral": return "border-slate-700";
    default:        return "border-slate-800";
  }
}
function alertBg(level: string) {
  switch (level) {
    case "extreme": return "bg-red-950/60";
    case "notable": return "bg-amber-950/40";
    default:        return "bg-transparent";
  }
}
function alertText(level: string) {
  switch (level) {
    case "extreme": return "text-red-400";
    case "notable": return "text-amber-500";
    case "neutral": return "text-slate-400";
    default:        return "text-slate-600";
  }
}
function alertBadgeClasses(level: string) {
  return `${alertBorder(level)} ${alertBg(level)} ${alertText(level)}`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="font-mono text-xs border px-2 py-0.5"
        style={{ color: "#8A6D30", background: "#1A1508", borderColor: "#3A3228" }}
      >
        {num}
      </span>
      <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "#6B6056" }}>
        {title}
      </span>
      {subtitle && (
        <>
          <div className="flex-1 border-t border-slate-900" />
          <span className="text-xs font-mono text-slate-700">{subtitle}</span>
        </>
      )}
      {!subtitle && <div className="flex-1 border-t border-slate-900" />}
    </div>
  );
}

function LeadTimePill({ label }: { label: string }) {
  const isRegime = label.includes("week") || label.includes("Real-time");
  return (
    <span
      className="text-xs font-mono border px-2 py-0.5 whitespace-nowrap"
      style={
        isRegime
          ? { color: "#4A4A4C", borderColor: "#2A2A2C" }
          : { color: "#8A6D30", borderColor: "#3A3228" }
      }
    >
      {label}
    </span>
  );
}

function PercentileBar({ value }: { value: number | null }) {
  if (value == null) return null;
  const color =
    value >= 80 ? "#E24B4A" :
    value >= 60 ? "#D9A84D" :
    value <= 20 ? "#7AB648" : "#4A4A4C";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-[3px] bg-slate-900 overflow-hidden">
        <div className="h-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono text-[10px]" style={{ color }}>{value}th</span>
    </div>
  );
}

// ─── Leading Indicator Card ───────────────────────────────────────────────────

function LeadingCard({ data }: { data: LeadingIndicator }) {
  const level = data.alert_level ?? "none";

  // Error state
  if (data.error) {
    return (
      <div className="border border-slate-800 bg-slate-950 p-4 flex flex-col gap-3">
        <div className="text-xs font-mono text-slate-600">{data.category}</div>
        <div className="text-sm font-medium text-slate-300">{data.name}</div>
        <div className="text-xs font-mono text-slate-700 leading-snug">{data.error}</div>
        <LeadTimePill label={data.lead_time} />
      </div>
    );
  }

  // Primary display value — pick the most meaningful field per indicator
  const d = data as Record<string, unknown>;
  const primaryValue =
    (d.current as string) ??
    (d.annualized as string) ??
    (d.global_m2 as string) ??
    (d.be_10y as string) ??
    (d.lev_net_pct as string) ??
    "–";

  // Secondary rows — indicator-specific
  const rows: { label: string; value: string | null }[] = [];

  // Options: IV term structure
  if (d.iv_7d !== undefined) {
    rows.push({ label: "IV 7d",              value: d.iv_7d  != null ? `${d.iv_7d}%`  : "–" });
    rows.push({ label: "IV 30d",             value: d.iv_30d != null ? `${d.iv_30d}%` : "–" });
    rows.push({ label: "Risk reversal 25Δ",  value: d.risk_reversal_25d != null ? `${d.risk_reversal_25d}%` : "–" });
    rows.push({ label: "Term structure",      value: d.term_structure_label as string ?? "–" });
  }
  // Coinbase premium
  else if (d.avg_24h !== undefined) {
    rows.push({ label: "Avg 24h",   value: d.avg_24h   as string ?? "–" });
    rows.push({ label: "Trend 6h",  value: d.trend_6h  as string ?? "–" });
    rows.push({ label: "Avg 7d",    value: d.avg_7d    as string ?? "–" });
  }
  // Cumulative funding
  else if (d.cumulative_7d !== undefined) {
    rows.push({ label: "8h rate",    value: d.current_8h  as string ?? "–" });
    rows.push({ label: "Cum 7d",     value: d.cumulative_7d  as string ?? "–" });
    rows.push({ label: "Cum 30d",    value: d.cumulative_30d as string ?? "–" });
  }
  // Tether mints
  else if (d.daily_change !== undefined && d.cumulative_7d === undefined) {
    rows.push({ label: "USDT supply",  value: d.usdt_supply as string ?? "–" });
    rows.push({ label: "Daily Δ",      value: d.daily_change as string ?? "–" });
    rows.push({ label: "Cum 7d",       value: (d.cum_7d as string) ?? "Building…" });
    if (d.large_mint_today) {
      rows.push({ label: "⚡ Large mint today", value: "" });
    }
  }
  // Basis enhanced
  else if (d.trend_5d !== undefined) {
    rows.push({ label: "Trend 5d",    value: d.trend_5d    as string ?? "–" });
    rows.push({ label: "Raw basis",   value: d.raw_basis   as string ?? "–" });
    rows.push({ label: "Days to exp", value: d.days_to_exp != null ? `${d.days_to_exp}d` : "–" });
  }
  // Global M2
  else if (d.yoy_growth !== undefined) {
    rows.push({ label: "YoY growth",  value: d.yoy_growth as string ?? "–" });
    rows.push({ label: "MoM growth",  value: d.mom_growth as string ?? "–" });
    rows.push({ label: "US M2",       value: d.us_m2      as string ?? "–" });
    rows.push({ label: "Data lag",    value: "~6 weeks (FRED)" });
  }
  // COT
  else if (d.lev_net !== undefined) {
    rows.push({ label: "Lev net",      value: d.lev_net     as string ?? "–" });
    rows.push({ label: "% of OI",      value: d.lev_net_pct as string ?? "–" });
    rows.push({ label: "Report date",  value: d.report_date as string ?? "–" });
    if (d.flip_note) {
      rows.push({ label: "⚡ Flip",    value: d.flip_note as string });
    }
  }
  // Breakevens
  else if (d.be_5y !== undefined) {
    rows.push({ label: "5Y BE",    value: d.be_5y   as string ?? "–" });
    rows.push({ label: "10Y BE",   value: d.be_10y  as string ?? "–" });
    rows.push({ label: "5Y5Y fwd", value: d.be_5y5y as string ?? "–" });
    rows.push({ label: "10Y Δ5d",  value: d.d5_10y  as string ?? "–" });
  }

  const percentile = d.percentile as number | null ?? null;

  return (
    <div
      className={`border p-4 flex flex-col gap-3 transition-colors duration-150 hover:bg-slate-900/40 ${
        level === "extreme" ? "border-red-900/60 bg-red-950/10" :
        level === "notable" ? "border-amber-900/40 bg-amber-950/5" :
        "border-slate-800 bg-slate-950"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-mono text-slate-600 mb-0.5 uppercase tracking-wide">
            {data.category}
          </div>
          <div className="text-sm font-medium text-slate-200 leading-tight">{data.name}</div>
        </div>
        {data.alert && data.alert !== "—" && (
          <span
            className={`text-[10px] font-mono border px-1.5 py-0.5 whitespace-nowrap shrink-0 ${alertBadgeClasses(level)}`}
          >
            {level === "extreme" ? "EXTREME" : level === "notable" ? "NOTABLE" : data.alert_level?.toUpperCase()}
          </span>
        )}
      </div>

      {/* Primary value */}
      <div className="font-mono text-xl text-slate-100 tracking-tight leading-none">
        {primaryValue}
      </div>

      {/* Secondary rows */}
      {rows.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-slate-900 pt-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wide shrink-0">
                {row.label}
              </span>
              <span className="text-[11px] font-mono text-slate-400 text-right">{row.value ?? "–"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Percentile bar */}
      {percentile != null && (
        <div className="border-t border-slate-900 pt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wide">Percentile</span>
            <span className="text-[10px] font-mono text-slate-600">{percentile}th</span>
          </div>
          <PercentileBar value={percentile} />
        </div>
      )}

      {/* Alert text */}
      {data.alert && data.alert !== "—" && (
        <div className={`text-[11px] font-mono leading-snug border-t border-slate-900 pt-2 ${alertText(level)}`}>
          {data.alert}
        </div>
      )}

      {/* Pattern */}
      {data.pattern && data.pattern !== "—" && (
        <div className="text-[11px] text-slate-500 italic leading-snug">
          {data.pattern}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-900 mt-auto">
        <LeadTimePill label={data.lead_time} />
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: "#8DA078" }}
          />
          <span className="text-[10px] font-mono text-slate-700">Live</span>
        </div>
      </div>
    </div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SignalSummaryBar({ data }: { data: LeadingAll }) {
  const all: LeadingIndicator[] = [
    data.options, data.coinbase_premium, data.funding_cumulative,
    data.tether_mints, data.basis_enhanced,
    data.global_m2, data.cot, data.breakevens,
  ];

  const extreme = all.filter(d => !d.error && d.alert_level === "extreme").length;
  const notable = all.filter(d => !d.error && d.alert_level === "notable").length;
  const errors  = all.filter(d => !!d.error).length;

  return (
    <div className="flex items-center gap-4 border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-mono">
      <span className="text-slate-600">Signal status</span>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full inline-block bg-red-500" />
        <span className="text-red-400">{extreme} extreme</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full inline-block bg-amber-500" />
        <span className="text-amber-500">{notable} notable</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full inline-block bg-slate-700" />
        <span className="text-slate-600">{8 - extreme - notable - errors} neutral</span>
      </div>
      {errors > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full inline-block bg-slate-800" />
          <span className="text-slate-700">{errors} unavailable</span>
        </div>
      )}
      <div className="ml-auto text-slate-700">
        AI organizes reality. Humans make decisions.
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadingPage() {
  const [data, setData]           = useState<LeadingAll | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [flushing, setFlushing]   = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API}/leading/all`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LeadingAll = await res.json();
      setData(json);
      setLastUpdated(
        new Date(json.updated_at).toLocaleTimeString("en-US", {
          hour: "2-digit", minute: "2-digit", timeZone: "UTC",
        })
      );
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

  const flushCache = async () => {
    setFlushing(true);
    try {
      await fetch(`${API}/leading/cache/flush`);
      await fetchAll();
    } finally {
      setFlushing(false);
    }
  };

  // Short-term: 1-7 day signals
  const shortTerm: (keyof LeadingAll)[] = [
    "options", "coinbase_premium", "funding_cumulative", "tether_mints", "basis_enhanced",
  ];
  // Regime: 1-12 week signals
  const regime: (keyof LeadingAll)[] = [
    "global_m2", "cot", "breakevens",
  ];

  return (
    <main
      className="min-h-screen p-6"
      style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-900">
          <div className="flex items-baseline gap-4">
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, fontWeight: 400 }}>
              Leading Signals
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: loading ? "#4A4A4C" : "#8DA078" }}
              />
              {lastUpdated ? `Updated ${lastUpdated} UTC` : "Loading…"}
            </div>
          </div>

          <nav className="flex gap-1">
            <a href="/"        className="text-xs px-3 py-1.5 border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">BTC</a>
            <a href="/macro"   className="text-xs px-3 py-1.5 border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors">Macro</a>
            <span className="text-xs px-3 py-1.5 border font-mono" style={{ background: "#1C1C1E", color: "#D9A84D", borderColor: "#3A3228" }}>
              Leading
            </span>
            <button
              onClick={flushCache}
              disabled={flushing}
              className="text-xs px-3 py-1.5 border border-slate-800 text-slate-600 hover:text-slate-400 transition-colors font-mono disabled:opacity-40"
            >
              {flushing ? "↺ flushing…" : "↺ flush"}
            </button>
          </nav>
        </header>

        {/* Error */}
        {error && (
          <div className="border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — check that /leading/all is reachable on the backend.
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="text-center py-24 text-slate-700 font-mono text-sm animate-pulse">
            Fetching leading signals… (first load may take 5-10s)
          </div>
        )}

        {data && (
          <>
            {/* Summary bar */}
            <SignalSummaryBar data={data} />

            {/* I. Short-term signals */}
            <section>
              <SectionLabel
                num="I"
                title="Short-Term Signals"
                subtitle="1–7 day lead · Deribit · CryptoQuant · CoinGecko"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {shortTerm.map(k => (
                  <LeadingCard key={k as string} data={data[k] as LeadingIndicator} />
                ))}
              </div>
            </section>

            {/* II. Regime signals */}
            <section>
              <SectionLabel
                num="II"
                title="Regime Signals"
                subtitle="1–12 week lead · FRED · CFTC"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {regime.map(k => (
                  <LeadingCard key={k as string} data={data[k] as LeadingIndicator} />
                ))}
              </div>

              {/* Data lag note */}
              <div className="mt-3 border border-slate-900 bg-slate-950 px-4 py-2.5 flex items-center gap-4 text-[10px] font-mono text-slate-700">
                <span>Global M2: ~6 week FRED lag (monthly data)</span>
                <span>·</span>
                <span>COT: ~4 day lag (CFTC Friday release, positions as of prior Tuesday)</span>
                <span>·</span>
                <span>Breakevens: real-time FRED (daily)</span>
              </div>
            </section>

            <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4">
              <span>Data: Deribit · CryptoQuant · CoinGecko · FRED · CFTC · yFinance</span>
              <span>·</span>
              <span>AI organizes reality. Humans make decisions.</span>
            </footer>
          </>
        )}

      </div>
    </main>
  );
}
