"use client";

import { useCallback, useState } from "react";
import DashboardNav from "@/app/components/DashboardNav";
import SectionLabel from "@/app/components/dashboard/SectionLabel";
import { useVisibleRefresh } from "@/app/hooks/useVisibleRefresh";
import { fetchJson } from "@/app/lib/dashboard-api";
import type {
  PowderKegData,
  PowderKegFactor,
  PowderKegStage,
} from "@/app/types/powder-keg";

const REFRESH_MS = 15 * 60_000;

const STATE_COLORS: Record<string, string> = {
  CALM: "#8A8780",
  FRAGILE: "#D9A84D",
  TRIGGERED: "#D9824D",
  CASCADE: "#C4614A",
  EXHAUSTION: "#8DA078",
};

function text(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  return String(value);
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fmt(value: unknown, suffix = "", decimals = 1): string {
  const n = number(value);
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(decimals)}${suffix}`;
}

function scoreColor(score: number | null) {
  if (score == null) return "#55534B";
  if (score >= 75) return "#C4614A";
  if (score >= 55) return "#D9A84D";
  if (score >= 35) return "#A88954";
  return "#8DA078";
}

function StageCard({
  title,
  stage,
  active,
}: {
  title: string;
  stage: PowderKegStage;
  active: boolean;
}) {
  const eligible = stage.eligible !== false;
  const color = active ? "#D9A84D" : scoreColor(stage.score);

  return (
    <div
      className="rounded-xl border p-5 bg-surface"
      style={{
        borderColor: active ? `${color}77` : "#22231F",
        boxShadow: active ? `0 0 0 1px ${color}18 inset` : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="caps-sm text-faint">{title}</div>
          <div className="font-display text-[24px] mt-1" style={{ color }}>
            {!eligible ? "Not eligible" : stage.score == null ? "—" : stage.score}
          </div>
        </div>
        <div className="text-right">
          <div className="caps-sm text-faint">Coverage</div>
          <div className="font-mono-data text-paper-2 data-sm mt-1">
            {stage.coverage}%
          </div>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-black/30 mt-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${eligible && stage.score != null ? stage.score : 0}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {!eligible && stage.eligible_reason && (
        <p className="data-xs text-faint mt-3 leading-relaxed">
          {stage.eligible_reason}
        </p>
      )}
    </div>
  );
}

function EvidenceColumn({
  title,
  items,
  marker,
  empty,
}: {
  title: string;
  items: string[];
  marker: string;
  empty: string;
}) {
  return (
    <div className="rounded-xl border hairline bg-surface p-5">
      <div className="caps-sm text-faint mb-3">{title}</div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item} className="flex gap-2 data-sm text-paper-2">
              <span className="font-mono-data text-faint">{marker}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="data-sm text-faint">{empty}</div>
      )}
    </div>
  );
}

function FactorRow({ factor }: { factor: PowderKegFactor }) {
  const color = scoreColor(factor.score);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[190px_90px_1fr_130px] gap-3 lg:gap-5 py-4 border-b hairline last:border-b-0">
      <div>
        <div className="data-sm text-paper">{factor.label}</div>
        <div className="data-xs text-faint mt-1">{factor.source}</div>
      </div>
      <div>
        <div className="font-mono-data data-md" style={{ color }}>
          {factor.score == null ? "—" : factor.score}
        </div>
        <div className="data-xs text-faint">
          {Math.round(factor.weight * 100)}% weight
        </div>
      </div>
      <div>
        <div className="font-mono-data data-sm text-paper-2">{factor.value}</div>
        <p className="data-xs text-faint mt-1 leading-relaxed">
          {factor.explanation}
        </p>
      </div>
      <div className="lg:text-right">
        <span
          className="inline-flex rounded-md border px-2 py-1 caps-sm"
          style={{
            color: factor.available ? "#8DA078" : "#6A6860",
            borderColor: factor.available ? "rgba(141,160,120,.3)" : "#22231F",
          }}
        >
          {factor.available ? "available" : "missing"}
        </span>
      </div>
    </div>
  );
}

function StageBreakdown({
  numeral,
  title,
  subtitle,
  stage,
}: {
  numeral: string;
  title: string;
  subtitle: string;
  stage: PowderKegStage;
}) {
  return (
    <section>
      <SectionLabel numeral={numeral} title={title} subtitle={subtitle} />
      <div className="rounded-xl border hairline bg-surface px-5">
        {stage.factors.map((factor) => (
          <FactorRow factor={factor} key={factor.key} />
        ))}
      </div>
    </section>
  );
}

function DiagnosticStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="caps-sm text-faint">{label}</div>
      <div className="font-mono-data data-md text-paper mt-1">{value}</div>
    </div>
  );
}

export default function PowderKegPage() {
  const [data, setData] = useState<PowderKegData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const payload = await fetchJson<PowderKegData>("/powder-keg");
      setData(payload);
      setError(null);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Powder Keg refresh failed",
      );
    }
  }, []);

  useVisibleRefresh(refresh, REFRESH_MS);

  const updated = data?.updated_at
    ? new Date(data.updated_at).toLocaleString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const stateColor = STATE_COLORS[data?.state.code ?? "CALM"] ?? "#8A8780";
  const leverage = data?.diagnostics.leverage ?? {};
  const macro = data?.diagnostics.macro ?? {};
  const structure = data?.diagnostics.market_structure ?? {};
  const options = data?.diagnostics.options ?? {};
  const flows = data?.diagnostics.flows ?? {};

  return (
    <div className="min-h-screen bg-ink text-paper font-sans-body grid-bg">
      <main className="max-w-[1440px] mx-auto px-8 py-8 space-y-10">
        <DashboardNav
          current="powder-keg"
          title="Powder Keg"
          lastUpdated={updated}
          onFlush={refresh}
        />

        {error && (
          <div className="rounded-lg border border-extreme-card bg-extreme-10 px-4 py-3 data-sm text-alert-extreme">
            {error}
          </div>
        )}

        {!data ? (
          <div className="rounded-xl border hairline bg-surface p-8 text-muted">
            Loading market-structure state…
          </div>
        ) : (
          <>
            <section
              className="rounded-2xl border p-7"
              style={{
                borderColor: `${stateColor}66`,
                background: `${stateColor}0D`,
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div>
                  <div className="caps-sm text-faint">Current forced-selling state</div>
                  <div
                    className="font-display text-[42px] leading-none mt-2"
                    style={{ color: stateColor }}
                  >
                    {data.state.label}
                  </div>
                  <p className="text-paper-2 mt-4 max-w-3xl leading-relaxed">
                    {data.state.summary}
                  </p>
                </div>
                <div className="rounded-xl border hairline bg-black/20 px-5 py-4 min-w-[180px]">
                  <div className="caps-sm text-faint">State confidence</div>
                  <div className="font-mono-data text-[28px] text-paper mt-1">
                    {data.state.confidence}%
                  </div>
                  <div className="data-xs text-faint mt-1">
                    coverage of relevant inputs
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-7">
                <StageCard
                  title="Fragility"
                  stage={data.stages.fragility}
                  active={data.state.code === "FRAGILE"}
                />
                <StageCard
                  title="Trigger"
                  stage={data.stages.trigger}
                  active={data.state.code === "TRIGGERED"}
                />
                <StageCard
                  title="Cascade"
                  stage={data.stages.cascade}
                  active={data.state.code === "CASCADE"}
                />
                <StageCard
                  title="Exhaustion"
                  stage={data.stages.exhaustion}
                  active={data.state.code === "EXHAUSTION"}
                />
              </div>
            </section>

            <section>
              <SectionLabel
                numeral="I"
                title="What the model sees"
                subtitle="supporting evidence · contradictions · unavailable inputs"
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <EvidenceColumn
                  title="Supporting"
                  items={data.supporting}
                  marker="▲"
                  empty="No high-impact supporting evidence."
                />
                <EvidenceColumn
                  title="Contradicting / stabilizing"
                  items={data.contradicting}
                  marker="▽"
                  empty="No strong contradiction in the scored inputs."
                />
                <EvidenceColumn
                  title="Limitations"
                  items={data.limitations}
                  marker="·"
                  empty="Core scored inputs are available."
                />
              </div>
            </section>

            <section>
              <SectionLabel
                numeral="II"
                title="Live diagnostics"
                subtitle="raw subsystem context · not independently rescored"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border hairline bg-surface p-5 space-y-4">
                  <div className="caps-sm text-amber-sand">Leverage / fuel</div>
                  <DiagnosticStat label="Perps state" value={text(leverage.state)} />
                  <DiagnosticStat label="Primary side" value={text(leverage.primary_side)} />
                  <DiagnosticStat label="Funding · 8h" value={fmt(leverage.funding_pct_8h, "%", 4)} />
                  <DiagnosticStat label="OI · 24h" value={fmt(leverage.oi_change_24h_pct, "%", 2)} />
                  <DiagnosticStat label="Forced score" value={text(leverage.forced_score)} />
                </div>

                <div className="rounded-xl border hairline bg-surface p-5 space-y-4">
                  <div className="caps-sm text-amber-sand">Ignition / macro</div>
                  <DiagnosticStat label="Regime" value={text(macro.regime)} />
                  <DiagnosticStat label="Policy read" value={text(macro.policy_read)} />
                  <DiagnosticStat label="10Y real · 1d" value={fmt(macro.real_10y_d1_bp, "bp")} />
                  <DiagnosticStat label="DXY · 1d" value={fmt(macro.dxy_d1_pct, "%", 2)} />
                  <DiagnosticStat label="VIX · 1d" value={fmt(macro.vix_d1_pct, "%", 1)} />
                </div>

                <div className="rounded-xl border hairline bg-surface p-5 space-y-4">
                  <div className="caps-sm text-amber-sand">Cascade / structure</div>
                  <DiagnosticStat label="Cascade risk" value={text(structure.cascade_risk_label)} />
                  <DiagnosticStat
                    label="Adjusted coverage"
                    value={
                      number(structure.adjusted_coverage) == null
                        ? "—"
                        : `${number(structure.adjusted_coverage)?.toFixed(2)}×`
                    }
                  />
                  <DiagnosticStat
                    label="Depth vs median"
                    value={
                      number(structure.depth_vs_median_pct) == null
                        ? "—"
                        : `${number(structure.depth_vs_median_pct)?.toFixed(0)}%`
                    }
                  />
                  <DiagnosticStat label="Breadth" value={text(structure.breadth_label)} />
                  <DiagnosticStat label="Liquidation source" value={text(structure.liquidation_source)} />
                </div>

                <div className="rounded-xl border hairline bg-surface p-5 space-y-4">
                  <div className="caps-sm text-amber-sand">Context / confirmation</div>
                  <DiagnosticStat label="Options term" value={text(options.term_structure)} />
                  <DiagnosticStat label="Risk reversal" value={fmt(options.risk_reversal_25d, "%", 2)} />
                  <DiagnosticStat label="ETF flow" value={text(flows.etf_current)} />
                  <DiagnosticStat label="ETF · 7d" value={text(flows.etf_7d)} />
                  <div className="data-xs text-faint leading-relaxed pt-1">
                    ETF flows and options remain context-only until their persistence fields are promoted into the state model.
                  </div>
                </div>
              </div>
            </section>

            <StageBreakdown
              numeral="III"
              title="Fragility · fuel"
              subtitle="leverage vulnerability · spot fragility · breadth"
              stage={data.stages.fragility}
            />
            <StageBreakdown
              numeral="IV"
              title="Trigger · ignition"
              subtitle="Macro Day 2 · BTC price damage"
              stage={data.stages.trigger}
            />
            <StageBreakdown
              numeral="V"
              title="Cascade · forced selling"
              subtitle="deleveraging · absorption · cross-market confirmation"
              stage={data.stages.cascade}
            />
            <StageBreakdown
              numeral="VI"
              title="Exhaustion · selling runs out"
              subtitle={
                data.stages.exhaustion.eligible
                  ? "eligible after recent cascade"
                  : "gated until a real cascade occurs"
              }
              stage={data.stages.exhaustion}
            />

            <footer className="pt-8 hairline-t flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-muted">
              <div className="caps-sm text-faint">
                Powder Keg model · v{data.model?.version ?? "2.0"} · descriptive state
              </div>
              <div className="caps-sm text-faint">
                Market structure is not an automatic trade instruction.
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
