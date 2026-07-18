"use client";

/**
 * app/etf-flows/page.tsx — Institutional Flow Monitor
 *
 * Three-layer view:
 *   Layer 1 — ETF & Trust custody  (on-chain balance, long-term holdings)
 *   Layer 2 — OTC / Prime broker   (24h flow is signal; balance near zero is normal)
 *   Layer 3 — Wallet detail        (per-address, expandable, grouped by entity)
 *
 * Backend: etf_flows_routes.py → /etf-flows/*
 * Nav: DashboardNav (shared component)
 */

import { useEffect, useState, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertLevel = "extreme" | "notable" | "none";
type Grade      = "A" | "B" | "C" | "D";
type FlowDir    = "inflow" | "outflow" | "neutral";
type EtfType    = "ETF" | "Trust" | "OTC";

interface SummaryData {
  updated_at:              string;
  spot_price:              number | null;
  spot_price_fmt:          string;
  // Custody layer (ETF + Trust)
  custody_btc:             number;
  custody_btc_fmt:         string;
  custody_ab_btc:          number;
  custody_ab_btc_fmt:      string;
  custody_net_24h:         number;
  custody_net_24h_fmt:     string;
  custody_alert:           AlertLevel;
  etf_count:               number;
  trust_count:             number;
  custody_inflow_count:    number;
  custody_outflow_count:   number;
  // OTC layer
  otc_count:               number;
  otc_net_24h:             number;
  otc_net_24h_fmt:         string;
  otc_inflow_24h:          number;
  otc_inflow_24h_fmt:      string;
  otc_outflow_24h:         number;
  otc_outflow_24h_fmt:     string;
  otc_alert:               AlertLevel;
  otc_note:                string;
  // Grade quality
  grade_ab_count:          number;
  grade_cd_count:          number;
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
  updated_at:            string;
  rows:                  BreakdownRow[];
  total_btc_onchain:     number;
  total_btc_onchain_fmt: string;
  grade_ab_btc:          number;
  grade_ab_btc_fmt:      string;
  total_24h_net:         number;
  total_24h_net_fmt:     string;
  spot_price:            number | null;
  spot_price_fmt:        string;
}

interface WalletEntry {
  address:         string;
  etf:             string;
  custodian:       string;
  label:           string;
  grade:           Grade;
  grade_note:      string;
  source:          string;
  btc_balance:     number | null;
  btc_balance_fmt: string;
  btc_24h_in:      number | null;
  btc_24h_out:     number | null;
  btc_24h_net:     number | null;
  btc_24h_net_fmt: string;
  usd_balance_fmt: string;
  flow_direction:  FlowDir;
  batch_mode:      boolean;
  last_polled:     string;
}

interface CustodyData {
  updated_at:    string;
  coverage_note: string;
  wallets:       WalletEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API     = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH = 60 * 60 * 1000; // 1 hour

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

function alertBadge(level: AlertLevel) {
  if (level === "extreme") return "bg-red-950/40 border-red-900/50 text-red-400";
  if (level === "notable") return "bg-amber-950/40 border-amber-900/50 text-amber-500";
  return "bg-slate-900 border-slate-800 text-slate-500";
}

function flowColor(dir: FlowDir): string {
  if (dir === "inflow")  return "text-green-400";
  if (dir === "outflow") return "text-red-400";
  return "text-slate-500";
}

function netColor(n: number | null): string {
  if (n === null) return "text-slate-600";
  return n > 0 ? "text-green-400" : n < 0 ? "text-red-400" : "text-slate-500";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    }) + " UTC";
  } catch { return "—"; }
}

function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${GRADE_BG[grade]}`}>
      {grade}
    </span>
  );
}

function FlowDot({ dir }: { dir: FlowDir }) {
  const c = { inflow: "bg-green-500", outflow: "bg-red-500", neutral: "bg-slate-700" }[dir];
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${c}`} />;
}

function TypePill({ type }: { type: EtfType }) {
  const styles: Record<EtfType, string> = {
    ETF:   "border-amber-900/40 text-amber-600 bg-amber-950/20",
    Trust: "border-slate-700 text-slate-500 bg-slate-900",
    OTC:   "border-blue-900/40 text-blue-400 bg-blue-950/20",
  };
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${styles[type]}`}>
      {type}
    </span>
  );
}

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

// ─── State bar ────────────────────────────────────────────────────────────────

function StateBar({ summary }: { summary: SummaryData | null }) {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

      {/* Custody panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
            ETF & Trust Custody
          </span>
          <span className="text-[9px] font-mono text-slate-700">
            {summary.etf_count} ETF · {summary.trust_count} Trust
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xl text-slate-100">{summary.custody_btc_fmt}</span>
          <span className="text-[10px] font-mono text-slate-600">on-chain</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">Grade A/B</div>
            <div className="font-mono text-[12px] text-green-400">{summary.custody_ab_btc_fmt}</div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">24h Net</div>
            <div className={`font-mono text-[12px] ${netColor(summary.custody_net_24h)}`}>
              {summary.custody_net_24h_fmt}
            </div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1.5">
              <FlowDot dir="inflow" />
              <span className="text-[10px] font-mono text-slate-500">{summary.custody_inflow_count}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FlowDot dir="outflow" />
              <span className="text-[10px] font-mono text-slate-500">{summary.custody_outflow_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* OTC panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
            OTC / Prime Broker
          </span>
          <span className="text-[9px] font-mono text-slate-700">{summary.otc_count} entities</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className={`font-mono text-xl ${netColor(summary.otc_net_24h)}`}>
            {summary.otc_net_24h_fmt}
          </span>
          <span className="text-[10px] font-mono text-slate-600">24h net flow</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">Inflow</div>
            <div className="font-mono text-[12px] text-green-400">{summary.otc_inflow_24h_fmt}</div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">Outflow</div>
            <div className="font-mono text-[12px] text-red-400">{summary.otc_outflow_24h_fmt}</div>
          </div>
          {summary.otc_alert !== "none" && (
            <div className={`ml-auto text-[10px] font-mono px-2 py-1 rounded border ${alertBadge(summary.otc_alert)}`}>
              {summary.otc_alert === "extreme" ? "Extreme flow" : "Notable flow"}
            </div>
          )}
        </div>
        <div className="text-[9px] font-mono text-slate-700 pt-1 border-t border-slate-900">
          Balance near zero is normal — signal is 24h flow, not held balance
        </div>
      </div>

    </div>
  );
}

// ─── Methodology note ─────────────────────────────────────────────────────────

function MethodologyNote() {
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
          <p>ETF/Trust addresses sourced from SEC S-1 filings, 8-K disclosures, and on-chain cluster analysis. Custodians rotate cold wallets — balances are floors, not complete holdings.</p>
          <p>OTC/Prime broker addresses are settlement and deposit addresses. Funds move through quickly; standing balance near zero is expected. The signal is 24h inflow/outflow volume, not balance.</p>
          <p>On-chain data: blockchain.info public API, no key required, polled hourly.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-900">
            {(["A", "B", "C", "D"] as Grade[]).map(g => (
              <div key={g} className="flex items-start gap-2">
                <GradeBadge grade={g} />
                <span className="text-slate-600">{GRADE_LABELS[g]}</span>
              </div>
            ))}
          </div>
          <p className="text-slate-700 pt-1">Only Grade A and strong Grade B should influence investment signals.</p>
        </div>
      )}
    </div>
  );
}

// ─── Breakdown table (ETF/Trust OR OTC) ──────────────────────────────────────

function BreakdownTable({
  data, loading, filterType, emptyLabel,
}: {
  data:        BreakdownData | null;
  loading:     boolean;
  filterType:  EtfType[];
  emptyLabel:  string;
}) {
  const [sortKey, setSortKey] = useState<"btc_onchain" | "btc_24h_net" | "ticker">("btc_onchain");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  function toggleSort(k: typeof sortKey) {
    if (k === sortKey) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortKey(k); setSortDir(-1); }
  }

  const isOtc = filterType.includes("OTC");

  const rows = (data?.rows ?? [])
    .filter(r => filterType.includes(r.type as EtfType))
    .sort((a, b) => {
      const av = (a[sortKey] ?? (sortDir === -1 ? -Infinity : Infinity)) as number;
      const bv = (b[sortKey] ?? (sortDir === -1 ? -Infinity : Infinity)) as number;
      if (sortKey === "ticker") return sortDir * String(a.ticker).localeCompare(String(b.ticker));
      return sortDir * (av - bv);
    });

  const SortBtn = ({ k, label }: { k: typeof sortKey; label: string }) => (
    <button onClick={() => toggleSort(k)}
      className={`text-[9px] font-mono uppercase tracking-widest hover:text-slate-300 transition-colors ${sortKey === k ? "text-amber-500" : "text-slate-600"}`}>
      {label}{sortKey === k ? (sortDir === -1 ? " ↓" : " ↑") : ""}
    </button>
  );

  if (loading) return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center">
      <div className="text-[11px] font-mono text-slate-600">
        Polling wallets — first load may take ~2 min
      </div>
    </div>
  );

  // Totals for this subset
  const totalBtc = rows.reduce((s, r) => s + (r.btc_onchain ?? 0), 0);
  const totalNet = rows.reduce((s, r) => s + (r.btc_24h_net ?? 0), 0);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">

      {/* Header row */}
      <div className="px-5 py-3 border-b border-slate-900 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SortBtn k="ticker" label="Ticker" />
          <span className="text-slate-800">·</span>
          {!isOtc && <><SortBtn k="btc_onchain" label="Balance" /><span className="text-slate-800">·</span></>}
          <SortBtn k="btc_24h_net" label="24h Net" />
        </div>
        {data && (
          <div className="text-[9px] font-mono text-slate-700">{formatTime(data.updated_at)}</div>
        )}
      </div>

      {/* Totals bar */}
      {rows.length > 0 && (
        <div className="px-5 py-2 bg-slate-900/40 border-b border-slate-900 flex flex-wrap gap-x-6 gap-y-1 items-center">
          {!isOtc && (
            <div className="flex items-baseline gap-2">
              <span className="text-[9px] font-mono text-slate-600 uppercase">Total on-chain</span>
              <span className="font-mono text-[12px] text-slate-200">
                {totalBtc.toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC
              </span>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-[9px] font-mono text-slate-600 uppercase">24h Net</span>
            <span className={`font-mono text-[12px] ${netColor(totalNet)}`}>
              {totalNet >= 0 ? "+" : ""}{totalNet.toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC
            </span>
          </div>
          {isOtc && (
            <span className="text-[9px] font-mono text-slate-700 ml-auto">
              Balance near zero is normal — flow is the signal
            </span>
          )}
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-slate-900">
        {rows.length === 0 ? (
          <div className="px-5 py-6 text-[11px] font-mono text-slate-700">{emptyLabel}</div>
        ) : rows.map(row => {
          const ac = alertBadge(row.alert_level);
          return (
            <div key={row.ticker}
              className="px-5 py-3.5 grid grid-cols-12 gap-3 items-center hover:bg-slate-900/30 transition-colors">

              {/* Ticker + meta */}
              <div className="col-span-4 sm:col-span-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[13px] text-slate-100 font-semibold">{row.ticker}</span>
                  <TypePill type={row.type as EtfType} />
                </div>
                <div className="text-[10px] text-slate-600 truncate">{row.issuer}</div>
                <div className="text-[10px] font-mono text-slate-700 truncate mt-0.5">{row.custodian}</div>
              </div>

              {/* Balance — hidden for OTC (flow is signal) */}
              {!isOtc ? (
                <div className="col-span-3 sm:col-span-2">
                  <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">On-chain</div>
                  <div className="font-mono text-[12px] text-slate-200">
                    {row.btc_onchain
                      ? `${row.btc_onchain.toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC`
                      : "—"}
                  </div>
                  <div className="text-[10px] font-mono text-slate-600">{row.usd_onchain_fmt}</div>
                </div>
              ) : (
                <div className="col-span-3 sm:col-span-2">
                  <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">Balance</div>
                  <div className="font-mono text-[11px] text-slate-600 italic">
                    {row.btc_onchain
                      ? `${row.btc_onchain.toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC`
                      : "transit / zero"}
                  </div>
                </div>
              )}

              {/* 24h Net */}
              <div className="col-span-2 sm:col-span-2">
                <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">24h Net</div>
                <div className={`font-mono text-[12px] flex items-center gap-1.5 ${flowColor(row.flow_direction)}`}>
                  <FlowDot dir={row.flow_direction} />
                  {row.btc_24h_net !== null
                    ? `${row.btc_24h_net >= 0 ? "+" : ""}${row.btc_24h_net.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : "—"}
                </div>
              </div>

              {/* Alert */}
              <div className="hidden sm:block col-span-3">
                {row.alert_level !== "none" ? (
                  <div className={`text-[10px] font-mono px-2 py-1 rounded border inline-block ${ac}`}>
                    {row.flow_alert}
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-slate-700">—</span>
                )}
              </div>

              {/* Grade */}
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

// ─── Wallet detail (expandable, grouped by entity) ────────────────────────────

function WalletDetail({
  data, loading, filterType,
}: {
  data:       CustodyData | null;
  loading:    boolean;
  filterType: string[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading || !data) return null;

  const byEntity: Record<string, WalletEntry[]> = {};
  for (const w of data.wallets) {
    if (!filterType.length || filterType.includes(w.etf)) continue;
    // Include all wallets regardless of filterType (filter happens at section level)
  }
  // Group all wallets
  for (const w of data.wallets) {
    if (!byEntity[w.etf]) byEntity[w.etf] = [];
    byEntity[w.etf].push(w);
  }

  // Filter entities to only those matching the requested type
  // We identify type by checking if the key is in OTC entities or not
  const OTC_KEYS = ["COINBASE_PRIME", "GALAXY_DIGITAL"];
  const isOtcSection = filterType[0] === "OTC";
  const filteredEntities = Object.entries(byEntity).filter(([key]) =>
    isOtcSection ? OTC_KEYS.includes(key) : !OTC_KEYS.includes(key)
  );

  if (filteredEntities.length === 0) return null;

  return (
    <div className="space-y-2">
      {filteredEntities.map(([key, wallets]) => {
        const isOpen    = expanded === key;
        const totalBtc  = wallets.reduce((s, w) => s + (w.btc_balance ?? 0), 0);
        const totalNet  = wallets.reduce((s, w) => s + (w.btc_24h_net ?? 0), 0);
        const isOtc     = OTC_KEYS.includes(key);
        const worstGrade = wallets.reduce<Grade>((worst, w) => {
          const ord: Record<Grade, number> = { A: 0, B: 1, C: 2, D: 3 };
          return ord[w.grade] > ord[worst] ? w.grade : worst;
        }, "A");

        return (
          <div key={key} className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : key)}
              className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-slate-900/40 transition-colors text-left">
              <span className="font-mono text-[12px] text-slate-100 font-semibold w-36 shrink-0 truncate">{key}</span>
              <div className="flex items-center gap-1.5">
                <FlowDot dir={totalNet > 10 ? "inflow" : totalNet < -10 ? "outflow" : "neutral"} />
                <span className={`font-mono text-[12px] ${netColor(totalNet)}`}>
                  {totalNet >= 0 ? "+" : ""}{totalNet.toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC 24h
                </span>
              </div>
              {!isOtc && totalBtc > 0 && (
                <span className="font-mono text-[12px] text-slate-500">
                  {totalBtc.toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC held
                </span>
              )}
              {isOtc && (
                <span className="font-mono text-[11px] text-slate-600 italic">settlement address</span>
              )}
              <div className="ml-auto flex items-center gap-3">
                <GradeBadge grade={worstGrade} />
                <span className="text-[10px] font-mono text-slate-700">
                  {wallets.length}w {isOpen ? "▲" : "▼"}
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-900 divide-y divide-slate-900/60">
                {wallets.map(w => (
                  <div key={w.address} className="px-5 py-3 grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-12 sm:col-span-4">
                      <div className="text-[11px] text-slate-400 mb-0.5">{w.label}</div>
                      <div className="font-mono text-[9px] text-slate-700 break-all">{w.address}</div>
                      <div className="text-[9px] text-slate-700 mt-1">{w.custodian}</div>
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">
                        {isOtc ? "Balance" : "Balance"}
                      </div>
                      <div className={`font-mono text-[12px] ${isOtc ? "text-slate-600 italic" : "text-slate-200"}`}>
                        {w.btc_balance
                          ? `${w.btc_balance.toLocaleString("en-US", { maximumFractionDigits: 1 })} BTC`
                          : isOtc ? "transit" : "—"}
                      </div>
                      {!isOtc && <div className="text-[10px] font-mono text-slate-600">{w.usd_balance_fmt}</div>}
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <div className="text-[9px] font-mono text-slate-700 uppercase mb-0.5">24h Net</div>
                      <div className={`font-mono text-[12px] ${flowColor(w.flow_direction)}`}>
                        {w.btc_24h_net_fmt}
                      </div>
                      {w.btc_24h_in !== null && !w.batch_mode && (
                        <div className="text-[9px] font-mono text-slate-700">
                          ↑{w.btc_24h_in?.toFixed(1)} ↓{w.btc_24h_out?.toFixed(1)}
                        </div>
                      )}
                      {w.batch_mode && (
                        <div className="text-[9px] font-mono text-slate-800">batch — no flow</div>
                      )}
                    </div>

                    <div className="col-span-12 sm:col-span-4">
                      <div className="flex items-start gap-2 mb-1">
                        <GradeBadge grade={w.grade} />
                        <span className="text-[9px] font-mono text-slate-600 leading-tight">{w.grade_note}</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-700">{w.source}</div>
                      <div className="text-[9px] font-mono text-slate-800 mt-0.5">
                        Polled {formatTime(w.last_polled)}
                      </div>
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
      setLastUpdated(
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC"
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

      <main className="min-h-screen p-6" style={{ background: "#0B0B0C" }}>
        <div className="max-w-screen-xl mx-auto space-y-8">

          <DashboardNav
            current="etf-flows"
            title="Institutional Flow Monitor"
            lastUpdated={lastUpdated}
            onFlush={async () => {
              await fetch(`${API}/etf-flows/cache/flush`);
              fetchAll();
            }}
          />

          {error && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-5 py-4 text-sm font-mono text-red-400">
              {error} — check backend and ensure /etf-flows/* routes are registered.
            </div>
          )}

          {/* State bar — custody + OTC side by side */}
          <StateBar summary={summary} />

          {/* Methodology */}
          <MethodologyNote />

          {/* Section I — ETF & Trust */}
          <section>
            <SectionLabel
              numeral="I"
              title="ETF & Trust Holdings"
              subtitle="On-chain balance · 24h net · custodian · grade"
            />
            <BreakdownTable
              data={breakdown}
              loading={loading}
              filterType={["ETF", "Trust"]}
              emptyLabel="No ETF/Trust data yet"
            />
          </section>

          {/* Section II — OTC / Prime Broker */}
          <section>
            <SectionLabel
              numeral="II"
              title="OTC & Prime Broker Flow"
              subtitle="Settlement addresses · 24h flow is signal · balance near zero is normal"
            />
            <BreakdownTable
              data={breakdown}
              loading={loading}
              filterType={["OTC"]}
              emptyLabel="No OTC entities tracked yet"
            />
          </section>

          {/* Section III — Custody wallet detail */}
          <section>
            <SectionLabel
              numeral="III"
              title="ETF Custody Wallet Detail"
              subtitle="Per-address · expand to inspect · attribution source"
            />
            <WalletDetail data={custody} loading={loading} filterType={["ETF"]} />
          </section>

          {/* Section IV — OTC wallet detail */}
          <section>
            <SectionLabel
              numeral="IV"
              title="OTC Wallet Detail"
              subtitle="Per-address · in/out breakdown · grade rationale"
            />
            <WalletDetail data={custody} loading={loading} filterType={["OTC"]} />
          </section>

          <footer className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-[10px] font-mono text-slate-700">
              On-chain: blockchain.info public API · polled hourly
            </div>
            <div className="text-[10px] font-mono text-slate-700">
              AI organizes reality. Humans make decisions.
            </div>
          </footer>

        </div>
      </main>
    </>
  );
}
