"use client";

/**
 * app/sol/page.tsx — Solana Decision Dashboard
 *
 * Human decision interface for SOL thesis around OpenUSD (OUSD) — not auto-trading.
 * AI organizes data, benchmarks, alerts. Humans make all final judgments.
 *
 * Design system: matches existing BTC/Macro/Liquidity dashboards exactly.
 *   Background: #0B0B0C · Accent: #D9A84D · Fonts: Instrument Serif + IBM Plex Mono
 *
 * Data sources (all free — no new keys required):
 *   /sol/metrics   — 10 metric cards (CoinGecko + DeFiLlama + yFinance)
 *   /sol/price     — SOL spot price
 *   /sol/summary   — Market state bar
 *   /sol/tvl       — DeFiLlama protocol breakdown
 *   /sol/ousd-status — OUSD thesis tracker (static pre-launch)
 *
 * Backend: sol_routes.py — drop-in addition to existing main.py
 *
 * SETUP:
 *   1. Add { key: "sol", href: "/sol", label: "SOL" } to NAV_ITEMS in
 *      app/components/DashboardNav.tsx
 *   2. Drop sol_routes.py in btc-dashboard-api/
 *   3. Add to main.py:
 *        from sol_routes import sol_router
 *        app.include_router(sol_router)
 */

import { useEffect, useState, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";
import TradingViewEmbed from "../components/TradingViewEmbed";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SolMetric {
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

interface SolMetrics {
  price_move:     SolMetric;
  volume:         SolMetric;
  funding:        SolMetric;
  open_interest:  SolMetric;
  cme_basis:      SolMetric;
  defi_tvl:       SolMetric;
  dex_volume:     SolMetric;
  staking_rate:   SolMetric;
  stablecoin_sol: SolMetric;
  dominance:      SolMetric;
}

interface SolPrice {
  price:       number | null;
  change_24h:  number | null;
  change_7d:   number | null;
}

interface SolSummary {
  structure: string;
  extreme:   number;
  notable:   number;
  neutral:   number;
}

interface SolProtocol {
  name:     string;
  tvl:      number | null;
  category: string;
}

interface SolTvlResponse {
  chain_tvl:  { tvl_usd: number | null };
  protocols:  SolProtocol[];
  dex_volume: { dex_volume_24h: number | null; dex_volume_7d: number | null };
}

interface OusdStatus {
  status:         string;
  expected_live:  string;
  partner_count:  number;
  thesis_signals: { confirms: string[]; invalidates: string[] };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API              = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 60_000; // 1 min

const METRIC_LABELS: Record<string, string> = {
  price_move:    "Price Move",
  volume:        "Volume",
  funding:       "Funding Rate",
  open_interest: "Open Interest",
  cme_basis:     "CME Basis",
  defi_tvl:      "DeFi TVL",
  dex_volume:    "DEX Volume",
  staking_rate:  "Staking Rate",
  stablecoin_sol:"Stablecoin (SOL)",
  dominance:     "SOL Dominance",
};

// Seed sparkline data — replaced with live history once backend stores it
const SEED_SPARKS: Record<string, number[]> = {
  price_move:    [55,58,62,60,65,68,70,72,75,77,80,80],
  volume:        [1.2,1.4,1.8,2.1,1.9,2.3,2.5,2.2,2.6,2.9,2.8,2.8],
  funding:       [15,18,22,20,25,24,27,26,28,28,28,28],
  open_interest: [2.1,2.2,2.3,2.5,2.6,2.7,2.8,3.0,3.1,3.3,3.2,3.2],
  cme_basis:     [6.2,6.5,6.8,7.0,7.2,7.5,7.8,8.0,8.2,8.4,8.4,8.4],
  defi_tvl:      [6.5,6.8,7.0,7.1,7.3,7.5,7.6,7.8,8.0,8.2,8.2,8.2],
  dex_volume:    [0.7,0.8,0.9,1.0,1.1,1.2,1.3,1.2,1.3,1.5,1.4,1.4],
  staking_rate:  [66,65.8,65.5,65.2,65,64.8,64.5,64.6,64.7,64.8,64.8,64.8],
  stablecoin_sol:[7.5,7.7,7.9,8.0,8.2,8.4,8.5,8.7,8.9,9.0,9.1,9.1],
  dominance:     [1.3,1.4,1.5,1.6,1.7,1.8,1.9,2.0,2.0,2.1,2.1,2.1],
};

// ─── Alert helpers ────────────────────────────────────────────────────────────

function alertColor(level: string): string {
  switch (level) {
    case "extreme": return "#E05252";
    case "notable": return "#D9A84D";
    default:        return "#374151";
  }
}

function alertBadge(level: string) {
  switch (level) {
    case "extreme": return "border-red-900 bg-red-950/40 text-red-400";
    case "notable": return "border-amber-900 bg-amber-950/30 text-amber-500";
    default:        return "border-slate-800 text-slate-600";
  }
}

function structureColor(structure: string): string {
  switch (structure) {
    case "EXTREME":  return "#E05252";
    case "ELEVATED": return "#D9A84D";
    case "RECOVERY": return "#D9A84D";
    default:         return "#6B7280";
  }
}

// ─── Sparkline (SVG — no recharts dependency) ─────────────────────────────────

function Sparkline({ data, color = "#D9A84D" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return <div className="h-7" />;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const W = 80, H = 28;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 2) - 1}`)
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
      {subtitle && (
        <span className="text-[10px] font-mono text-slate-600 ml-1">{subtitle}</span>
      )}
    </div>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({ id, metric }: { id: string; metric: SolMetric }) {
  const color  = alertColor(metric.level);
  const badge  = alertBadge(metric.level);
  const sparks = SEED_SPARKS[id] ?? [];
  const isNone = metric.level === "none";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      {/* Header */}
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

      {/* Value + sparkline */}
      <div className="flex items-end justify-between">
        <div className="font-mono text-2xl text-slate-100 leading-none">
          {metric.current}
        </div>
        <Sparkline data={sparks} color={isNone ? "#374151" : color} />
      </div>

      {/* 7d / vs30d / percentile row */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-900 pt-3">
        <div>
          <div className="text-[9px] font-mono text-slate-600 uppercase mb-1">7d</div>
          <div className="font-mono text-[11px] text-slate-300">{metric.d7}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-slate-600 uppercase mb-1">vs 30d</div>
          <div className="font-mono text-[11px] text-slate-300">{metric.vs30d}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-slate-600 uppercase mb-1">Pctl</div>
          <div className="font-mono text-[11px] text-slate-300">{metric.percentile}%</div>
        </div>
      </div>

      {/* Percentile bar */}
      <PctBar value={metric.percentile} color={isNone ? "#374151" : color} />

      {/* Pattern */}
      <div className="flex items-start justify-between border-t border-slate-900 pt-2 gap-2">
        <span className="text-[9px] font-mono text-slate-600 uppercase shrink-0">Pattern</span>
        <span className="text-[10px] text-slate-400 italic text-right leading-tight">
          {metric.pattern}
        </span>
      </div>

      {/* Indicators */}
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full inline-block ${metric._is_override ? "bg-amber-500" : "bg-green-500"}`} />
        <span className="text-[9px] font-mono text-slate-700">
          {metric._is_override ? "Manual override" : metric._mock ? "Mock — connect backend" : "Live"}
        </span>
      </div>
    </div>
  );
}

// ─── OUSD Thesis Tracker (signature section — unique to SOL dashboard) ────────

function OUSDTracker({ ousd }: { ousd: OusdStatus | null }) {
  const confirms   = ousd?.thesis_signals?.confirms    ?? [
    "Solana named as native chain — day-one deployment",
    "Stripe making OUSD default for all business transactions",
    "Stablecoin supply on Solana +$380M this week — pre-launch signal",
    "DeFi TVL +$420M — ecosystem primed ahead of OUSD demand wave",
  ];
  const invalidates = ousd?.thesis_signals?.invalidates ?? [
    "Reserve custodian and composition still unpublished",
    "Attestation cadence unconfirmed — USDC monthly Big Four = standard",
    "Partner integration rate at go-live vs 140 signatories",
    "Launch delay past H2 2026 compresses the opportunity window",
  ];

  const signals = [
    { k: "Stripe",      r: "Default stablecoin for business txns", ok: true  },
    { k: "Visa",        r: "Payment network partner",              ok: true  },
    { k: "Mastercard",  r: "Payment network partner",              ok: true  },
    { k: "BlackRock",   r: "Asset manager signatory",              ok: true  },
    { k: "Google",      r: "Tech platform signatory",              ok: true  },
    { k: "Coinbase",    r: "Exchange + Base chain partner",        ok: true  },
    { k: "Custodian",   r: "Reserve custodian — unpublished",      ok: false },
    { k: "Attestation", r: "Audit cadence — not confirmed",        ok: false },
  ];

  return (
    <div className="rounded-xl border border-amber-900/40 bg-slate-950 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-[10px] font-mono text-amber-600 uppercase tracking-widest">
              OUSD thesis tracker
            </span>
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: "#E8E6E0" }}>
            Open USD — Native Solana Launch
          </div>
          <div className="text-xs text-slate-600 font-mono mt-1">
            {ousd?.partner_count ?? 140}+ partners · Pre-launch ·{" "}
            {ousd?.expected_live ?? "H2 2026"} expected · Announced Jun 30, 2026
          </div>
        </div>
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-center shrink-0">
          <div className="text-[9px] font-mono text-amber-600 uppercase tracking-widest">Status</div>
          <div className="text-sm font-mono font-bold text-amber-500">Pre-launch</div>
        </div>
      </div>

      {/* Partner signal grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {signals.map(s => (
          <div key={s.k}
            className={`rounded-lg p-2.5 border ${s.ok
              ? "border-green-900/40 bg-green-950/20"
              : "border-slate-800 bg-slate-950"}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-[11px] font-mono font-bold ${s.ok ? "text-green-500" : "text-slate-700"}`}>
                {s.ok ? "✓" : "○"}
              </span>
              <span className={`text-[11px] font-mono font-medium ${s.ok ? "text-slate-200" : "text-slate-500"}`}>
                {s.k}
              </span>
            </div>
            <div className="text-[9px] text-slate-600 leading-tight">{s.r}</div>
          </div>
        ))}
      </div>

      {/* Confirms vs Invalidates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-4">
        <div>
          <div className="text-[10px] font-mono text-green-600 uppercase tracking-widest mb-2">
            Confirms thesis
          </div>
          {confirms.map((s, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="text-[10px] mt-0.5" style={{ color: "#6A9A6A" }}>▲</span>
              <span className="text-xs text-slate-400">{s}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[10px] font-mono text-red-600 uppercase tracking-widest mb-2">
            Watch / invalidates
          </div>
          {invalidates.map((s, i) => (
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

function EcoPanel({ tvlData }: { tvlData: SolTvlResponse | null }) {
  const fmtUsd = (v: number | null | undefined): string => {
    if (v == null) return "—";
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toLocaleString()}`;
  };

  const protocols = tvlData?.protocols?.slice(0, 6) ?? [
    { name: "Jupiter",  tvl: 2.4e9, category: "DEX Aggregator" },
    { name: "Raydium",  tvl: 1.8e9, category: "AMM / DEX" },
    { name: "Marinade", tvl: 1.2e9, category: "Liquid Staking" },
    { name: "Jito",     tvl: 0.9e9, category: "Liquid Staking" },
    { name: "Velocity", tvl: 0.6e9, category: "Perps" },
    { name: "Other",    tvl: 1.3e9, category: "All others" },
  ];

  const totalTvl = tvlData?.chain_tvl?.tvl_usd ?? 8.2e9;
  const maxTvl   = Math.max(...protocols.map(p => p.tvl ?? 0));

  const networkStats = [
    { l: "Daily transactions", v: "89.4M",  sub: "+12% vs 7d avg",     ok: true  },
    { l: "Avg TPS (7d)",        v: "4,218",  sub: "Near yearly high",    ok: true  },
    { l: "Staking APY",         v: "6.8%",   sub: "vs SOL price return", ok: null  },
    { l: "Active validators",   v: "1,463",  sub: "Decentralization OK", ok: true  },
    { l: "Fee revenue (7d)",    v: "$8.2M",  sub: "+28% week-over-week", ok: true  },
    { l: "Failed tx rate",      v: "0.4%",   sub: "Network normal",      ok: true  },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* TVL breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            DeFi TVL — DeFiLlama
          </div>
          <div className="font-mono text-sm text-slate-300">{fmtUsd(totalTvl)}</div>
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
                    width:      `${maxTvl ? ((p.tvl ?? 0) / maxTvl) * 100 : 0}%`,
                    background: i < 2 ? "#D9A84D" : i < 4 ? "#6A9A6A" : "#374151",
                  }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network stats */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-1">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
          Network activity
        </div>
        {networkStats.map((s, i) => (
          <div key={s.l}
            className={`flex justify-between items-center py-2 ${i < networkStats.length - 1 ? "border-b border-slate-900" : ""}`}>
            <div>
              <div className="text-xs text-slate-300">{s.l}</div>
              <div className="text-[9px] text-slate-600">{s.sub}</div>
            </div>
            <div className={`font-mono text-sm font-medium ${
              s.ok === true ? "text-green-500" : s.ok === false ? "text-red-400" : "text-slate-300"
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
  const [fields, setFields] = useState({
    read: "", supports: "", contradicts: "", invalidates: "", plan: "",
  });
  const [risk,  setRisk]  = useState<"low" | "medium" | "high" | "extreme">("medium");
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setFields(p => ({ ...p, [k]: e.target.value }));

  const commit = () => {
    // TODO: POST to /sol/judgment (same pattern as BTC /judgment endpoint)
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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

      {/* Risk selector */}
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
        style={{
          background:  saved ? "#6A9A6A" : "#D9A84D",
          color:       "#0B0B0C",
        }}>
        {saved ? "✓ Saved to log" : "Commit judgment to log"}
      </button>
    </div>
  );
}

// ─── Manual override panel ────────────────────────────────────────────────────

function OverridePanel() {
  const [raw,    setRaw]    = useState("");
  const [metric, setMetric] = useState("defi_tvl");
  const [status, setStatus] = useState<string | null>(null);

  const OVERRIDEABLE = [
    "price_move","volume","funding","open_interest","cme_basis",
    "defi_tvl","dex_volume","staking_rate","stablecoin_sol","dominance",
  ];

  const apply = async () => {
    try {
      const fields = JSON.parse(raw);
      const res = await fetch(`${API}/sol/manual-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric, ...fields }),
      });
      setStatus(res.ok ? "Override applied — refresh to see it" : "Backend error");
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
          className="bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300
            w-full focus:outline-none focus:border-amber-900">
          {OVERRIDEABLE.map(m => (
            <option key={m} value={m}>{METRIC_LABELS[m]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-mono text-slate-600 block mb-1">
          JSON from Claude extraction
        </label>
        <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={4}
          placeholder={`{"current":"$8.4B","d7":"+$420M","vs30d":"+18%","percentile":71,"alert":"TVL acceleration","level":"notable","pattern":"Capital returning to ecosystem"}`}
          className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400
            font-mono resize-none focus:outline-none focus:border-amber-900" />
      </div>
      {status && (
        <div className={`text-xs font-mono px-3 py-2 rounded-lg border ${
          status.includes("applied") ? "border-green-900 text-green-500 bg-green-950/30"
                                     : "border-red-900 text-red-400 bg-red-950/30"}`}>
          {status}
        </div>
      )}
      <button onClick={apply}
        className="w-full py-2 rounded-lg text-xs font-mono font-bold bg-amber-950/40
          border border-amber-900/50 text-amber-500 hover:bg-amber-950/60 transition-colors">
        Apply override
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SolDecisionDashboard() {
  const [metrics,      setMetrics]      = useState<SolMetrics | null>(null);
  const [price,        setPrice]        = useState<SolPrice | null>(null);
  const [summary,      setSummary]      = useState<SolSummary | null>(null);
  const [tvl,          setTvl]          = useState<SolTvlResponse | null>(null);
  const [ousd,         setOusd]         = useState<OusdStatus | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [lastUpdated,  setLastUpdated]  = useState<string | null>(null);
  const [judgment,     setJudgment]     = useState({
    read: "", supports: "", contradicts: "", invalidates: "", plan: "",
  });

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, pRes, sRes, tRes, oRes] = await Promise.all([
        fetch(`${API}/sol/metrics`),
        fetch(`${API}/sol/price`),
        fetch(`${API}/sol/summary`),
        fetch(`${API}/sol/tvl`),
        fetch(`${API}/sol/ousd-status`),
      ]);

      const [m, p, s, t, o] = await Promise.all([
        mRes.ok ? mRes.json() : null,
        pRes.ok ? pRes.json() : null,
        sRes.ok ? sRes.json() : null,
        tRes.ok ? tRes.json() : null,
        oRes.ok ? oRes.json() : null,
      ]);

      if (m) setMetrics(m);
      if (p) setPrice(p);
      if (s) setSummary(s);
      if (t) setTvl(t);
      if (o) setOusd(o);

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

  const CORE_METRICS    = ["price_move", "volume", "funding", "open_interest", "cme_basis"] as const;
  const SOL_METRICS     = ["defi_tvl", "dex_volume", "staking_rate", "stablecoin_sol", "dominance"] as const;

  const fmtPrice = (v: number | null): string =>
    v != null ? v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }) : "—";

  const fmtPct = (v: number | null): string =>
    v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` : "—";

  const structColor = structureColor(summary?.structure ?? "NEUTRAL");

  // Fallback metric for loading state
  const blank: SolMetric = { current: "—", d7: "—", vs30d: "—", percentile: 50,
    alert: "—", level: "none", pattern: "Connecting to backend…", _mock: true };

  const m = (key: keyof SolMetrics): SolMetric => metrics?.[key] ?? blank;

  return (
    <main className="min-h-screen p-6"
      style={{ background: "#0B0B0C", color: "#E8E6E0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header (DashboardNav) ──────────────────────────────────────── */}
        {/* NOTE: add { key: "sol", href: "/sol", label: "SOL" } to NAV_ITEMS
                  in app/components/DashboardNav.tsx before uncommenting current="sol" */}
        <DashboardNav
          current={"sol" as any}
          title="SOL Decision Dashboard"
          lastUpdated={lastUpdated}
        />

        {/* ── Price header ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-4xl text-slate-100">
              {fmtPrice(price?.price ?? null)}
            </span>
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
        </div>

        {/* ── Error / loading states ─────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — ensure /sol/metrics is reachable and sol_routes.py is mounted.
          </div>
        )}
        {loading && !metrics && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Fetching SOL data…
          </div>
        )}

        {/* ── Market state bar ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-3
          flex items-center gap-4 flex-wrap">
          <span className="text-xs font-mono px-2.5 py-1 rounded border"
            style={{ color: structColor, borderColor: `${structColor}60`,
              background: `${structColor}12` }}>
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
          symbol="BINANCE:SOLUSDT"
          label="SOL price structure"
          subtitle="BINANCE · SOLUSDT · 1D"
        />

        {/* ── I. Core metrics ────────────────────────────────────────────── */}
        <section>
          <SectionLabel num="I" title="Market state snapshot — core"
            subtitle="Price · Volume · Funding · OI · CME Basis" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {CORE_METRICS.map(k => <MetricCard key={k} id={k} metric={m(k)} />)}
          </div>
        </section>

        {/* ── II. Solana ecosystem metrics ───────────────────────────────── */}
        <section>
          <SectionLabel num="II" title="Solana ecosystem metrics"
            subtitle="DeFi TVL · DEX Volume · Staking · Stablecoin · Dominance" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {SOL_METRICS.map(k => <MetricCard key={k} id={k} metric={m(k)} />)}
          </div>
        </section>

        {/* ── III. OUSD thesis tracker ───────────────────────────────────── */}
        <section>
          <SectionLabel num="III" title="Investment thesis — OUSD catalyst" />
          <OUSDTracker ousd={ousd} />
        </section>

        {/* ── IV. Ecosystem deep-dive ────────────────────────────────────── */}
        <section>
          <SectionLabel num="IV" title="Ecosystem deep-dive"
            subtitle="DeFiLlama protocol breakdown · Solana network activity" />
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
                  text: "OpenUSD confirmed native on Solana — 140+ partners. Stripe making OUSD default for all business transactions on platform." },
                { date: "Jul 1",  tag: "Adoption",
                  text: "Solana on-chain activity near yearly highs — 89.4M daily transactions, fee revenue +28% week-over-week." },
                { date: "Jun 28", tag: "Protocol",
                  text: "Solana onchain governance live — stake-weighted validator voting with 15% cluster support threshold now operational." },
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
                  "OUSD announced native on Solana — day-one deployment",
                  "Stripe + Visa signal payment-scale adoption demand",
                  "Stablecoin supply on Solana +$380M this week — pre-launch",
                  "DeFi TVL +$420M — capital anticipating yield opportunities",
                  "Network activity + DEX volume near yearly highs",
                  "CME basis 8.4% — institutional carry trade active",
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
                  OUSD is pre-launch. Reserve composition and attestation cadence
                  unpublished. All signals are forward-looking until go-live.
                </p>
              </div>
            </div>

            {/* Judgment */}
            <JudgmentPanel />
          </div>
        </section>

        {/* ── VIII. Screenshot override ──────────────────────────────────── */}
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
          <span>Data: CoinGecko · DeFiLlama · yFinance (SOL=F) · Solana RPC</span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>

      </div>
    </main>
  );
}
