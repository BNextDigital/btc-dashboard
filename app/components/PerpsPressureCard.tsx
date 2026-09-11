"use client";

import type {
  PerpsPressureData,
  PressureCell,
} from "@/app/types/btc-dashboard";

const COLORS = {
  paper: "#E8E6E0",
  amber: "#D9A84D",
  red: "#E05252",
  blue: "#60A5FA",
  green: "#6A9A6A",
  muted: "#6B7280",
};

function clamp(value: number | null | undefined) {
  return Math.max(0, Math.min(100, Number(value ?? 0)));
}

function fmtPct(value: number | null | undefined, decimals = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

function fmtMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function primaryColor(side?: string) {
  if (side === "longs") return COLORS.red;
  if (side === "shorts") return COLORS.blue;
  return COLORS.amber;
}

function scoreColor(score?: number | null) {
  const n = Number(score ?? 0);
  if (n >= 75) return COLORS.red;
  if (n >= 50) return COLORS.amber;
  if (n >= 25) return "#9A7C43";
  return "#374151";
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div>
      <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="font-mono text-sm text-slate-200">{value}</div>
      {note && (
        <div className="text-[9px] font-mono text-slate-700 mt-1 leading-relaxed">
          {note}
        </div>
      )}
    </div>
  );
}

function MatrixBar({ cell }: { cell?: PressureCell }) {
  const score = cell?.score;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[9px] font-mono text-slate-600 uppercase">
          {cell?.level ?? "—"}
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          {score == null ? "—" : score}
        </span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clamp(score)}%`,
            backgroundColor: scoreColor(score),
          }}
        />
      </div>
    </div>
  );
}

export default function PerpsPressureCard({
  data,
}: {
  data: PerpsPressureData;
}) {
  const state = data.state;
  const carry = data.carry;
  const positioning = data.positioning;
  const forced = data.forced_flow;
  const liq = data.liquidation_vulnerability;
  const accent = primaryColor(state?.primary_side);

  const matrixRows = [
    ["Carry burden", "carry"],
    ["Crowding", "crowding"],
    ["Forced flow", "forced"],
    ["Vulnerability", "vulnerability"],
  ] as const;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div
        className="p-5 border-b border-slate-800"
        style={{ background: `${accent}0C` }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              Derivatives · Perpetual Futures
            </div>
            <div
              className="mt-1"
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 24,
                color: accent,
              }}
            >
              {state?.label ?? "Perps Pressure"}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-2 max-w-3xl">
              {state?.explanation ??
                "Funding, open interest and price are being combined into a side-pressure read."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-[10px] font-mono uppercase border rounded px-2 py-1"
              style={{
                color: accent,
                borderColor: `${accent}55`,
                background: `${accent}12`,
              }}
            >
              {state?.primary_side ?? "mixed"}
            </span>
            <span className="text-[10px] font-mono text-slate-600 uppercase">
              {state?.severity ?? "—"} pressure
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5">
        <div className="xl:col-span-3 p-5 border-b xl:border-b-0 xl:border-r border-slate-800">
          <div className="grid grid-cols-[140px_1fr_1fr] gap-x-5 gap-y-4 items-center">
            <div />
            <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
              Longs
            </div>
            <div className="text-[9px] font-mono text-blue-400 uppercase tracking-widest">
              Shorts
            </div>

            {matrixRows.map(([label, key]) => (
              <div key={key} className="contents">
                <div className="text-xs text-slate-400">{label}</div>
                <MatrixBar cell={data.matrix?.longs?.[key]} />
                <MatrixBar cell={data.matrix?.shorts?.[key]} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 border-t border-slate-900 pt-5 mt-6">
            <Stat
              label="Funding · 8h"
              value={fmtPct(carry?.funding_pct_8h, 4)}
              note={`${carry?.payer ?? "—"} pay`}
            />
            <Stat
              label="Annualized if persistent"
              value={fmtPct(carry?.annualized_pct_if_persisted, 1)}
              note="simple annualization"
            />
            <Stat
              label="OI · 24h"
              value={fmtPct(positioning?.oi_change_24h_pct, 2)}
              note={positioning?.oi_display ?? "—"}
            />
            <Stat
              label="BTC · 24h"
              value={fmtPct(positioning?.price_change_1d_pct, 2)}
              note={
                positioning?.price_usd == null
                  ? "—"
                  : `$${positioning.price_usd.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}`
              }
            />
          </div>
        </div>

        <div className="xl:col-span-2 p-5 flex flex-col gap-5">
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
              Carry pain translator
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="$100k · day"
                value={fmtMoney(carry?.cost_per_day_if_rate_persisted_usd)}
                note="if current rate persisted"
              />
              <Stat
                label="$100k · week"
                value={fmtMoney(carry?.cost_per_week_if_rate_persisted_usd)}
                note="if current rate persisted"
              />
              <Stat
                label="7d cumulative"
                value={fmtPct(carry?.cumulative_7d_pct, 3)}
                note={`${carry?.history_days_available ?? 0}d history`}
              />
              <Stat
                label="30d cumulative"
                value={fmtPct(carry?.cumulative_30d_pct, 3)}
                note="stored history only"
              />
            </div>
          </div>

          <div className="border-t border-slate-900 pt-4">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              Forced-flow read
            </div>
            <div className="text-sm text-slate-200 mt-2">
              {forced?.label ?? "—"}
            </div>
            <div className="text-[10px] font-mono text-amber-500 uppercase mt-1">
              {forced?.confidence?.replaceAll("_", " ") ?? "—"}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
              {forced?.explanation ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-slate-800">
        <div className="p-5 lg:border-r border-slate-800">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
            Nearby liquidation vulnerability
          </div>

          {liq?.status === "measured_heatmap" ? (
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Long clusters · ±2%"
                value={liq.long_cluster_display ?? "—"}
              />
              <Stat
                label="Short clusters · ±2%"
                value={liq.short_cluster_display ?? "—"}
              />
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Measured long/short heatmap clusters unavailable. OI heuristic
              scenarios are intentionally excluded here.
            </p>
          )}

          {liq?.note && (
            <div className="text-[9px] font-mono text-slate-700 leading-relaxed mt-3">
              {liq.note}
            </div>
          )}
        </div>

        <div className="p-5 lg:border-r border-slate-800">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
            Persistence & basis
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="Positive samples"
              value={fmtPct(carry?.persistence_24h?.positive_share_pct, 0)}
            />
            <Stat
              label="Negative samples"
              value={fmtPct(carry?.persistence_24h?.negative_share_pct, 0)}
            />
            <Stat
              label="CME basis"
              value={
                data.basis_context?.annualized == null
                  ? "—"
                  : String(data.basis_context.annualized)
              }
              note={data.basis_context?.trend_5d ?? "—"}
            />
            <Stat
              label="Fast history"
              value={`${carry?.persistence_24h?.coverage_hours ?? 0}h`}
              note={`${carry?.persistence_24h?.sample_count ?? 0} samples`}
            />
          </div>
        </div>

        <div className="p-5">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
            Interpretation discipline
          </div>
          <div className="font-mono text-sm text-slate-200 uppercase">
            {data.data_quality?.status ?? "—"}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
            Carry = observed · crowding = inferred · forced side = strongly
            inferred. Heatmap clusters describe vulnerability, not realized
            fills.
          </p>
          <div className="text-[9px] font-mono text-slate-700 mt-3">
            {data.updated_at
              ? `${new Date(data.updated_at).toLocaleString("en-US", {
                  timeZone: "UTC",
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                  day: "numeric",
                })} UTC`
              : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
