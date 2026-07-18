"use client";

/**
 * app/etf-flows/page.tsx — Institutional ETF & Custody Flow Monitor
 *
 * Two-layer institutional Bitcoin flow view:
 *   Layer 1 — AUM equity layer  (shares × price via etf_aum_routes.py)
 *   Layer 2 — On-chain custody  (wallet balance + 24h flow via etf_flows_routes.py)
 *
 * Instruments: US Spot ETFs (IBIT, FBTC, ARKB, BITB, HODL, BTCO, EZBC, BRRR)
 *              + Trusts (GBTC, BTCW) — MSTR excluded (self-disclosed)
 *
 * Design: matches BTC dashboard system
 *   Background #0B0B0C · Accent #D9A84D · Instrument Serif + IBM Plex Sans/Mono
 *
 * Add to nav in app/page.tsx header → href="/etf-flows"
 */

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertLevel = "extreme" | "notable" | "none";
type Grade      = "A" | "B" | "C" | "D";
type FlowDir    = "inflow" | "outflow" | "neutral";
type EtfType    = "ETF" | "Trust";

interface SummaryData {
  updated_at:        string;
  total_btc_onchain: number | null;
  total_btc_fmt:     string;
  grade_ab_btc:      number | null;
  grade_ab_btc_fmt:  string;
  net_24h_btc:       number | null;
  net_24h_fmt:       string;
  alert_level:       AlertLevel;
  inflow_count:      number;
  outflow_count:     number;
  neutral_count:     number;
  etf_count:         number;
  trust_count:       number;
  grade_ab_count:    number;
  grade_cd_count:    number;
  spot_price:        number | null;
}

interface BreakdownRow {
  ticker:           string;
  name:             string;
  issuer:           string;
  type:             EtfType;
  custodian:        string;
  btc_onchain:      number | null;
  btc_onchain_fmt:  string;
  usd_onchain:      number | null;
  usd_onchain_fmt:  string;
  btc_24h_net:      number | null;
  btc_24h_net_fmt:  string;
  flow_direction:   FlowDir;
  flow_alert:       string;
  alert_level:      AlertLevel;
  grade:            Grade;
  grade_color:      string;
  wallet_count:     number;
}

interface BreakdownData {
  updated_at:             string;
  rows:                   BreakdownRow[];
  total_btc_onchain:      number;
  total_btc_onchain_fmt:  string;
  grade_ab_btc:           number;
  grade_ab_btc_fmt:       string;
  total_24h_net:          number;
  total_24h_net_fmt:      string;
  spot_price:             number | null;
  spot_price_fmt:         string;
}

interface WalletEntry {
  address:          string;
  etf:              string;
  custodian:        string;
  label:            string;
  grade:            Grade;
  grade_note:       string;
  source:           string;
  btc_balance:      number | null;
  btc_balance_fmt:  string;
  btc_24h_in:       number | null;
  btc_24h_out:      number | null;
  btc_24h_net:      number | null;
  btc_24h_net_fmt:  string;
  usd_balance_fmt:  string;
  flow_direction:   FlowDir;
  last_polled:      string;
}

interface CustodyData {
  updated_at:     string;
  coverage_note:  string;
  wallets:        WalletEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH = 60 * 60 * 1000; // 1 hour — matches backend custody TTL

const GRADE_LABELS: Record<Grade, string> = {
  A: "Filing confirmed",
  B: "Public disclosure",
  C: "Cluster inferred",
  D: "Uncertain",
};

const GRADE_BG: Record<Grade, string> = {
  A: "bg-green-950/40 border-green-900/50 text-green-400",
  B: "bg-amber-950/40 border-amber-900/50 text-amber-500",
  C: "bg-slate-900 border-slate-800 text-slate-400",
  D: "bg-red-950/30 border-red-900/40 text-red-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function alertClasses(level: AlertLevel) {
  if (level === "extreme") return { dot: "bg-red-500",   text: "text-red-400",   badge: "bg-red-950/40 border-red-900/50 text-red-400" };
  if (level === "notable") return { dot: "bg-amber-500", text: "text-amber-500", badge: "bg-amber-950/40 border-amber-900/50 text-amber-500" };
  return { dot: "bg-slate-700", text: "text-slate-500", badge: "bg-slate-900 border-slate-800 text-slate-500" };
}

function flowColor(dir: FlowDir, net?: number | null): string {
  if (dir === "inflow")  return "text-green-400";
  if (dir === "outflow") return "text-red-400";
  return "text-slate-500";
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC";
  } catch { return "—"; }
}

function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${GRADE_BG[grade]}`}>
      {grade}
    </span>
  );
}

function FlowDot({ dir }: { dir: FlowDir }) {
  const colors: Record<FlowDir, string> = {
    inflow:  "bg-green-500",
    outflow: "bg-red-500",
    neutral: "bg-slate-600",
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[dir]}`} />;
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ summary, lastUpdated }: { summary: SummaryData | null; lastUpdated: string | null }) {
  const ac = alertClasses(summary?.alert_level ?? "none");
  return (
    <header className="border-b border-slate-900 sticky top-0 z-20"
      style={{ backgroundColor: "#0B0B0C" }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left — nav + title */}
        <div className="flex items-center gap-4 min-w-0">
          <a href="/" className="text-slate-600 hover:text-amber-500 transition-colors text-xs font-mono shrink-0">
            ← BTC
          </a>
          <div className="h-3 w-px bg-slate-800" />
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 16, color: "#E8E6E0", letterSpacing: "-0.01em" }}
            className="truncate">
            ETF & Custody Flows
          </div>
        </div>

        {/* Right — key numbers */}
        <div className="flex items-center gap-5 shrink-0">
          {summary && (
            <>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">On-chain (A/B)</span>
                <span className="font-mono text-sm text-slate-200">{summary.grade_ab_btc_fmt}</span>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">24h Net</span>
                <span className={`font-mono text-sm ${flowColor(summary.net_24h_btc && summary.net_24h_btc > 0 ? "inflow" : summary.net_24h_btc && summary.net_24h_btc < 0 ? "outflow" : "neutral")}`}>
                  {summary.net_24h_fmt}
                </span>
              </div>
              {summary.alert_level !== "none" && (
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono ${ac.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${ac.dot}`} />
                  {summary.alert_level === "extreme" ? "Extreme flow" : "Notable flow"}
                </div>
              )}
            </>
          )}
          {lastUpdated && (
            <span className="text-[10px] font-mono text-slate-700 hidden md:block">{lastUpdated}</span>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── State bar ────────────────────────────────────────────────────────────────

function StateBar({ summary }: { summary: SummaryData | null }) {
  if (!summary) return null;
  const { inflow_count, outflow_count, neutral_count, etf_count, trust_count, grade_ab_count, grade_cd_count } = summary;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-3 flex flex-wrap gap-x-6 gap-y-2 items-center">
      <div className="flex items-center gap-2">
        <FlowDot dir="inflow" />
        <span className="text-[11px] font-mono text-slate-400">{inflow_count} inflow</span>
      </div>
      <div className="flex items-center gap-2">
        <FlowDot dir="outflow" />
        <span className="text-[11px] font-mono text-slate-400">{outflow_count} outflow</span>
      </div>
      <div className="flex items-center gap-2">
        <FlowDot dir="neutral" />
        <span className="text-[11px] font-mono text-slate-400">{neutral_count} neutral</span>
      </div>
      <div className="h-3 w-px bg-slate-800" />
      <span className="text-[11px] font-mono text-slate-600">{etf_count} ETFs · {trust_count} Trusts</span>
      <div className="h-3 w-px bg-slate-800" />
      <div className="flex items-center gap-1.5">
        <GradeBadge grade="A" /><GradeBadge grade="B" />
        <span className="text-[11px] font-mono text-slate-500">{grade_ab_count} signal-quality wallets</span>
      </div>
      <div className="flex items-center gap-1.5">
        <GradeBadge grade="C" /><GradeBadge grade="D" />
        <span className="text-[11px] font-mono text-slate-600">{grade_cd_count} indicative only</span>
      </div>
      <div className="ml-auto text-[9px] font-mono text-slate-700 hidden lg:block">
        Spot: {summary.spot_price ? `$${summary.spot_price.toLocaleString()}` : "—"}
      </div>
    </div>
  );
}

// ─── Coverage note ────────────────────────────────────────────────────────────

function CoverageNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left">
        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
          Methodology & coverage
        </span>
        <span className="text-slate-700 text-xs ml-auto">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-[11px] text-slate-500 font-mono leading-relaxed">
          <p>Addresses sourced from SEC S-1 filings, 8-K disclosures, and publicly disclosed prospectuses. Custodians rotate cold storage wallets — balances shown represent anchor addresses, not complete holdings. All figures are floors, not totals.</p>
          <p>On-chain balance is queried via blockchain.info public API (no key required) and cached for 1 hour to respect rate limits.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-900">
            {(["A", "B", "C", "D"] as Grade[]).map(g => (
              <div key={g} className="flex items-start gap-2">
                <GradeBadge grade={g} />
                <span className="text-slate-600">{GRADE_LABELS[g]}</span>
              </div>
            ))}
          </div>
          <p className="text-slate-700 pt-1">Only Grade A and strong Grade B events should influence investment signals.</p>
        </div>
      )}
    </div>
  );
}

// ─── Section I: ETF Breakdown Table ──────────────────────────────────────────

function SectionLabel({ numeral, title, subtitle }: { numeral: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest shrink-0">{numeral}</span>
      <div>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 15, color: "#E8E6E0" }}>{title}</span>
        {subtitle && <span className="ml-2 text-[10px] font-mono text-slate-600">{subtitle}</span>}
      </div>
    </div>
  );
}

function TypePill({ type }: { type: EtfType }) {
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
      type === "ETF"
        ? "border-amber-900/40 text-amber-600 bg-amber-950/20"
        : "border-slate-700 text-slate-500 bg-slate-900"
    }`}>
      {type}
    </span>
  );
}

function BreakdownTable({ data, loading }: { data: BreakdownData | null; loading: boolean }) {
  const [sortKey, setSortKey] = useState<"btc_onchain" | "btc_24h_net" | "ticker">("btc_onchain");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  function toggleSort(key: typeof sortKey) {
    if (key === sortKey) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(-1); }
  }

  const rows = data?.rows
    ? [...data.rows].sort((a, b) => {
        const av = a[sortKey] ?? (sortDir === -1 ? -Infinity : Infinity);
        const bv = b[sortKey] ?? (sortDir === -1 ? -Infinity : Infinity);
        if (typeof av === "string" && typeof bv === "string")
          return sortDir * av.localeCompare(bv);
        return sortDir * ((av as number) - (bv as number));
      })
    : [];

  const SortBtn = ({ k, label }: { k: typeof sortKey; label: string }) => (
    <button onClick={() => toggleSort(k)}
      className={`text-[9px] font-mono uppercase tracking-widest hover:text-slate-300 transition-colors ${sortKey === k ? "text-amber-500" : "text-slate-600"}`}>
      {label}{sortKey === k ? (sortDir === -1 ? " ↓" : " ↑") : ""}
    </button>
  );

  if (loading) return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center">
      <div className="text-[11px] font-mono text-slate-600">Polling custody wallets — first load takes ~2 min due to rate limits</div>
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      {/* Table header */}
      <div className="px-5 py-3 border-b border-slate-900 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SortBtn k="ticker" label="ETF" />
          <span className="text-slate-800">·</span>
          <SortBtn k="btc_onchain" label="On-chain BTC" />
          <span className="text-slate-800">·</span>
          <SortBtn k="btc_24h_net" label="24h Net" />
        </div>
        {data && (
          <div className="text-[9px] font-mono text-slate-700">
            {data.updated_at ? formatTime(data.updated_at) : "—"}
          </div>
        )}
      </div>

      {/* Totals bar */}
      {data && (
        <div className="px-5 py-2 bg-slate-900/50 border-b border-slate-900 flex flex-wrap gap-x-6 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[9px] font-mono text-slate-600 uppercase">Total on-chain</span>
            <span className="font-mono text-[13px] text-slate-200">{data.total_btc_onchain_fmt}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[9px] font-mono text-slate-600 uppercase">Grade A/B</span>
            <span className="font-mono text-[13px] text-green-400">{data.grade_ab_btc_fmt}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[9px] font-mono text-slate-600 uppercase">24h Net</span>
            <span className={`font-mono text-[13px] ${flowColor(data.total_24h_net > 0 ? "inflow" : data.total_24h_net < 0 ? "outflow" : "neutral")}`}>
              {data.total_24h_net_fmt}
            </span>
          </div>
          <div className="ml-auto text-[9px] font-mono text-slate-700 self-center">
            Spot {data.spot_price_fmt}
          </div>
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-slate-900">
        {rows.map(row => {
          const ac = alertClasses(row.alert_level);
          return (
            <div key={row.ticker}
              className="px-5 py-3.5 grid grid-cols-12 gap-3 items-center hover:bg-slate-900/40 transition-colors">

              {/* Ticker + name + type */}
              <div className="col-span-4 sm:col-span-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[13px] text-slate-100 font-semibold">{row.ticker}</span>
                  <TypePill type={row.type} />
                </div>
                <div className="text-[10px] text-slate-600 truncate">{row.issuer}</div>
                <div className="text-[10px] font-mono text-slate-700 truncate mt-0.5">{row.custodian}</div>
              </div>

              {/* On-chain BTC */}
              <div className="col-span-3 sm:col-span-2">
                <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">On-chain</div>
                <div className="font-mono text-[12px] text-slate-200">
                  {row.btc_onchain ? `${(row.btc_onchain).toLocaleString("en-US", {maximumFractionDigits: 0})} BTC` : "—"}
                </div>
                <div className="text-[10px] font-mono text-slate-600">{row.usd_onchain_fmt}</div>
              </div>

              {/* 24h net flow */}
              <div className="col-span-2 sm:col-span-2">
                <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">24h Net</div>
                <div className={`font-mono text-[12px] flex items-center gap-1.5 ${flowColor(row.flow_direction)}`}>
                  <FlowDot dir={row.flow_direction} />
                  {row.btc_24h_net !== null ? `${row.btc_24h_net >= 0 ? "+" : ""}${row.btc_24h_net.toLocaleString("en-US", {maximumFractionDigits: 0})}` : "—"}
                </div>
              </div>

              {/* Alert */}
              <div className="hidden sm:block col-span-3">
                {row.alert_level !== "none" ? (
                  <div className={`text-[10px] font-mono px-2 py-1 rounded border inline-block ${ac.badge}`}>
                    {row.flow_alert}
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-slate-700">—</span>
                )}
              </div>

              {/* Grade + wallet count */}
              <div className="col-span-3 sm:col-span-2 flex flex-col items-end gap-1">
                <GradeBadge grade={row.grade} />
                <span className="text-[9px] font-mono text-slate-700">
                  {row.wallet_count} wallet{row.wallet_count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section II: Wallet Detail ────────────────────────────────────────────────

function WalletTable({ data, loading }: { data: CustodyData | null; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center">
      <div className="text-[11px] font-mono text-slate-600">Loading wallet data…</div>
    </div>
  );
  if (!data) return null;

  // Group by ETF
  const byEtf: Record<string, WalletEntry[]> = {};
  for (const w of data.wallets) {
    if (!byEtf[w.etf]) byEtf[w.etf] = [];
    byEtf[w.etf].push(w);
  }

  return (
    <div className="space-y-2">
      {Object.entries(byEtf).map(([etf, wallets]) => {
        const isOpen = expanded === etf;
        const totalBtc = wallets.reduce((s, w) => s + (w.btc_balance ?? 0), 0);
        const totalNet = wallets.reduce((s, w) => s + (w.btc_24h_net ?? 0), 0);
        const worstGrade = wallets.reduce<Grade>((worst, w) => {
          const ord: Record<Grade, number> = { A: 0, B: 1, C: 2, D: 3 };
          return ord[w.grade] > ord[worst] ? w.grade : worst;
        }, "A");

        return (
          <div key={etf} className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            {/* Collapsed row */}
            <button
              onClick={() => setExpanded(isOpen ? null : etf)}
              className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-slate-900/40 transition-colors text-left">
              <span className="font-mono text-[13px] text-slate-100 font-semibold w-12 shrink-0">{etf}</span>
              <div className="flex items-center gap-1.5">
                <FlowDot dir={totalNet > 10 ? "inflow" : totalNet < -10 ? "outflow" : "neutral"} />
                <span className={`font-mono text-[12px] ${flowColor(totalNet > 10 ? "inflow" : totalNet < -10 ? "outflow" : "neutral")}`}>
                  {totalNet >= 0 ? "+" : ""}{totalNet.toLocaleString("en-US", {maximumFractionDigits: 0})} BTC
                </span>
              </div>
              <span className="font-mono text-[12px] text-slate-400 ml-2">
                {totalBtc > 0 ? `${totalBtc.toLocaleString("en-US", {maximumFractionDigits: 0})} BTC on-chain` : "—"}
              </span>
              <GradeBadge grade={worstGrade} />
              <span className="text-[10px] font-mono text-slate-700 ml-auto">
                {wallets.length} wallet{wallets.length !== 1 ? "s" : ""} {isOpen ? "▲" : "▼"}
              </span>
            </button>

            {/* Expanded wallet rows */}
            {isOpen && (
              <div className="border-t border-slate-900 divide-y divide-slate-900/60">
                {wallets.map(w => (
                  <div key={w.address} className="px-5 py-3 grid grid-cols-12 gap-3 items-start">
                    {/* Label + address */}
                    <div className="col-span-12 sm:col-span-4">
                      <div className="text-[11px] text-slate-400 mb-0.5">{w.label}</div>
                      <div className="font-mono text-[9px] text-slate-700 break-all">{w.address}</div>
                      <div className="text-[9px] text-slate-700 mt-1">{w.custodian}</div>
                    </div>

                    {/* Balance */}
                    <div className="col-span-4 sm:col-span-2">
                      <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">Balance</div>
                      <div className="font-mono text-[12px] text-slate-200">
                        {w.btc_balance ? `${w.btc_balance.toLocaleString("en-US", {maximumFractionDigits: 1})} BTC` : "—"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-600">{w.usd_balance_fmt}</div>
                    </div>

                    {/* 24h flow */}
                    <div className="col-span-4 sm:col-span-2">
                      <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">24h Net</div>
                      <div className={`font-mono text-[12px] ${flowColor(w.flow_direction)}`}>
                        {w.btc_24h_net_fmt}
                      </div>
                      {w.btc_24h_in !== null && (
                        <div className="text-[9px] font-mono text-slate-700">
                          ↑{w.btc_24h_in?.toFixed(1)} ↓{w.btc_24h_out?.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {/* Grade + source */}
                    <div className="col-span-12 sm:col-span-4">
                      <div className="flex items-start gap-2 mb-1">
                        <GradeBadge grade={w.grade} />
                        <span className="text-[9px] font-mono text-slate-600 leading-tight">{w.grade_note}</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-700">{w.source}</div>
                      <div className="text-[9px] font-mono text-slate-800 mt-0.5">Polled {formatTime(w.last_polled)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EtfFlowsDashboard() {
  const [summary,     setSummary]     = useState<SummaryData | null>(null);
  const [breakdown,   setBreakdown]   = useState<BreakdownData | null>(null);
  const [custody,     setCustody]     = useState<CustodyData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, bRes, cRes] = await Promise.all([
        fetch(`${API}/etf-flows/summary`),
        fetch(`${API}/etf-flows/breakdown`),
        fetch(`${API}/etf-flows/custody`),
      ]);

      const [s, b, c] = await Promise.all([
        sRes.ok ? sRes.json() : null,
        bRes.ok ? bRes.json() : null,
        cRes.ok ? cRes.json() : null,
      ]);

      if (s) setSummary(s);
      if (b) setBreakdown(b);
      if (c) setCustody(c);
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC");
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fetch failed — check backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, REFRESH);
    return () => clearInterval(t);
  }, [fetchAll]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0B0B0C; color: #E8E6E0; font-family: 'IBM Plex Sans', sans-serif; }
      `}</style>

      <div style={{ minHeight: "100vh", backgroundColor: "#0B0B0C" }}>
        <Header summary={summary} lastUpdated={lastUpdated} />

        <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-5 py-4 text-sm font-mono text-red-400">
              {error} — ensure backend is running and <code>/etf-flows/summary</code> responds.
            </div>
          )}

          {/* State bar */}
          <StateBar summary={summary} />

          {/* Coverage note */}
          <CoverageNote />

          {/* Section I — ETF breakdown */}
          <section>
            <SectionLabel
              numeral="I"
              title="ETF & Trust Holdings"
              subtitle="On-chain balance · 24h net flow · custodian · confidence grade"
            />
            <BreakdownTable data={breakdown} loading={loading} />
          </section>

          {/* Section II — Wallet detail */}
          <section>
            <SectionLabel
              numeral="II"
              title="Custody Wallet Detail"
              subtitle="Per-address balance · attribution source · expand to inspect"
            />
            <WalletTable data={custody} loading={loading} />
          </section>

          <footer className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-[10px] font-mono text-slate-700">
              On-chain data: blockchain.info public API · polled every hour
            </div>
            <div className="text-[10px] font-mono text-slate-700">
              AI organizes reality. Humans make decisions.
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
