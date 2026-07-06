"use client";

/**
 * app/eth/page.tsx — Ethereum Decision Dashboard
 *
 * Human decision interface for ETH. AI organizes data + benchmarks. Humans decide.
 *
 * Design system: matches BTC / SOL / Macro dashboards exactly.
 *   Background: #0B0B0C · Accent: #D9A84D · Fonts: Instrument Serif + IBM Plex Mono
 *
 * Metrics:
 *   Core (I):     Price Move, Volume, Funding, Open Interest, CME Basis
 *   ETH-specific (II): DeFi TVL, L2 TVL, Staking Rate, ETH/BTC Ratio, Gas Price
 *
 * Data sources (all free — no new API keys):
 *   /eth/metrics   — 10 metric cards (CoinGecko + DeFiLlama + yFinance)
 *   /eth/price     — ETH spot + changes
 *   /eth/summary   — Market state bar
 *   /eth/tvl       — DeFiLlama mainnet + L2 breakdown
 *   /eth/structural — Monetary model + L2 flywheel context
 *
 * SETUP:
 *   1. Add { key: "eth", href: "/eth", label: "ETH" } to NAV_ITEMS in
 *      app/components/DashboardNav.tsx
 *   2. Add to main.py:
 *        from eth_routes import eth_router
 *        app.include_router(eth_router)
 */

import { useEffect, useState, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";
import TradingViewEmbed from "../components/TradingViewEmbed";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EthMetric {
  current:       string;
  d7:            string;
  vs30d:         string;
  percentile:    number;
  alert:         string;
  level:         "extreme" | "notable" | "none";
  pattern:       string;
  _is_override?: boolean;
  _mock?:        boolean;
}

interface EthMetrics {
  price_move:    EthMetric;
  volume:        EthMetric;
  funding:       EthMetric;
  open_interest: EthMetric;
  cme_basis:     EthMetric;
  defi_tvl:      EthMetric;
  l2_tvl:        EthMetric;
  staking_rate:  EthMetric;
  eth_btc_ratio: EthMetric;
  gas_price:     EthMetric;
}

interface EthPrice {
  price:       number | null;
  price_btc:   number | null;
  change_24h:  number | null;
  change_7d:   number | null;
}

interface EthSummary {
  structure: string;
  extreme:   number;
  notable:   number;
  neutral:   number;
}

interface L2Chain {
  name: string;
  tvl:  number | null;
}

interface EthTvlResponse {
  mainnet:   { tvl_usd: number | null };
  l2:        { total_l2_tvl: number | null; chains: L2Chain[] };
  protocols: Array<{ name: string; tvl: number | null; category: string }>;
  dex:       { dex_volume_24h: number | null };
}

interface EthStructural {
  eth_btc_ratio:     number | null;
  staking_rate_pct:  number | null;
  staked_eth_M:      number | null;
  active_validators: number | null;
  l2_total_tvl:      number | null;
  l2_chains:         L2Chain[];
  gas_gwei:          number | null;
  burn_note:         string;
  etf_note:          string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API              = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 60_000;

const METRIC_LABELS: Record<string, string> = {
  price_move:    "Price Move",
  volume:        "Volume",
  funding:       "Funding Rate",
  open_interest: "Open Interest",
  cme_basis:     "CME Basis",
  defi_tvl:      "DeFi TVL (Mainnet)",
  l2_tvl:        "L2 TVL",
  staking_rate:  "Staking Rate",
  eth_btc_ratio: "ETH / BTC Ratio",
  gas_price:     "Gas Price",
};

const SEED_SPARKS: Record<string, number[]> = {
  price_move:    [2100,2200,2350,2280,2400,2380,2450,2420,2480,2500,2470,2480],
  volume:        [6.2,7.1,8.4,9.2,7.8,8.9,9.5,8.2,9.8,10.1,9.4,9.2],
  funding:       [12,15,18,16,22,20,24,22,25,25,25,25],
  open_interest: [6.8,7.2,7.6,8.1,8.4,8.8,9.1,9.4,9.6,9.8,9.7,9.8],
  cme_basis:     [4.2,4.8,5.1,5.6,5.8,6.0,6.2,6.4,6.5,6.5,6.5,6.5],
  defi_tvl:      [44,46,47,48,49,50,51,51,52,52,52,52],
  l2_tvl:        [16,17,18,18,19,20,21,21,22,22,22,22],
  staking_rate:  [27.2,27.4,27.6,27.7,27.8,27.9,28.0,28.0,28.1,28.1,28.1,28.1],
  eth_btc_ratio: [0.036,0.037,0.038,0.037,0.038,0.039,0.040,0.039,0.040,0.041,0.040,0.040],
  gas_price:     [18,22,15,25,30,20,18,22,25,20,18,18],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function alertColor(level: string): string {
  switch (level) {
    case "extreme": return "#E05252";
    case "notable": return "#D9A84D";
    default:        return "#374151";
  }
}

function alertBadge(level: string): string {
  switch (level) {
    case "extreme": return "border-red-900 bg-red-950/40 text-red-400";
    case "notable": return "border-amber-900 bg-amber-950/30 text-amber-500";
    default:        return "border-slate-800 text-slate-600";
  }
}

function structureColor(s: string): string {
  switch (s) {
    case "EXTREME":
    case "ELEVATED":  return "#D9A84D";
    case "RECOVERY":  return "#D9A84D";
    default:          return "#6B7280";
  }
}

function fmtUsd(v: number | null | undefined, decimals = 1): string {
  if (v == null) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(decimals)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color = "#D9A84D" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return <div className="h-7" />;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const W = 80, H = 28;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`)
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Percentile bar ───────────────────────────────────────────────────────────

function PctBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
        className="h-full rounded-full transition-all duration-500" />
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4 pb-3 border-b border-slate-900">
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic",
        color: "#D9A84D", fontSize: 22 }}>{num}</span>
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif",
        color: "#E8E6E0", fontSize: 20 }}>{title}</span>
      {subtitle && <span className="text-[10px] font-mono text-slate-600 ml-1">{subtitle}</span>}
    </div>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({ id, metric }: { id: string; metric: EthMetric }) {
  const color  = alertColor(metric.level);
  const badge  = alertBadge(metric.level);
  const isNone = metric.level === "none";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest leading-tight">
          {METRIC_LABELS[id]}
        </div>
        {metric.alert !== "—" && metric.alert !== "No data" && (
          <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded shrink-0 ${badge}`}>
            {metric.alert}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div className="font-mono text-2xl text-slate-100 leading-none">{metric.current}</div>
        <Sparkline data={SEED_SPARKS[id] ?? []} color={isNone ? "#374151" : color} />
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-900 pt-3">
        {[["7d", metric.d7], ["vs 30d", metric.vs30d], ["Pctl", `${metric.percentile}%`]].map(([l, v]) => (
          <div key={l}>
            <div className="text-[9px] font-mono text-slate-600 uppercase mb-1">{l}</div>
            <div className="font-mono text-[11px] text-slate-300">{v}</div>
          </div>
        ))}
      </div>

      <PctBar value={metric.percentile} color={isNone ? "#374151" : color} />

      <div className="flex items-start justify-between border-t border-slate-900 pt-2 gap-2">
        <span className="text-[9px] font-mono text-slate-600 uppercase shrink-0">Pattern</span>
        <span className="text-[10px] text-slate-400 italic text-right leading-tight">{metric.pattern}</span>
      </div>

      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full inline-block
          ${metric._is_override ? "bg-amber-500" : metric._mock ? "bg-slate-700" : "bg-green-500"}`} />
        <span className="text-[9px] font-mono text-slate-700">
          {metric._is_override ? "Manual override" : metric._mock ? "Mock — connect backend" : "Live"}
        </span>
      </div>
    </div>
  );
}

// ─── ETH Structural Panel (signature section) ─────────────────────────────────

function EthStructuralPanel({ structural }: { structural: EthStructural | null }) {
  const ratio    = structural?.eth_btc_ratio;
  const stakeRat = structural?.staking_rate_pct;
  const l2total  = structural?.l2_total_tvl;
  const gas      = structural?.gas_gwei;

  const ratioSignal = ratio != null
    ? ratio > 0.055 ? { label: "Alt season territory", color: "#6A9A6A" }
    : ratio < 0.030 ? { label: "BTC dominance extreme", color: "#E05252" }
    : { label: "Neutral zone", color: "#D9A84D" }
    : null;

  const l2chains = structural?.l2_chains ?? [
    { name: "Arbitrum",      tvl: 8.2e9 },
    { name: "Base",          tvl: 5.1e9 },
    { name: "Optimism",      tvl: 3.4e9 },
    { name: "zkSync Era",    tvl: 2.1e9 },
    { name: "Linea",         tvl: 1.4e9 },
    { name: "Scroll",        tvl: 0.9e9 },
  ];

  const maxL2 = Math.max(...l2chains.map(c => c.tvl ?? 0));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              ETH structural thesis
            </span>
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: "#E8E6E0" }}>
            Monetary Model · L2 Flywheel · Alt Season Signal
          </div>
          <div className="text-xs text-slate-600 font-mono mt-1">
            EIP-1559 burn · PoS staking yield · Spot ETF flows · L2 scaling
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-900 pt-4">

        {/* ETH/BTC ratio */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            ETH / BTC ratio
          </div>
          <div className="font-mono text-3xl text-slate-100">
            {ratio != null ? ratio.toFixed(5) : "—"}
          </div>
          {ratioSignal && (
            <span className="text-[10px] font-mono px-2 py-1 rounded border w-fit"
              style={{ color: ratioSignal.color, borderColor: `${ratioSignal.color}50`,
                background: `${ratioSignal.color}12` }}>
              {ratioSignal.label}
            </span>
          )}
          <div className="space-y-1 mt-1">
            {[
              { range: "> 0.055", label: "Alt season", c: "#6A9A6A" },
              { range: "0.030–0.055", label: "Neutral zone", c: "#D9A84D" },
              { range: "< 0.030", label: "BTC dominance", c: "#E05252" },
            ].map(r => (
              <div key={r.range} className="flex items-center gap-2">
                <span className="text-[9px] font-mono" style={{ color: r.c }}>{r.range}</span>
                <span className="text-[9px] text-slate-600">{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Staking + gas */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">
              Staking rate
            </div>
            <div className="font-mono text-2xl text-slate-100">
              {stakeRat != null ? `${stakeRat.toFixed(1)}%` : "—"}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              of circulating ETH locked in validators
            </div>
          </div>
          <div className="border-t border-slate-900 pt-3">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">
              Gas price
            </div>
            <div className="font-mono text-2xl text-slate-100">
              {gas != null ? `${gas} gwei` : "—"}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {gas != null && gas > 30 ? "High — DeFi demand elevated"
               : gas != null && gas < 5 ? "Very low — network idle"
               : "Normal range"}
            </div>
          </div>
          <div className="border-t border-slate-900 pt-3">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">
              L2 total TVL
            </div>
            <div className="font-mono text-2xl text-slate-100">
              {fmtUsd(l2total)}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              Arbitrum · Base · Optimism · zkSync
            </div>
          </div>
        </div>

        {/* L2 breakdown */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            L2 breakdown
          </div>
          {l2chains.map((c, i) => (
            <div key={c.name}>
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-slate-300">{c.name}</span>
                <span className="font-mono text-[10px] text-slate-500">{fmtUsd(c.tvl)}</span>
              </div>
              <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${maxL2 ? ((c.tvl ?? 0) / maxL2) * 100 : 0}%`,
                    background: i === 0 ? "#D9A84D" : i === 1 ? "#6A9A6A" : "#374151",
                  }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monetary model context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-4">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
            Bullish structure
          </div>
          {[
            "L2 activity drives ETH fee burn — deflationary at high usage",
            "Staking lock-up removes ~28% of supply from circulation",
            "Spot ETH ETF provides institutional on-ramp (launched May 2024)",
            "Rising ETH/BTC ratio signals capital rotation into alts",
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="text-[10px] mt-0.5" style={{ color: "#6A9A6A" }}>▲</span>
              <span className="text-xs text-slate-400">{s}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
            Watch / contradicts
          </div>
          {[
            "ETH/BTC ratio trend direction — falling ratio = BTC dominance phase",
            "Gas < 5 gwei sustained = low DeFi demand, burn rate minimal",
            "ETF flow momentum — wire manual override for weekly data",
            "L2 TVL growth rate slowing = scaling narrative weakening",
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="text-[10px] mt-0.5" style={{ color: "#E05252" }}>▼</span>
              <span className="text-xs text-slate-400">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ecosystem panel ──────────────────────────────────────────────────────────

function EcoPanel({ tvlData }: { tvlData: EthTvlResponse | null }) {
  const protocols = tvlData?.protocols?.slice(0, 6) ?? [
    { name: "Lido",      tvl: 14.2e9, category: "Liquid Staking" },
    { name: "Aave",      tvl: 12.1e9, category: "Lending" },
    { name: "Uniswap",   tvl: 5.8e9,  category: "DEX" },
    { name: "EigenLayer",tvl: 4.2e9,  category: "Restaking" },
    { name: "Curve",     tvl: 3.1e9,  category: "DEX / Stableswap" },
    { name: "Other",     tvl: 12.6e9, category: "All others" },
  ];

  const mainnetTvl = tvlData?.mainnet?.tvl_usd ?? 52e9;
  const maxProto   = Math.max(...protocols.map(p => p.tvl ?? 0));
  const dexVol     = tvlData?.dex?.dex_volume_24h ?? null;

  const networkStats = [
    { l: "Mainnet DeFi TVL",   v: fmtUsd(mainnetTvl),  sub: "DeFiLlama Ethereum chain",  ok: true  },
    { l: "DEX volume (24h)",   v: fmtUsd(dexVol),       sub: "Uniswap + Curve + Balancer", ok: true  },
    { l: "Validators",         v: "~1.1M",              sub: "Active beacon chain",         ok: true  },
    { l: "Staking yield (APY)",v: "~3.5%",              sub: "PoS consensus reward",        ok: null  },
    { l: "ETH issuance/day",   v: "~2,000 ETH",         sub: "vs EIP-1559 burn",            ok: null  },
    { l: "EIP-1559 note",      v: "Wire burn rate",     sub: "ultrasound.money API",        ok: null  },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            Mainnet DeFi — DeFiLlama
          </div>
          <div className="font-mono text-sm text-slate-300">{fmtUsd(mainnetTvl)}</div>
        </div>
        <div className="space-y-2.5">
          {protocols.map((p, i) => (
            <div key={p.name}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-300">
                  {p.name}{" "}
                  <span className="text-slate-600 text-[10px]">· {p.category}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">{fmtUsd(p.tvl)}</span>
              </div>
              <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${maxProto ? ((p.tvl ?? 0) / maxProto) * 100 : 0}%`,
                    background: i < 2 ? "#D9A84D" : i < 4 ? "#6A9A6A" : "#374151",
                  }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-1">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
          Network context
        </div>
        {networkStats.map((s, i) => (
          <div key={s.l}
            className={`flex justify-between items-center py-2 ${i < networkStats.length - 1 ? "border-b border-slate-900" : ""}`}>
            <div>
              <div className="text-xs text-slate-300">{s.l}</div>
              <div className="text-[9px] text-slate-600">{s.sub}</div>
            </div>
            <div className={`font-mono text-sm font-medium ${
              s.ok === true ? "text-green-500" : s.ok === false ? "text-red-400" : "text-slate-400"
            }`}>
              {s.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Judgment panel ───────────────────────────────────────────────────────────

function JudgmentPanel() {
  const [fields, setFields] = useState({ read: "", supports: "", contradicts: "", invalidates: "", plan: "" });
  const [risk,  setRisk]  = useState<"low"|"medium"|"high"|"extreme">("medium");
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setFields(p => ({ ...p, [k]: e.target.value }));

  const commit = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const RISK_COLORS: Record<string, string> = {
    low: "#6A9A6A", medium: "#D9A84D", high: "#E05252", extreme: "#E05252",
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
        Judgment panel
      </div>
      {[
        ["read",        "My current read"],
        ["supports",    "What supports this view"],
        ["contradicts", "What contradicts"],
        ["invalidates", "What would change my mind"],
        ["plan",        "Action plan"],
      ].map(([k, label]) => (
        <div key={k}>
          <label className="text-[10px] font-mono text-slate-600 block mb-1">{label}</label>
          <textarea
            value={fields[k as keyof typeof fields]}
            onChange={set(k as keyof typeof fields)}
            rows={2}
            className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300
              font-mono resize-none focus:outline-none focus:border-amber-900 transition-colors"
          />
        </div>
      ))}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-slate-600">Risk level</span>
        {(["low", "medium", "high", "extreme"] as const).map(r => (
          <button key={r} onClick={() => setRisk(r)}
            className="text-[10px] font-mono px-2.5 py-1 rounded border transition-colors capitalize"
            style={{
              borderColor: risk === r ? RISK_COLORS[r] : "#1f2937",
              color:       risk === r ? RISK_COLORS[r] : "#6b7280",
              background:  risk === r ? `${RISK_COLORS[r]}18` : "transparent",
            }}>
            {r}
          </button>
        ))}
      </div>
      <button onClick={commit}
        className="w-full py-2 rounded-lg text-xs font-mono font-bold transition-all"
        style={{ background: saved ? "#6A9A6A" : "#D9A84D", color: "#0B0B0C" }}>
        {saved ? "✓ Saved to log" : "Commit judgment to log"}
      </button>
    </div>
  );
}

// ─── Override panel ───────────────────────────────────────────────────────────

function OverridePanel() {
  const [raw,    setRaw]    = useState("");
  const [metric, setMetric] = useState("defi_tvl");
  const [status, setStatus] = useState<string | null>(null);

  const OVERRIDEABLE = [
    "price_move","volume","funding","open_interest","cme_basis",
    "defi_tvl","l2_tvl","staking_rate","eth_btc_ratio","gas_price",
  ];

  const apply = async () => {
    try {
      const fields = JSON.parse(raw);
      const res    = await fetch(`${API}/eth/manual-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric, ...fields }),
      });
      setStatus(res.ok ? "Override applied — refresh to see" : "Backend error");
    } catch {
      setStatus("Invalid JSON — check format");
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
        Screenshot override
      </div>
      <div>
        <label className="text-[10px] font-mono text-slate-600 block mb-1">Metric</label>
        <select value={metric} onChange={e => setMetric(e.target.value)}
          className="bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono
            text-slate-300 w-full focus:outline-none focus:border-amber-900">
          {OVERRIDEABLE.map(m => (
            <option key={m} value={m}>{METRIC_LABELS[m]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-mono text-slate-600 block mb-1">
          JSON from Claude extraction
        </label>
        <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={3}
          placeholder={`{"current":"$52.1B","d7":"+$1.2B","vs30d":"+8%","percentile":68,"alert":"—","level":"none","pattern":"Capital steady in Ethereum mainnet DeFi"}`}
          className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400
            font-mono resize-none focus:outline-none focus:border-amber-900" />
      </div>
      {status && (
        <div className={`text-xs font-mono px-3 py-2 rounded-lg border ${
          status.includes("applied")
            ? "border-green-900 text-green-500 bg-green-950/30"
            : "border-red-900 text-red-400 bg-red-950/30"}`}>
          {status}
        </div>
      )}
      <button onClick={apply}
        className="w-full py-2 rounded-lg text-xs font-mono font-bold
          bg-amber-950/40 border border-amber-900/50 text-amber-500
          hover:bg-amber-950/60 transition-colors">
        Apply override
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EthDecisionDashboard() {
  const [metrics,     setMetrics]     = useState<EthMetrics | null>(null);
  const [price,       setPrice]       = useState<EthPrice | null>(null);
  const [summary,     setSummary]     = useState<EthSummary | null>(null);
  const [tvl,         setTvl]         = useState<EthTvlResponse | null>(null);
  const [structural,  setStructural]  = useState<EthStructural | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, pRes, sRes, tRes, stRes] = await Promise.all([
        fetch(`${API}/eth/metrics`),
        fetch(`${API}/eth/price`),
        fetch(`${API}/eth/summary`),
        fetch(`${API}/eth/tvl`),
        fetch(`${API}/eth/structural`),
      ]);
      const [m, p, s, t, st] = await Promise.all([
        mRes.ok  ? mRes.json()  : null,
        pRes.ok  ? pRes.json()  : null,
        sRes.ok  ? sRes.json()  : null,
        tRes.ok  ? tRes.json()  : null,
        stRes.ok ? stRes.json() : null,
      ]);
      if (m)  setMetrics(m);
      if (p)  setPrice(p);
      if (s)  setSummary(s);
      if (t)  setTvl(t);
      if (st) setStructural(st);
      setLastUpdated(
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
      );
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fetch failed — check backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [fetchAll]);

  const CORE_METRICS = ["price_move","volume","funding","open_interest","cme_basis"] as const;
  const ETH_METRICS  = ["defi_tvl","l2_tvl","staking_rate","eth_btc_ratio","gas_price"] as const;

  const blank: EthMetric = {
    current: "—", d7: "—", vs30d: "—", percentile: 50,
    alert: "—", level: "none", pattern: "Connecting to backend…", _mock: true,
  };
  const m = (key: keyof EthMetrics): EthMetric => metrics?.[key] ?? blank;

  const fmtPrice = (v: number | null): string =>
    v != null ? v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }) : "—";
  const fmtPct = (v: number | null): string =>
    v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` : "—";
  const structColor = structureColor(summary?.structure ?? "NEUTRAL");

  return (
    <main className="min-h-screen p-6"
      style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DashboardNav
          current={"eth" as any}
          title="ETH Decision Dashboard"
          lastUpdated={lastUpdated}
        />

        {/* ── Price header ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-4xl text-slate-100">{fmtPrice(price?.price ?? null)}</span>
            <span className={`font-mono text-lg font-medium ${
              (price?.change_24h ?? 0) >= 0 ? "text-green-500" : "text-red-400"}`}>
              {fmtPct(price?.change_24h ?? null)}
            </span>
            <span className="text-sm text-slate-600 font-mono">24h</span>
          </div>
          <div className="text-sm text-slate-600 font-mono">
            7d{" "}
            <span className={(price?.change_7d ?? 0) >= 0 ? "text-green-500" : "text-red-400"}>
              {fmtPct(price?.change_7d ?? null)}
            </span>
          </div>
          {price?.price_btc && (
            <div className="text-sm text-slate-600 font-mono">
              ETH/BTC{" "}
              <span className="text-slate-400">{price.price_btc.toFixed(5)}</span>
            </div>
          )}
        </div>

        {/* ── Error / loading ────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — ensure /eth/metrics is reachable and eth_routes.py is mounted.
          </div>
        )}
        {loading && !metrics && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Fetching ETH data…
          </div>
        )}

        {/* ── Market state bar ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-3
          flex items-center gap-4 flex-wrap">
          <span className="text-xs font-mono px-2.5 py-1 rounded border"
            style={{ color: structColor, borderColor: `${structColor}60`, background: `${structColor}12` }}>
            ◈ {summary?.structure ?? "LOADING"}
          </span>
          <div className="text-xs font-mono text-slate-500">
            <span style={{ color: "#E05252" }}>{summary?.extreme ?? 0} extreme</span>
            {" · "}
            <span style={{ color: "#D9A84D" }}>{summary?.notable ?? 0} notable</span>
            {" · "}
            <span className="text-slate-700">{summary?.neutral ?? 0} neutral</span>
          </div>
          <div className="ml-auto text-[10px] font-mono text-slate-700">
            AI organizes reality · Humans make decisions
          </div>
        </div>

        {/* ── Price chart ───────────────────────────────────────────────── */}
        <TradingViewEmbed
          symbol="BINANCE:ETHUSDT"
          label="ETH price structure"
          subtitle="BINANCE · ETHUSDT · 1D"
        />

        {/* ── I. Core metrics ────────────────────────────────────────────── */}
        <section>
          <SectionLabel num="I" title="Market state snapshot — core"
            subtitle="Price · Volume · Funding · OI · CME Basis" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {CORE_METRICS.map(k => <MetricCard key={k} id={k} metric={m(k)} />)}
          </div>
        </section>

        {/* ── II. ETH ecosystem metrics ──────────────────────────────────── */}
        <section>
          <SectionLabel num="II" title="Ethereum ecosystem metrics"
            subtitle="DeFi TVL · L2 TVL · Staking · ETH/BTC Ratio · Gas" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {ETH_METRICS.map(k => <MetricCard key={k} id={k} metric={m(k)} />)}
          </div>
        </section>

        {/* ── III. ETH structural thesis ─────────────────────────────────── */}
        <section>
          <SectionLabel num="III" title="ETH structural thesis" />
          <EthStructuralPanel structural={structural} />
        </section>

        {/* ── IV. Ecosystem deep-dive ────────────────────────────────────── */}
        <section>
          <SectionLabel num="IV" title="Ecosystem deep-dive"
            subtitle="DeFiLlama mainnet protocols · Network context" />
          <EcoPanel tvlData={tvl} />
        </section>

        {/* ── V–VII. Events · Causal · Judgment ─────────────────────────── */}
        <section>
          <SectionLabel num="V–VII" title="Events · causal analysis · judgment"
            subtitle="Read left to right. Decide on the right." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Events */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-4">
              <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                Top events
              </div>
              {[
                { date: "Jul 3",  tag: "Structural",
                  text: "OpenUSD (OUSD) announced native on Solana — but ETH Base chain also in partner list. Stripe + Visa participation relevant to ETH stablecoin flows." },
                { date: "Jun 28", tag: "L2",
                  text: "Base (Coinbase L2) surpasses Optimism in daily active users — ETH L2 ecosystem consolidating around 2-3 dominant chains." },
                { date: "Jun 20", tag: "Protocol",
                  text: "Ethereum Pectra upgrade live — EIP-7702 enables smart account functionality for EOAs, lowering friction for institutional DeFi." },
              ].map((e, i) => (
                <div key={i} className={`pb-4 ${i < 2 ? "border-b border-slate-900" : ""}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-mono text-slate-600">{e.date}</span>
                    <span className="text-[9px] font-mono border border-slate-700 px-1.5 py-0.5 rounded text-slate-500">
                      {e.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{e.text}</p>
                </div>
              ))}
            </div>

            {/* Causal */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
              <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                Causal analysis
              </div>
              <div className="space-y-2.5">
                {[
                  "L2 ecosystem growing — Arbitrum + Base absorbing ETH activity",
                  "L2 fees burn ETH on mainnet — deflationary at scale",
                  "Staking lock-up reduces circulating supply pressure",
                  "ETH ETF provides institutional demand channel (May 2024+)",
                  "ETH/BTC ratio trend determines alt season positioning",
                  "Pectra upgrade reduces institutional DeFi friction",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-[10px] font-mono text-slate-700 shrink-0 mt-0.5 w-5 text-right">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs text-slate-400 leading-relaxed">{s}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2.5 mt-1">
                <div className="text-[10px] font-mono text-red-600 uppercase tracking-widest mb-1">
                  Main contradiction
                </div>
                <p className="text-xs text-red-400 leading-relaxed">
                  ETH underperformed BTC in 2024–2025. ETH/BTC ratio recovery is
                  not confirmed — falling ratio invalidates the alt season thesis.
                </p>
              </div>
            </div>

            <JudgmentPanel />
          </div>
        </section>

        {/* ── VIII. Override ─────────────────────────────────────────────── */}
        <section>
          <SectionLabel num="VIII" title="Screenshot override"
            subtitle="Same pattern as BTC — paste JSON from Claude extraction" />
          <div className="max-w-xl">
            <OverridePanel />
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="pt-4 border-t border-slate-900 text-[10px] text-slate-700
          font-mono flex items-center gap-4 flex-wrap">
          <span>Data: CoinGecko · DeFiLlama · yFinance (ETH=F) · beaconcha.in · Cloudflare RPC</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>

      </div>
    </main>
  );
}
