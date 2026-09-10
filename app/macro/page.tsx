"use client";

/**
 * app/macro/page.tsx — Day 2 Macro Dashboard
 *
 * Hierarchy:
 *   0. Macro trigger / data mode
 *   I. Expectations & repricing
 *  II. Financial conditions
 * III. Cross-asset confirmation
 *  IV. Regime diagnosis
 *   V. Transmission chain
 *  VI. Treasury curve context
 * VII. Secondary cross-asset context
 *
 * Data: GET /macro/metrics
 * The existing root payload remains supported; the new Day 2 layer lives
 * under response.day2 so backend/frontend can be rolled out independently.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import DashboardNav from "../components/DashboardNav";

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface MacroTrigger {
  type?: string;
  title?: string;
  released_at?: string;
  actual?: number | null;
  consensus?: number | null;
  previous?: number | null;
  surprise?: number | null;
  surprise_label?: string;
  source?: string;
}

interface FedWatchOutcome {
  target?: string;
  probability?: number | null;
}

interface FedWatchData {
  status?: "connected" | "not_connected" | "unavailable" | string;
  source?: string;
  mode?: "official" | "derived" | string;
  official_cme_fedwatch?: boolean;
  as_of?: string | null;
  next_meeting?: string | null;
  current_target?: string | null;
  cut_probability?: number | null;
  hold_probability?: number | null;
  hike_probability?: number | null;
  cut_probability_change_1d_pp?: number | null;
  expected_change_bp?: number | null;
  current_effr?: number | null;
  monthly_implied_effr?: number | null;
  post_meeting_expected_effr?: number | null;
  outcomes?: FedWatchOutcome[];
  note?: string;
}

interface Day2RateMetric {
  label?: string;
  current?: number | null;
  d1_bp?: number | null;
  d5_bp?: number | null;
  percentile?: number | null;
  source?: string;
  as_of?: string;
  error?: string;
}

interface Day2MarketMetric {
  label?: string;
  current?: number | null;
  d1_pct?: number | null;
  d5_pct?: number | null;
  d1_bp?: number | null;
  d5_bp?: number | null;
  percentile?: number | null;
  source?: string;
  as_of?: string;
  error?: string;
}

interface PolicyRead {
  label?: string;
  level?: "tightening" | "easing" | "neutral" | string;
  explanation?: string;
}

interface RegimeData {
  type?: string;
  label?: string;
  level?: "risk_on" | "risk_off" | "tightening" | "easing" | "neutral" | string;
  confidence?: number | null;
  explanation?: string;
  evidence?: string[];
  inputs_available?: number;
}

interface TransmissionStep {
  stage?: string;
  label?: string;
  move?: string;
  direction?: string;
  confidence?: "observed" | "strongly_inferred" | "possible" | string;
}

interface Day2Layer {
  updated_at?: string;
  trigger?: MacroTrigger | null;
  fedwatch?: FedWatchData;
  rates?: Record<string, Day2RateMetric>;
  policy_read?: PolicyRead;
  conditions?: Record<string, Day2MarketMetric>;
  cross_asset?: Record<string, Day2MarketMetric>;
  regime?: RegimeData;
  transmission?: TransmissionStep[];
  data_mode?: "event_relative" | "daily_repricing" | "unavailable" | string;
  notes?: string[];
  error?: string;
}

interface MacroMetrics {
  updated_at?: string;
  yields?: Record<string, YieldTenor>;
  curve?: { spread_2y10y_bp?: number | null; label?: string };
  nasdaq100?: EquitySMACard;
  sp500?: EquitySMACard;
  brent?: EquitySMACard;
  gold?: EquitySMACard;
  silver?: EquitySMACard;
  platinum?: EquitySMACard;
  copper?: EquitySMACard;
  day2?: Day2Layer;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REFRESH_INTERVAL = 30 * 60 * 1000;

const COLORS = {
  paper: "#E8E6E0",
  gold: "#D9A84D",
  green: "#7AB648",
  red: "#E24B4A",
  blue: "#4A6FA5",
  muted: "#64748B",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined, decimals = 2, suffix = ""): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(decimals)}${suffix}`;
}

function signed(value: number | null | undefined, decimals = 1, suffix = ""): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}${suffix}`;
}

function formatET(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function regimeColor(level?: string): string {
  if (level === "risk_on" || level === "easing") return COLORS.green;
  if (level === "risk_off" || level === "tightening") return COLORS.red;
  return COLORS.gold;
}

function moveColor(value: number | null | undefined, positiveIsBad = false): string {
  if (value == null || Number.isNaN(value) || Math.abs(value) < 0.0001) return "text-slate-500";
  const bad = positiveIsBad ? value > 0 : value < 0;
  return bad ? "text-red-400" : "text-green-400";
}

function formatCurrent(metric?: Day2MarketMetric, kind: "number" | "usd" | "bp" = "number"): string {
  const value = metric?.current;
  if (value == null) return "—";
  if (kind === "bp") return `${value.toFixed(0)}bp`;
  if (kind === "usd") {
    if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function SectionLabel({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4 pb-3 border-b border-slate-900">
      <div className="flex items-baseline gap-3">
        <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: COLORS.gold, fontSize: 22 }}>
          {num}
        </span>
        <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: COLORS.paper, fontSize: 20 }}>
          {title}
        </span>
      </div>
      {subtitle && <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest text-right">{subtitle}</span>}
    </div>
  );
}

function PercentileBar({ value }: { value?: number | null }) {
  if (value == null) return <div className="h-1 bg-slate-800 rounded-full" />;
  const color = value >= 80 ? COLORS.red : value >= 60 ? COLORS.gold : value <= 20 ? COLORS.green : COLORS.blue;
  return (
    <div className="relative h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
      <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
    </div>
  );
}

function StatusPill({ text, color = COLORS.gold }: { text: string; color?: string }) {
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wide"
      style={{ color, borderColor: color + "55", backgroundColor: color + "12" }}>
      {text}
    </span>
  );
}

function BlankCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 min-h-40">
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">{title}</div>
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </div>
  );
}

// ─── 0. Macro Trigger ────────────────────────────────────────────────────────

function MacroTriggerPanel({ day2 }: { day2: Day2Layer }) {
  const trigger = day2.trigger;
  const eventMode = day2.data_mode === "event_relative" && trigger;

  if (!eventMode) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1">Macro Trigger</div>
          <div className="text-sm text-slate-300">Daily repricing mode</div>
          <div className="text-xs text-slate-600 mt-1">No normalized economic-event trigger is connected yet; changes below are close-to-close.</div>
        </div>
        <StatusPill text="Daily repricing" />
      </div>
    );
  }

  const surpriseColor = ["hot", "strong"].includes((trigger.surprise_label ?? "").toLowerCase()) ? COLORS.red
    : ["cool", "weak"].includes((trigger.surprise_label ?? "").toLowerCase()) ? COLORS.green
    : COLORS.gold;

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: surpriseColor + "55", backgroundColor: surpriseColor + "0A" }}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Latest Macro Trigger</div>
          <div className="text-2xl mt-1" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>{trigger.title ?? "Macro event"}</div>
          <div className="text-xs text-slate-600 mt-1">{formatET(trigger.released_at)}</div>
        </div>
        <StatusPill text={(trigger.surprise_label ?? "neutral").toUpperCase()} color={surpriseColor} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 border-t border-slate-900 pt-4">
        {[
          ["Actual", trigger.actual],
          ["Consensus", trigger.consensus],
          ["Previous", trigger.previous],
          ["Surprise", trigger.surprise],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">{label}</div>
            <div className="font-mono text-lg text-slate-200 mt-1">{value == null ? "—" : String(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── I. Expectations & Repricing ────────────────────────────────────────────

function FedWatchCard({ data }: { data?: FedWatchData }) {
  const isOfficial = data?.official_cme_fedwatch === true;
  const title = isOfficial ? "CME FedWatch" : "Fed Policy Probabilities";

  if (!data || data.status !== "connected") {
    return (
      <BlankCard
        title={title}
        message={data?.note ?? "Fed Funds futures probability data is unavailable."}
      />
    );
  }

  const delta = data.cut_probability_change_1d_pp;
  const statusText = isOfficial ? "Official" : "Derived";
  const statusColor = isOfficial ? COLORS.green : COLORS.amber;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{title}</div>
          <div className="text-xs text-slate-500 mt-1">Next meeting · {data.next_meeting ?? "—"}</div>
        </div>
        <StatusPill text={statusText} color={statusColor} />
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wide">Cut probability</div>
        <div className="font-mono text-4xl text-slate-100 mt-1">{fmt(data.cut_probability, 1, "%")}</div>
        <div className={`font-mono text-xs mt-1 ${moveColor(delta, false)}`}>Δ 1d {signed(delta, 1, "pp")}</div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-slate-900 mt-4 pt-3">
        <div><div className="text-[9px] font-mono text-slate-600">CUT</div><div className="font-mono text-sm">{fmt(data.cut_probability, 1, "%")}</div></div>
        <div><div className="text-[9px] font-mono text-slate-600">HOLD</div><div className="font-mono text-sm">{fmt(data.hold_probability, 1, "%")}</div></div>
        <div><div className="text-[9px] font-mono text-slate-600">HIKE</div><div className="font-mono text-sm">{fmt(data.hike_probability, 1, "%")}</div></div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-slate-900 mt-4 pt-3">
        <div>
          <div className="text-[9px] font-mono text-slate-600 uppercase">Expected meeting move</div>
          <div className="font-mono text-sm text-slate-300 mt-1">{signed(data.expected_change_bp, 1, "bp")}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-slate-600 uppercase">Current EFFR</div>
          <div className="font-mono text-sm text-slate-300 mt-1">{fmt(data.current_effr, 3, "%")}</div>
        </div>
      </div>

      <div className="text-[9px] font-mono text-slate-700 mt-3">
        {data.source} · {formatET(data.as_of)}
      </div>
      {!isOfficial && (
        <div className="text-[9px] text-slate-700 mt-1">
          CME methodology applied locally to Yahoo-sourced 30-Day Fed Funds futures; not official CME FedWatch API output.
        </div>
      )}
    </div>
  );
}

function RateCard({ data, emphasis = false }: { data?: Day2RateMetric; emphasis?: boolean }) {
  if (!data || data.current == null) return <BlankCard title={data?.label ?? "Rate"} message={data?.error ?? "No data"} />;
  return (
    <div className={`rounded-xl border bg-slate-950 p-5 ${emphasis ? "border-amber-900/50" : "border-slate-800"}`}>
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{data.label}</div>
      <div className="font-mono text-3xl text-slate-100 mt-2">{fmt(data.current, 2, "%")}</div>
      <div className="grid grid-cols-2 gap-3 mt-4 border-t border-slate-900 pt-3">
        <div>
          <div className="text-[9px] font-mono text-slate-600 uppercase">1d</div>
          <div className={`font-mono text-sm ${moveColor(data.d1_bp, true)}`}>{signed(data.d1_bp, 1, "bp")}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-slate-600 uppercase">5d</div>
          <div className={`font-mono text-sm ${moveColor(data.d5_bp, true)}`}>{signed(data.d5_bp, 1, "bp")}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-[9px] font-mono text-slate-600"><span>1Y percentile</span><span>{data.percentile == null ? "—" : `${data.percentile}th`}</span></div>
        <PercentileBar value={data.percentile} />
      </div>
      <div className="text-[9px] font-mono text-slate-700 mt-3">{data.source} · {data.as_of ?? "—"}</div>
    </div>
  );
}

function PolicyReadCard({ data }: { data?: PolicyRead }) {
  if (!data) return null;
  const color = regimeColor(data.level);
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: color + "55", backgroundColor: color + "0A" }}>
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Rates Interpretation</div>
      <div className="text-lg font-medium" style={{ color }}>{data.label ?? "—"}</div>
      <p className="text-sm text-slate-400 leading-relaxed mt-2">{data.explanation ?? "—"}</p>
    </div>
  );
}

// ─── II / III. Reaction cards ────────────────────────────────────────────────

function ReactionCard({ data, unit = "number", positiveIsBad = false }: {
  data?: Day2MarketMetric;
  unit?: "number" | "usd" | "bp";
  positiveIsBad?: boolean;
}) {
  if (!data || data.current == null) return <BlankCard title={data?.label ?? "Metric"} message={data?.error ?? "No data"} />;
  const d1 = unit === "bp" ? data.d1_bp : data.d1_pct;
  const d5 = unit === "bp" ? data.d5_bp : data.d5_pct;
  const suffix = unit === "bp" ? "bp" : "%";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{data.label}</div>
      <div className="font-mono text-2xl text-slate-100 mt-2">{formatCurrent(data, unit)}</div>
      <div className="grid grid-cols-2 gap-3 mt-4 border-t border-slate-900 pt-3">
        <div><div className="text-[9px] font-mono text-slate-600">1D MOVE</div><div className={`font-mono text-sm ${moveColor(d1, positiveIsBad)}`}>{signed(d1, unit === "bp" ? 1 : 2, suffix)}</div></div>
        <div><div className="text-[9px] font-mono text-slate-600">5D MOVE</div><div className={`font-mono text-sm ${moveColor(d5, positiveIsBad)}`}>{signed(d5, unit === "bp" ? 1 : 2, suffix)}</div></div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-[9px] font-mono text-slate-600"><span>1Y percentile</span><span>{data.percentile == null ? "—" : `${data.percentile}th`}</span></div>
        <PercentileBar value={data.percentile} />
      </div>
      <div className="text-[9px] font-mono text-slate-700 mt-3">{data.source} · {data.as_of ?? "—"}</div>
    </div>
  );
}

// ─── IV. Regime ──────────────────────────────────────────────────────────────

function RegimeCard({ data }: { data?: RegimeData }) {
  if (!data) return <BlankCard title="Macro Regime" message="No regime analysis" />;
  const color = regimeColor(data.level);
  return (
    <div className="rounded-xl border p-6" style={{ borderColor: color + "66", backgroundColor: color + "0A" }}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Macro Regime</div>
          <div className="text-3xl mt-1" style={{ color, fontFamily: "'Instrument Serif', Georgia, serif" }}>{data.label ?? "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-mono text-slate-600 uppercase">Confidence</div>
          <div className="font-mono text-2xl" style={{ color }}>{data.confidence ?? 0}%</div>
        </div>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed mt-4 max-w-4xl">{data.explanation ?? "—"}</p>
      {!!data.evidence?.length && (
        <div className="flex flex-wrap gap-2 mt-4 border-t border-slate-900 pt-4">
          {data.evidence.map((item) => <StatusPill key={item} text={item} color={color} />)}
        </div>
      )}
    </div>
  );
}

// ─── V. Transmission ────────────────────────────────────────────────────────

function TransmissionChain({ steps }: { steps?: TransmissionStep[] }) {
  if (!steps?.length) return <BlankCard title="Transmission Chain" message="No transmission analysis" />;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 overflow-x-auto">
      <div className="min-w-[760px] flex items-stretch gap-2">
        {steps.map((step, index) => {
          const color = regimeColor(step.direction);
          return (
            <div key={`${step.stage}-${index}`} className="contents">
              <div className="flex-1 min-w-32 rounded-lg border border-slate-900 p-3" style={{ backgroundColor: color + "08" }}>
                <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">{step.stage}</div>
                <div className="text-xs text-slate-300 mt-1">{step.label}</div>
                <div className="font-mono text-[11px] mt-2 leading-relaxed" style={{ color }}>{step.move}</div>
                <div className="text-[8px] font-mono text-slate-700 uppercase mt-2">{step.confidence?.replaceAll("_", " ")}</div>
              </div>
              {index < steps.length - 1 && <div className="flex items-center text-slate-700">→</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VI. Existing Treasury context ───────────────────────────────────────────

function YieldTable({ yields, curve }: { yields?: MacroMetrics["yields"]; curve?: MacroMetrics["curve"] }) {
  const tenors = ["1y", "2y", "3y", "5y", "10y"] as const;
  if (!yields) return <BlankCard title="Treasury Curve" message="No Treasury data" />;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-800">
          {["Tenor", "Yield", "1d", "5d", "1Y percentile", "Signal"].map((heading, i) => (
            <th key={heading} className={`py-2.5 px-4 text-[10px] font-mono text-slate-600 uppercase tracking-wide font-normal ${i === 0 ? "text-left" : "text-right"}`}>{heading}</th>
          ))}
        </tr></thead>
        <tbody>
          {tenors.map((tenor) => {
            const row = yields[tenor] ?? {};
            return (
              <tr key={tenor} className="border-b border-slate-900 last:border-b-0">
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">{tenor.toUpperCase()}</td>
                <td className="px-4 py-3 font-mono text-right text-slate-100">{fmt(row.current, 2, "%")}</td>
                <td className={`px-4 py-3 font-mono text-right text-xs ${moveColor(row.d1_chg, true)}`}>{row.d1_chg == null ? "—" : signed(row.d1_chg * 100, 1, "bp")}</td>
                <td className={`px-4 py-3 font-mono text-right text-xs ${moveColor(row.d5_chg, true)}`}>{row.d5_chg == null ? "—" : signed(row.d5_chg * 100, 1, "bp")}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{row.percentile == null ? "—" : `${row.percentile}th`}</td>
                <td className="px-4 py-3 text-right text-xs text-slate-500">{row.alert ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-3 border-t border-slate-800 flex flex-wrap gap-6 text-xs text-slate-600">
        <span>2Y–10Y: <span className="font-mono" style={{ color: COLORS.gold }}>{curve?.spread_2y10y_bp == null ? "—" : signed(curve.spread_2y10y_bp, 0, "bp")}</span></span>
        <span>Curve: <span style={{ color: COLORS.gold }}>{curve?.label ?? "—"}</span></span>
      </div>
    </div>
  );
}

// ─── VII. Secondary context ─────────────────────────────────────────────────

function SMACard({ title, data }: { title: string; data?: EquitySMACard }) {
  if (!data || data.error) return <BlankCard title={title} message={data?.error ?? "No data"} />;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{title}</div>
      <div className="font-mono text-xl text-slate-100 mt-2">{data.current == null ? "—" : data.current.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
      <div className="grid grid-cols-3 gap-2 mt-3 border-t border-slate-900 pt-3">
        {[
          ["SMA20", data.pct_from_sma20],
          ["SMA50", data.pct_from_sma50],
          ["SMA200", data.pct_from_sma200],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <div className="text-[8px] font-mono text-slate-700">{label}</div>
            <div className={`font-mono text-[11px] ${moveColor(value as number | null | undefined)}`}>{signed(value as number | null | undefined, 1, "%")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function MacroDashboard() {
  const [macro, setMacro] = useState<MacroMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef(0);
  const inFlightRef = useRef(false);

  const fetchAll = useCallback(async (force = false) => {
    if (inFlightRef.current) return;
    if (!force && document.hidden) return;
    inFlightRef.current = true;

    try {
      const response = await fetch(`${API}/macro/metrics`);
      if (!response.ok) throw new Error(`Macro API ${response.status}`);
      const data: MacroMetrics = await response.json();
      setMacro(data);
      setError(null);
      lastFetchRef.current = Date.now();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchAll(true);
    const timer = window.setInterval(() => fetchAll(false), REFRESH_INTERVAL);

    const onVisibility = () => {
      if (!document.hidden && Date.now() - lastFetchRef.current > REFRESH_INTERVAL) fetchAll(true);
    };
    const onFocus = () => {
      if (Date.now() - lastFetchRef.current > REFRESH_INTERVAL) fetchAll(true);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAll]);

  const day2 = macro?.day2;
  const rates = day2?.rates ?? {};
  const conditions = day2?.conditions ?? {};
  const cross = day2?.cross_asset ?? {};
  const lastUpdated = formatET(day2?.updated_at ?? macro?.updated_at);

  return (
    <main className="min-h-screen p-6" style={{ background: "#0B0B0C", color: COLORS.paper, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardNav current="macro" title="Macro Dashboard" lastUpdated={lastUpdated} onFlush={() => fetchAll(true)} />

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-400 font-mono">
            {error} — preserving last good macro snapshot.
          </div>
        )}

        {loading && !macro && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">Fetching macro state…</div>
        )}

        {macro && !day2 && (
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-4 text-sm text-amber-300">
            Day 2 backend layer is not deployed yet. Legacy Treasury context remains available below.
          </div>
        )}

        {day2 && <MacroTriggerPanel day2={day2} />}

        {day2 && (
          <section>
            <SectionLabel num="I" title="Expectations & Repricing" subtitle="What did the market price differently?" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FedWatchCard data={day2.fedwatch} />
              <RateCard data={rates.yield_2y} emphasis />
              <RateCard data={rates.real_yield_10y} emphasis />
              <RateCard data={rates.breakeven_10y} />
              <RateCard data={rates.yield_10y} />
              <RateCard data={rates.breakeven_5y} />
              <RateCard data={rates.breakeven_5y5y} />
              <PolicyReadCard data={day2.policy_read} />
            </div>
          </section>
        )}

        {day2 && (
          <section>
            <SectionLabel num="II" title="Financial Conditions" subtitle="Did repricing tighten or ease the system?" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ReactionCard data={conditions.dxy} positiveIsBad />
              <ReactionCard data={conditions.vix} positiveIsBad />
              <ReactionCard data={conditions.hy_oas} unit="bp" positiveIsBad />
            </div>
          </section>
        )}

        {day2 && (
          <section>
            <SectionLabel num="III" title="Cross-Asset Confirmation" subtitle="Did risk assets confirm the macro impulse?" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ReactionCard data={cross.nasdaq} />
              <ReactionCard data={cross.sp500} />
              <ReactionCard data={cross.btc} unit="usd" />
              <ReactionCard data={cross.brent} unit="usd" />
            </div>
          </section>
        )}

        {day2 && (
          <section>
            <SectionLabel num="IV" title="Regime Diagnosis" subtitle="Good dovish, bad dovish, hawkish, or mixed?" />
            <RegimeCard data={day2.regime} />
          </section>
        )}

        {day2 && (
          <section>
            <SectionLabel num="V" title="Transmission Chain" subtitle="Observed first · inference second" />
            <TransmissionChain steps={day2.transmission} />
          </section>
        )}

        {macro && (
          <section>
            <SectionLabel num="VI" title="Treasury Curve Context" subtitle="Structure, not the trigger by itself" />
            <YieldTable yields={macro.yields} curve={macro.curve} />
          </section>
        )}

        {macro && (macro.gold || macro.silver || macro.platinum || macro.copper) && (
          <section>
            <SectionLabel num="VII" title="Secondary Cross-Asset Context" subtitle="Useful context · lower priority" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SMACard title="Gold" data={macro.gold} />
              <SMACard title="Silver" data={macro.silver} />
              <SMACard title="Platinum" data={macro.platinum} />
              <SMACard title="Copper" data={macro.copper} />
            </div>
          </section>
        )}

        <footer className="pt-4 border-t border-slate-900 text-xs text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>FRED · Yahoo Finance · CME methodology / FedWatch when entitled</span>
          <span>·</span>
          <span>30m snapshot cadence</span>
          <span>·</span>
          <span>Observed → inferred → possible</span>
        </footer>
      </div>
    </main>
  );
}
