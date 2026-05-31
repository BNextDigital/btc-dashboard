"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────
interface SectorMetric {
  name: string; ticker: string;
  current?: number | null; change_5d?: number | null;
  mfi?: number | null;
  obv?: number | null;
  obv_zscore?: number | null;
  volume_momentum?: number | null;
  relative_strength_5d?: number | null;
  relative_strength_20d?: number | null;
  flow_signal?: string;
}
interface CreditSpread {
  hyg_price?: number | null; lqd_price?: number | null;
  ratio?: number | null; d5_chg?: number | null; d20_chg?: number | null;
  percentile?: number | null; trend?: string; alert?: string; error?: string;
}
interface CotAsset {
  net_position?: number | null; wk_chg?: number | null;
  percentile?: number | null; report_date?: string; alert?: string;
}
interface SectorFlowResponse {
  updated_at: string;
  sectors: Record<string, SectorMetric>;
  credit: CreditSpread;
  cot: Record<string, CotAsset> & { error?: string };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const REFRESH_INTERVAL = 5 * 60 * 1000;
const SECTOR_ORDER = ["equities", "tech", "financials", "energy", "realestate", "metals", "crypto", "bonds"];

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(val: number | null | undefined, decimals = 2): string {
  if (val == null || isNaN(val)) return "–";
  return val.toFixed(decimals);
}
function fmtSigned(val: number | null | undefined, decimals = 1, suffix = ""): string {
  if (val == null || isNaN(val)) return "–";
  return `${val >= 0 ? "+" : ""}${val.toFixed(decimals)}${suffix}`;
}
function fmtK(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "–";
  const abs = Math.abs(val);
  const sign = val >= 0 ? "+" : "-";
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

function posColor(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "text-muted";
  return val >= 0 ? "text-neutral-sage" : "text-alert-extreme";
}
function negColor(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "text-muted";
  return val <= 0 ? "text-neutral-sage" : "text-alert-extreme";
}

function mfiColor(val?: number | null): string {
  if (val == null) return "text-muted";
  if (val > 70) return "text-alert-extreme";
  if (val > 60) return "text-alert-notable";
  if (val < 30) return "text-neutral-sage";
  if (val < 40) return "text-neutral-sage";
  return "text-paper-2";
}
function zColor(val?: number | null): string {
  if (val == null) return "text-muted";
  if (val > 2)    return "text-neutral-sage";
  if (val > 0.5)  return "text-neutral-sage";
  if (val < -2)   return "text-alert-extreme";
  if (val < -0.5) return "text-alert-extreme";
  return "text-paper-2";
}
function volMomColor(val?: number | null): string {
  if (val == null) return "text-muted";
  if (val > 1.2) return "text-neutral-sage";
  if (val < 0.8) return "text-alert-extreme";
  return "text-paper-2";
}

function flowBadgeClass(signal?: string): string {
  if (!signal) return "bg-surface-2 hairline text-muted";
  const s = signal.toLowerCase();
  if (s.includes("heavy inflow") || s.includes("strong inflow")) return "bg-sage-10 border-sage text-neutral-sage";
  if (s.includes("mild inflow"))  return "bg-sage-10 border-sage text-neutral-sage";
  if (s.includes("heavy outflow") || s.includes("strong outflow")) return "bg-extreme-10 border-extreme text-alert-extreme";
  if (s.includes("mild outflow")) return "bg-notable-10 border-notable text-alert-notable";
  return "bg-surface-2 hairline text-muted";
}

function heatBg(val: number | null): string {
  if (val == null) return "#22231F";
  if (val > 60)  return "#6B1F1A";
  if (val > 30)  return "#5A3A10";
  if (val > 0)   return "#1C1C1E";
  if (val > -30) return "#152415";
  if (val > -60) return "#1A3322";
  return "#0F2B1C";
}
function heatText(val: number | null): string {
  if (val == null) return "#55534B";
  if (val > 60)  return "#C4614A";
  if (val > 30)  return "#C89A3F";
  if (val < -30) return "#8DA078";
  if (val < 0)   return "#8DA078";
  return "#8A8780";
}

function PercentileBar({ value }: { value?: number | null }) {
  if (value == null || isNaN(value)) return null;
  const color = value >= 80 ? "#C4614A" : value >= 60 ? "#C89A3F" : value <= 20 ? "#8DA078" : "#55534B";
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-[3px] bg-surface-inset rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono-data caps-sm" style={{ color }}>{value}th</span>
    </div>
  );
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

// ── I. Credit Spread Panel ────────────────────────────────────────────────
function CreditSpreadPanel({ data }: { data?: CreditSpread }) {
  if (!data || data.error) return (
    <div className="bg-surface border hairline p-5">
      <div className="caps-sm text-faint mb-2">HYG / LQD Credit Spread</div>
      <div className="font-mono-data text-muted text-[12px]">{data?.error ?? "No data"}</div>
    </div>
  );
  return (
    <div className="bg-surface border hairline p-5">
      <div className="flex items-start justify-between hairline-b pb-3 mb-4">
        <div>
          <div className="caps-sm text-faint">HYG / LQD Credit Spread</div>
          <div className="font-sans-body text-muted text-[11px] mt-0.5">High Yield vs Investment Grade — leading risk appetite signal</div>
        </div>
        {data.alert && data.alert !== "–" && (
          <span className={`caps-sm border px-2 py-[3px] ${data.alert?.toLowerCase().includes("risk-on") || data.alert?.toLowerCase().includes("elevated") ? "bg-sage-10 border-sage text-neutral-sage" : "bg-notable-10 border-notable text-alert-notable"}`}>
            {data.alert}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-6">
        <div>
          <div className="caps-sm text-faint mb-1">HYG / LQD Ratio</div>
          <div className="font-mono-data text-paper text-[22px]">{fmt(data.ratio, 4)}</div>
        </div>
        <div>
          <div className="caps-sm text-faint mb-1">5d change</div>
          <div className={`font-mono-data text-[18px] ${posColor(data.d5_chg)}`}>{fmtSigned(data.d5_chg, 4)}</div>
        </div>
        <div>
          <div className="caps-sm text-faint mb-1">20d change</div>
          <div className={`font-mono-data text-[18px] ${posColor(data.d20_chg)}`}>{fmtSigned(data.d20_chg, 4)}</div>
        </div>
        <div>
          <div className="caps-sm text-faint mb-1">90d percentile</div>
          <div className="font-mono-data text-paper text-[18px]">{data.percentile != null ? `${data.percentile}th` : "–"}</div>
          <PercentileBar value={data.percentile} />
        </div>
      </div>
      <div className="mt-4 hairline-t pt-3">
        <span className="font-sans-body text-paper-2 text-[12px] italic">{data.trend ?? "–"}</span>
        <span className="caps-sm text-faint ml-4">HYG {fmt(data.hyg_price, 2)} · LQD {fmt(data.lqd_price, 2)}</span>
      </div>
    </div>
  );
}

// ── II. Flow Matrix Heatmap ───────────────────────────────────────────────
function FlowMatrix({ sectors }: { sectors: Record<string, SectorMetric> }) {
  const norm = (val: number | null | undefined, type: string): number | null => {
    if (val == null) return null;
    if (type === "mfi")  return (val - 50) * 2;
    if (type === "obv")  return val;
    if (type === "vm")   return (val - 1) * 100;
    if (type === "z")    return Math.max(-100, Math.min(100, val * 40));
    if (type === "rs")   return Math.max(-100, Math.min(100, val * 10));
    return val;
  };

  return (
    <div className="bg-surface border hairline overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="hairline-b bg-surface-inset">
            <th className="text-left px-5 py-3 caps-sm text-faint font-normal w-36">Sector</th>
            <th className="text-center px-3 py-3 caps-sm text-faint font-normal">MFI</th>
            <th className="text-center px-3 py-3 caps-sm text-faint font-normal">OBV Norm</th>
            <th className="text-center px-3 py-3 caps-sm text-faint font-normal">OBV Z-Score</th>
            <th className="text-center px-3 py-3 caps-sm text-faint font-normal">Vol Mom</th>
            <th className="text-center px-3 py-3 caps-sm text-faint font-normal">RS 5d</th>
            <th className="text-center px-3 py-3 caps-sm text-faint font-normal">RS 20d</th>
            <th className="text-right px-5 py-3 caps-sm text-faint font-normal">Signal</th>
          </tr>
        </thead>
        <tbody>
          {SECTOR_ORDER.map((key) => {
            const s = sectors[key];
            if (!s) return null;
            const cells = [
              { val: s.mfi,                  n: norm(s.mfi, "mfi"),  label: fmt(s.mfi, 0) },
              { val: s.obv,                  n: norm(s.obv, "obv"),  label: fmt(s.obv, 0) },
              { val: s.obv_zscore,           n: norm(s.obv_zscore, "z"),  label: fmt(s.obv_zscore, 2) },
              { val: s.volume_momentum,      n: norm(s.volume_momentum, "vm"),  label: `${fmt(s.volume_momentum, 2)}x` },
              { val: s.relative_strength_5d, n: norm(s.relative_strength_5d, "rs"),  label: fmtSigned(s.relative_strength_5d, 1, "%") },
              { val: s.relative_strength_20d,n: norm(s.relative_strength_20d, "rs"), label: fmtSigned(s.relative_strength_20d, 1, "%") },
            ];
            return (
              <tr key={key} className="hairline-b hover:bg-surface-2 transition-colors last:border-0">
                <td className="px-5 py-3">
                  <div className="font-sans-body text-paper-2 text-[13px]">{s.name}</div>
                  <div className="font-mono-data text-faint text-[10px]">{s.ticker}</div>
                </td>
                {cells.map(({ n, label }, i) => (
                  <td key={i} className="px-3 py-3 text-center">
                    <span className="font-mono-data text-[11px] px-2 py-0.5 rounded-sm"
                      style={{ background: heatBg(n), color: heatText(n) }}>
                      {label}
                    </span>
                  </td>
                ))}
                <td className="px-5 py-3 text-right">
                  <span className={`inline-block caps-sm border px-2 py-[3px] ${flowBadgeClass(s.flow_signal)}`}>
                    {s.flow_signal ?? "–"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-5 py-3 hairline-t bg-surface-inset flex items-center gap-6 caps-sm text-faint">
        <span><span style={{ color: "#C4614A" }}>■</span> Outflow / Bearish</span>
        <span><span style={{ color: "#C89A3F" }}>■</span> Moderate</span>
        <span><span style={{ color: "#8DA078" }}>■</span> Inflow / Bullish</span>
        <span className="ml-auto">OBV Z-Score: &gt;2 = strong accumulation, &lt;-2 = strong distribution</span>
      </div>
    </div>
  );
}

// ── III. Sector Cards ─────────────────────────────────────────────────────
function SectorCard({ s }: { s: SectorMetric }) {
  return (
    <div className="bg-surface border hairline p-5">
      <div className="flex items-start justify-between hairline-b pb-3 mb-3">
        <div>
          <div className="caps-sm text-faint">{s.name}</div>
          <div className="font-mono-data text-faint text-[10px] mt-0.5">{s.ticker}</div>
        </div>
        <div className="text-right">
          <div className="font-mono-data text-paper text-[15px]">{fmt(s.current, 2)}</div>
          <div className={`font-mono-data text-[11px] ${posColor(s.change_5d)}`}>{fmtSigned(s.change_5d, 1, "%")}</div>
        </div>
      </div>
      <div className={`inline-block caps-sm border px-2 py-[3px] mb-3 ${flowBadgeClass(s.flow_signal)}`}>
        {s.flow_signal ?? "–"}
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between items-baseline">
          <span className="caps-sm text-faint">MFI (14)</span>
          <span className={`font-mono-data ${mfiColor(s.mfi)}`}>{fmt(s.mfi, 0)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="caps-sm text-faint">OBV (norm)</span>
          <span className={`font-mono-data ${s.obv != null && s.obv >= 0 ? "text-neutral-sage" : "text-alert-extreme"}`}>{fmt(s.obv, 0)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="caps-sm text-faint">OBV Z-Score</span>
          <span className={`font-mono-data ${zColor(s.obv_zscore)}`}>{fmt(s.obv_zscore, 2)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="caps-sm text-faint">Vol momentum</span>
          <span className={`font-mono-data ${volMomColor(s.volume_momentum)}`}>{fmt(s.volume_momentum, 2)}x</span>
        </div>
        <div className="flex justify-between items-baseline hairline-t pt-1.5">
          <span className="caps-sm text-faint">vs SPY 5d</span>
          <span className={`font-mono-data ${posColor(s.relative_strength_5d)}`}>{fmtSigned(s.relative_strength_5d, 1, "%")}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="caps-sm text-faint">vs SPY 20d</span>
          <span className={`font-mono-data ${posColor(s.relative_strength_20d)}`}>{fmtSigned(s.relative_strength_20d, 1, "%")}</span>
        </div>
      </div>
    </div>
  );
}

// ── IV. COT Panel ─────────────────────────────────────────────────────────
function CotPanel({ cot }: { cot: Record<string, CotAsset> & { error?: string } }) {
  const assets = [
    { key: "gold",  label: "Gold",      sub: "GC futures · COMEX" },
    { key: "bonds", label: "Bonds",     sub: "ZB futures · CBOT" },
    { key: "crude", label: "Crude Oil", sub: "CL futures · NYMEX" },
  ];

  if (cot.error) return (
    <div className="bg-surface border hairline p-5">
      <div className="caps-sm text-faint mb-2">CFTC COT — Futures Positioning</div>
      <div className="font-mono-data text-muted text-[12px]">{cot.error}</div>
    </div>
  );

  return (
    <div className="bg-surface border hairline overflow-hidden">
      <div className="px-5 py-4 hairline-b flex items-end justify-between">
        <div>
          <div className="caps-sm text-faint">CFTC Commitments of Traders</div>
          <div className="font-sans-body text-muted text-[11px] mt-0.5">Leveraged money net positioning (hedge funds) · weekly</div>
        </div>
        {assets[0] && cot["gold"]?.report_date && (
          <span className="caps-sm text-faint">Report date: {cot["gold"].report_date}</span>
        )}
      </div>
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: "#22231F" }}>
        {assets.map(({ key, label, sub }) => {
          const d = cot[key] as CotAsset | undefined;
          if (!d) return (
            <div key={key} className="p-5">
              <div className="caps-sm text-faint">{label}</div>
              <div className="font-mono-data text-muted text-[12px] mt-2">No data</div>
            </div>
          );
          const isLong = d.net_position != null && d.net_position >= 0;
          return (
            <div key={key} className="p-5">
              <div className="caps-sm text-faint mb-0.5">{label}</div>
              <div className="font-mono-data text-faint text-[10px] mb-3">{sub}</div>
              <div className={`font-mono-data text-[24px] leading-none mb-1 ${isLong ? "text-neutral-sage" : "text-alert-extreme"}`}>
                {fmtK(d.net_position)}
              </div>
              <div className="caps-sm text-faint mb-3">contracts net {isLong ? "long" : "short"}</div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-baseline">
                  <span className="caps-sm text-faint">Wk chg</span>
                  <span className={`font-mono-data ${posColor(d.wk_chg)}`}>{fmtK(d.wk_chg)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="caps-sm text-faint">20w percentile</span>
                  <span className="font-mono-data text-paper-2">{d.percentile != null ? `${d.percentile}th` : "–"}</span>
                </div>
              </div>
              <PercentileBar value={d.percentile} />
              {d.alert && d.alert !== "–" && (
                <div className={`mt-3 caps-sm border px-2 py-[3px] inline-block ${d.alert.includes("Extreme") ? (isLong ? "bg-sage-10 border-sage text-neutral-sage" : "bg-extreme-10 border-extreme text-alert-extreme") : "bg-surface-2 hairline text-muted"}`}>
                  {d.alert}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── V. Rotation Thesis ────────────────────────────────────────────────────
function RotationThesis() {
  return (
    <div className="bg-surface border hairline p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="caps-sm text-faint mb-3">Flow Signals</div>
        <div className="space-y-2 font-sans-body text-[12px]">
          <div><span className="text-neutral-sage">Heavy / Strong Inflow</span> <span className="text-muted">— MFI high + vol accelerating + RS outperforming</span></div>
          <div><span className="text-neutral-sage">Mild Inflow</span> <span className="text-muted">— One or two signals positive, others neutral</span></div>
          <div><span className="text-alert-extreme">Heavy / Strong Outflow</span> <span className="text-muted">— MFI low + vol drying up + RS underperforming</span></div>
          <div><span className="text-alert-notable">Mild Outflow</span> <span className="text-muted">— Gradual, not confirmed across metrics</span></div>
          <div><span className="text-paper-2">Stable</span> <span className="text-muted">— Mixed or conflicting signals</span></div>
        </div>
      </div>
      <div>
        <div className="caps-sm text-faint mb-3">Rotation Archetypes</div>
        <div className="space-y-2 font-sans-body text-[12px]">
          <div><span className="text-neutral-sage">Metals + Bonds in · Crypto + Tech out</span> <span className="text-muted">→ Risk-off, flight to safety</span></div>
          <div><span className="text-neutral-sage">Crypto + Tech in · Bonds out</span> <span className="text-muted">→ Risk-on, risk appetite expanding</span></div>
          <div><span className="text-alert-notable">HYG/LQD falling + Equities stable</span> <span className="text-muted">→ Credit stress before equity moves</span></div>
          <div><span className="text-alert-extreme">All sectors outflow · COT net short</span> <span className="text-muted">→ Broad de-risking event</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function SectorCapitalFlowMatrix() {
  const [data, setData] = useState<SectorFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/sector-flows/metrics`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      setData(await res.json());
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [fetchData]);

  return (
    <main className="bg-ink min-h-screen" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <header className="hairline-b">
        <div className="max-w-[1440px] mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-baseline gap-6">
            <h1 className="font-display text-paper text-[30px] leading-none tracking-tight">
              Sector<span className="font-display-italic text-amber-sand"> · </span><span className="font-display-italic">Capital Flow Matrix</span>
            </h1>
            <span className="caps-sm text-faint hidden md:inline">AI organizes · humans decide</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="caps-sm text-muted border hairline px-3 py-1.5 hover:text-paper transition-colors">BTC</a>
            <a href="/macro" className="caps-sm text-muted border hairline px-3 py-1.5 hover:text-paper transition-colors">Macro</a>
            <span className="caps-sm text-amber-sand border border-amber-sand bg-amber-sand-10 px-3 py-1.5">Sector Flows</span>
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
      {loading && !data && (
        <div className="max-w-[1440px] mx-auto px-8 py-20 text-center caps-sm text-faint">Analyzing sector flows…</div>
      )}

      <div className="max-w-[1440px] mx-auto px-8 py-8 space-y-12">

        {data && (
          <>
            {/* I. Credit Spread */}
            <section>
              <SectionLabel numeral="I" title="Credit Risk Appetite" subtitle="HYG / LQD · leading indicator" />
              <CreditSpreadPanel data={data.credit} />
            </section>

            {/* II. Flow Matrix */}
            <section>
              <SectionLabel numeral="II" title="Sector Flow Matrix" subtitle="MFI · OBV · OBV Z-Score · Vol Momentum · Relative Strength" />
              <FlowMatrix sectors={data.sectors} />
              <div className="mt-3 flex flex-wrap gap-6 caps-sm text-faint">
                <span><span className="text-paper-2">RS 5d / 20d</span> — sector return minus SPY return · continuous, not binary</span>
                <span><span className="text-paper-2">OBV Z-Score</span> — standard deviations from 20d OBV mean · comparable across all assets</span>
              </div>
            </section>

            {/* III. Sector Cards */}
            <section>
              <SectionLabel numeral="III" title="Sector Detail" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {SECTOR_ORDER.map((key) => {
                  const s = data.sectors[key];
                  return s ? <SectorCard key={key} s={s} /> : null;
                })}
              </div>
            </section>

            {/* IV. COT */}
            <section>
              <SectionLabel numeral="IV" title="CFTC COT — Futures Positioning" subtitle="Hedge fund net position · weekly · free data" />
              <CotPanel cot={data.cot} />
            </section>

            {/* V. Rotation Thesis */}
            <section>
              <SectionLabel numeral="V" title="Rotation Thesis" />
              <RotationThesis />
            </section>
          </>
        )}

      </div>

      <footer className="max-w-[1440px] mx-auto px-8 py-6 hairline-t">
        <span className="caps-sm text-faint">
          Data: yFinance (OHLCV) · CFTC COT (weekly, cftc.gov) · Metrics: MFI, OBV, OBV Z-Score, Volume Momentum, Relative Strength vs SPY · 5min cache
        </span>
      </footer>
    </main>
  );
}
