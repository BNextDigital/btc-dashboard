"use client";

import type {
  PerpsPressureData,
  PressureCell,
} from "@/app/types/btc-dashboard";

const COLORS = {
  amber: "#D9A84D",
  red: "#E05252",
  blue: "#60A5FA",
};

function clamp(value: number | null | undefined) {
  return Math.max(0, Math.min(100, Number(value ?? 0)));
}

function fmtPct(value: number | null | undefined, decimals = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

function fmtPp(value: number | null | undefined, decimals = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}pp`;
}

function fmtMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
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
  const basis = data.basis_context;
  const accent = primaryColor(state?.primary_side);

  const persistence = carry?.persistence_24h;
  const persistenceReady =
    (persistence?.sample_count ?? 0) >= 4 &&
    (persistence?.coverage_hours ?? 0) >= 6 &&
    persistence?.dominant_side !== "building_history";

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
              note={fmtPrice(positioning?.price_usd)}
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

      {/* CME basis promoted from a tiny context stat into the derivatives cockpit. */}
      <div className="border-t border-slate-800 p-5 bg-black/10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-5">
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              CME Basis · Regulated Futures Carry
            </div>
            <div
              className="mt-1"
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 20,
                color: COLORS.amber,
              }}
            >
              {basis?.regime_label ??
                (basis?.status === "available"
                  ? "CME Carry Context"
                  : "CME Carry Unavailable")}
            </div>
          </div>

          {basis?.status === "available" && (
            <span className="text-[10px] font-mono uppercase text-amber-500 border border-amber-900/50 bg-amber-950/20 rounded px-2 py-1">
              {basis.trend_5d ?? "—"} 5d
            </span>
          )}
        </div>

        {basis?.status === "available" ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-5">
              <Stat
                label="CME annualized"
                value={fmtPct(basis.cme_annualized_pct, 2)}
                note="dated futures basis"
              />
              <Stat
                label="Perp annualized"
                value={fmtPct(basis.perp_annualized_pct, 2)}
                note="if current funding persisted"
              />
              <Stat
                label="Perp − CME"
                value={fmtPp(basis.spread_vs_perp_pp, 2)}
                note="structure diagnostic"
              />
              <Stat
                label="Raw basis"
                value={
                  basis.raw_basis == null
                    ? "—"
                    : String(basis.raw_basis)
                }
                note="futures vs spot"
              />
              <Stat
                label="Days to expiry"
                value={
                  basis.days_to_exp == null
                    ? "—"
                    : `${basis.days_to_exp}d`
                }
              />
              <Stat
                label="CME future"
                value={fmtPrice(basis.futures_px)}
              />
              <Stat
                label="Reference spot"
                value={fmtPrice(basis.spot_px)}
              />
              <Stat
                label="Alert"
                value={basis.alert && basis.alert !== "—" ? basis.alert : "None"}
                note={basis.trend_note ?? undefined}
              />
            </div>

            <div className="border-t border-slate-900 mt-5 pt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
              <div>
                <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-1">
                  Basis vs perps interpretation
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-4xl">
                  {basis.interpretation ?? basis.pattern ?? "—"}
                </p>
              </div>
              <div className="text-[9px] font-mono text-slate-700 leading-relaxed lg:max-w-sm">
                {basis.comparison_note ??
                  "Perp funding and CME basis use different carry structures; compare them directionally."}
              </div>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-slate-500">
            CME basis snapshot is unavailable. Perps Pressure remains valid from
            funding, OI and price inputs.
          </p>
        )}
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
            Funding persistence
          </div>

          {persistenceReady ? (
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Positive samples"
                value={fmtPct(persistence?.positive_share_pct, 0)}
              />
              <Stat
                label="Negative samples"
                value={fmtPct(persistence?.negative_share_pct, 0)}
              />
              <Stat
                label="Coverage"
                value={`${persistence?.coverage_hours ?? 0}h`}
              />
              <Stat
                label="Samples"
                value={String(persistence?.sample_count ?? 0)}
              />
            </div>
          ) : (
            <div>
              <div className="font-mono text-sm text-amber-500 uppercase">
                Building history
              </div>
              <div className="text-[11px] text-slate-500 leading-relaxed mt-2">
                {persistence?.sample_count ?? 0} sample
                {(persistence?.sample_count ?? 0) === 1 ? "" : "s"} ·{" "}
                {persistence?.coverage_hours ?? 0}h coverage
              </div>
              <div className="text-[9px] font-mono text-slate-700 mt-2">
                Need ≥4 samples and ≥6h before classifying persistence.
              </div>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
            Data confidence
          </div>
          <div className="font-mono text-sm text-slate-200 uppercase">
            Core data · {data.data_quality?.status ?? "—"}
          </div>
          <div className="grid grid-cols-1 gap-1.5 mt-3 text-[10px] font-mono">
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Funding / OI / price</span>
              <span className="text-slate-400">
                {(data.data_quality?.core_inputs_available ?? 0) === 3
                  ? "Available"
                  : "Partial"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Persistence</span>
              <span className="text-slate-400">
                {persistenceReady ? "Available" : "Building"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Liquidation clusters</span>
              <span className="text-slate-400">
                {data.data_quality?.liquidation_clusters ?? "Unavailable"}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed mt-3">
            Carry = observed · crowding = inferred · forced side = strongly
            inferred. Heatmap clusters describe vulnerability, not realized fills.
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
