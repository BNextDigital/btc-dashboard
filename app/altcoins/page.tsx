"use client";

import { useCallback, useState } from "react";
import DashboardNav from "@/app/components/DashboardNav";
import PercentileBar from "@/app/components/dashboard/PercentileBar";
import SectionLabel from "@/app/components/dashboard/SectionLabel";
import { useVisibleRefresh } from "@/app/hooks/useVisibleRefresh";
import { fetchJson } from "@/app/lib/dashboard-api";
import type { AltcoinMetrics } from "@/app/types/altcoins";

const REFRESH_MS = 30 * 60_000;

const STATE_COLORS: Record<string, string> = {
  DEPRESSED: "#8A8780",
  RECOVERING: "#D9A84D",
  BROAD_ADVANCE: "#5F9E6E",
  EXTENDED: "#D9824B",
  DETERIORATING: "#E05252",
};

function fmtPct(value: number | null | undefined, suffix = "%") {
  return value == null ? "—" : `${value.toFixed(1)}${suffix}`;
}

function fmtSignedPct(value: number | null | undefined) {
  return value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function fmtSignedPp(value: number | null | undefined) {
  return value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}pp`;
}

function qualifier(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

function fmtCap(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  return `$${value.toLocaleString()}`;
}

function StatCard({
  label,
  value,
  detail,
  source,
}: {
  label: string;
  value: string;
  detail?: string;
  source?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 min-w-0">
      <div className="caps-sm text-faint">{label}</div>
      <div className="mt-2 font-mono text-2xl text-slate-100">{value}</div>
      {detail && <div className="mt-2 text-xs text-slate-500 leading-relaxed">{detail}</div>}
      {source && (
        <div className="mt-3 pt-3 border-t border-slate-900 text-[9px] font-mono uppercase tracking-widest text-slate-700">
          {source}
        </div>
      )}
    </div>
  );
}

function EvidenceColumn({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="caps-sm text-faint mb-3">{title}</div>
      {items.length ? (
        <ul className="space-y-2 text-sm text-slate-300">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-slate-600">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-slate-600">No resolved evidence yet.</div>
      )}
    </div>
  );
}

export default function AltcoinView() {
  const [data, setData] = useState<AltcoinMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const payload = await fetchJson<AltcoinMetrics>("/altcoins/metrics");
      setData(payload);
      setError(null);
      setLastUpdated(
        payload.state?.timestamp
          ? new Date(payload.state.timestamp).toISOString().replace("T", " ").slice(0, 16)
          : new Date().toISOString().replace("T", " ").slice(0, 16),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Altcoin View refresh failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useVisibleRefresh(refresh, REFRESH_MS);

  const state = data?.state;
  const breadth = data?.breadth;
  const rotation = data?.rotation;
  const market = data?.market;
  const benchmarks = data?.benchmarks;
  const color = STATE_COLORS[state?.label ?? "RECOVERING"] ?? "#8A8780";

  const historyReady = (breadth?.coverage.with_minimum_history ?? 0) > 0;
  const coverageText = breadth
    ? `${breadth.coverage.with_minimum_history}/${breadth.coverage.universe_symbols} assets with ${breadth.coverage.minimum_days}D history`
    : "Loading universe coverage";

  return (
    <main className="min-h-screen bg-[#09090B] text-slate-200">
      <div className="max-w-[1500px] mx-auto px-5 py-5 md:px-8 md:py-7 space-y-8">
        <DashboardNav
          current="altcoins"
          title="Altcoin Market Structure"
          lastUpdated={lastUpdated}
          onFlush={refresh}
        />

        {error && (
          <div className="rounded-lg border border-red-950 bg-red-950/20 px-4 py-3 text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-500">
            Loading altcoin market structure…
          </div>
        )}

        {data && (
          <>
            <section
              className="rounded-2xl border bg-slate-950 p-6"
              style={{ borderColor: `${color}66`, background: `${color}0D` }}
            >
              <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
                <div>
                  <div className="caps-sm text-faint">Altcoin State</div>
                  <div className="mt-2 font-display text-[34px]" style={{ color }}>
                    {state?.label.replaceAll("_", " ")}
                  </div>
                  <div className="mt-2 max-w-3xl text-sm text-slate-400 leading-relaxed">
                    {state?.summary}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="State confidence" value={fmtPct(state?.confidence)} />
                  <StatCard label="Universe coverage" value={fmtPct(state?.coverage)} detail={coverageText} />
                </div>
              </div>
            </section>

            {!historyReady && (
              <section className="rounded-xl border border-amber-900/60 bg-amber-950/10 px-5 py-4">
                <div className="text-xs font-mono uppercase tracking-widest text-amber-500">
                  Breadth history bootstrap required
                </div>
                <div className="mt-2 text-sm text-slate-400 leading-relaxed">
                  The Binance universe is live, but the canonical 20/50/200DMA and relative-strength calculations remain unresolved until the one-time static-archive backfill seeds at least 200 daily closes per eligible asset. Missing history is intentionally excluded from the denominator.
                </div>
              </section>
            )}

            <section>
              <SectionLabel
                numeral="I"
                title="Market Expansion"
                subtitle="Aggregated market structure"
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Altcoin market cap"
                  value={fmtCap(market?.altcoin_market_cap)}
                  detail={qualifier(
                    `7D ${fmtSignedPct(market?.change_7d_pct)}`,
                    `30D ${fmtSignedPct(market?.change_30d_pct)}`,
                  )}
                  source={`${market?.provenance.source_type ?? "—"} · ${market?.provenance.source ?? "—"}`}
                />
                <StatCard
                  label="BTC dominance"
                  value={fmtPct(market?.btc_dominance)}
                  detail={qualifier(
                    market?.btc_dominance_change_7d_pp == null ? "7D history accumulating" : `7D ${fmtSignedPp(market.btc_dominance_change_7d_pp)}`,
                    market?.btc_dominance_change_30d_pp == null ? null : `30D ${fmtSignedPp(market.btc_dominance_change_30d_pp)}`,
                  )}
                  source={market?.provenance.source}
                />
                <StatCard
                  label="CMC20"
                  value={benchmarks?.cmc20?.value == null ? "—" : benchmarks.cmc20.value.toFixed(2)}
                  detail={benchmarks?.cmc20 ? qualifier(
                    `24H ${fmtSignedPct(benchmarks.cmc20.change_24h_pct)}`,
                    `7D ${fmtSignedPct(benchmarks.cmc20.change_7d_pct)}`,
                    `30D ${fmtSignedPct(benchmarks.cmc20.change_30d_pct)}`,
                  ) : "Comparator unavailable"}
                  source={benchmarks?.cmc20?.source}
                />
                <StatCard
                  label="CMC100"
                  value={benchmarks?.cmc100?.value == null ? "—" : benchmarks.cmc100.value.toFixed(2)}
                  detail={benchmarks?.cmc100 ? qualifier(
                    `24H ${fmtSignedPct(benchmarks.cmc100.change_24h_pct)}`,
                    `7D ${fmtSignedPct(benchmarks.cmc100.change_7d_pct)}`,
                    `30D ${fmtSignedPct(benchmarks.cmc100.change_30d_pct)}`,
                  ) : "Comparator unavailable"}
                  source={benchmarks?.cmc100?.source}
                />
              </div>
            </section>

            <section>
              <SectionLabel
                numeral="II"
                title="Breadth"
                subtitle="Primary internally derived signal"
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Above 20DMA" value={fmtPct(breadth?.above_20dma_pct)} detail={qualifier(`7D ${fmtSignedPp(breadth?.above_20dma_change_7d_pp)}`, `30D ${fmtSignedPp(breadth?.above_20dma_change_30d_pp)}`)} source="INTERNAL_DERIVED · Binance" />
                <StatCard label="Above 50DMA" value={fmtPct(breadth?.above_50dma_pct)} detail={qualifier(`7D ${fmtSignedPp(breadth?.above_50dma_change_7d_pp)}`, `30D ${fmtSignedPp(breadth?.above_50dma_change_30d_pp)}`)} source="INTERNAL_DERIVED · Binance" />
                <StatCard label="Above 200DMA" value={fmtPct(breadth?.above_200dma_pct)} detail={qualifier(`7D ${fmtSignedPp(breadth?.above_200dma_change_7d_pp)}`, `30D ${fmtSignedPp(breadth?.above_200dma_change_30d_pp)}`, `${breadth?.eligible_200dma ?? 0} eligible`)} source="INTERNAL_DERIVED · Binance" />
                <StatCard label="Above 200DMA · ex ETH" value={fmtPct(breadth?.ex_eth_above_200dma_pct)} source="INTERNAL_DERIVED · Binance" />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Median vs 20DMA" value={fmtSignedPct(breadth?.median_distance_20dma)} />
                <StatCard label="Median vs 50DMA" value={fmtSignedPct(breadth?.median_distance_50dma)} />
                <StatCard label="Median vs 200DMA" value={fmtSignedPct(breadth?.median_distance_200dma)} />
                <StatCard label="30D highs" value={fmtPct(breadth?.highs_30d_pct)} />
                <StatCard label="90D highs" value={fmtPct(breadth?.highs_90d_pct)} />
              </div>

              {breadth?.live_above_200dma_pct != null && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="caps-sm text-faint">Live 200DMA Breadth</div>
                      <div className="mt-2 font-mono text-2xl text-slate-100">
                        {fmtPct(breadth.live_above_200dma_pct)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-600 max-w-md">
                      Current Binance bulk-ticker prices versus locally stored daily moving averages. Daily-close breadth remains canonical.
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section>
              <SectionLabel
                numeral="III"
                title="Rotation / Relative Strength"
                subtitle="Are altcoins gaining leadership against BTC?"
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="ETH / BTC" value={rotation?.eth_btc == null ? "—" : rotation.eth_btc.toFixed(5)} detail={qualifier(`7D ${fmtSignedPct(rotation?.eth_btc_change_7d_pct)}`, `30D ${fmtSignedPct(rotation?.eth_btc_change_30d_pct)}`)} />
                <StatCard label="Alts > BTC · 7D" value={fmtPct(rotation?.outperforming_btc_7d_pct)} detail={`${rotation?.eligible_relative_7d ?? 0} eligible assets`} />
                <StatCard label="Alts > BTC · 30D" value={fmtPct(rotation?.outperforming_btc_30d_pct)} detail={qualifier(
                    rotation?.median_relative_return_btc_30d == null ? undefined : `Median ${fmtSignedPct(rotation.median_relative_return_btc_30d)}`,
                    `${rotation?.eligible_relative_30d ?? 0} eligible`,
                  )} />
                <StatCard label="Alts > BTC · 90D" value={fmtPct(rotation?.outperforming_btc_90d_pct)} detail={`${rotation?.eligible_relative_90d ?? 0} eligible assets`} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <StatCard
                  label="Alts > ETH · 30D"
                  value={fmtPct(rotation?.outperforming_eth_30d_pct)}
                  detail={qualifier(
                    rotation?.median_relative_return_eth_30d == null ? undefined : `Median ${fmtSignedPct(rotation.median_relative_return_eth_30d)}`,
                    `${rotation?.eligible_relative_eth_30d ?? 0} eligible`,
                  )}
                  source="INTERNAL_DERIVED · Binance"
                />
                <StatCard
                  label="External comparator · CMC Altcoin Season"
                  value={benchmarks?.external_altseason_index?.value == null ? "—" : benchmarks.external_altseason_index.value.toFixed(0)}
                  detail={qualifier(
                    `7D ${fmtSignedPp(benchmarks?.external_altseason_index?.change_7d)}`,
                    `30D ${fmtSignedPp(benchmarks?.external_altseason_index?.change_30d)}`,
                  )}
                  source={benchmarks?.external_altseason_index?.source}
                />
              </div>
            </section>

            <section>
              <SectionLabel numeral="IV" title="Evidence" subtitle="Support and contradiction remain explicit" />
              <div className="grid gap-4 lg:grid-cols-2">
                <EvidenceColumn title="Supporting" items={data.diagnostics.supporting} />
                <EvidenceColumn title="Contradicting" items={data.diagnostics.contradicting} />
              </div>
            </section>

            <section>
              <SectionLabel numeral="V" title="Data & Methodology" subtitle={`Model v${data.diagnostics.methodology.version}`} />
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <div className="caps-sm text-faint">Universe</div>
                  <div className="mt-2 font-mono text-sm text-slate-300">
                    {data.diagnostics.methodology.universe}
                  </div>
                  <div className="mt-3 text-xs text-slate-500 leading-relaxed">
                    Active Binance USDT spot assets, one observation per underlying asset where practical. BTC, stablecoins, leveraged tokens, and obvious wrapped/staked duplicates are excluded. ETH remains in the primary universe.
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-2">
                      <span>History coverage</span>
                      <span>{fmtPct(state?.coverage)}</span>
                    </div>
                    <PercentileBar value={state?.coverage ?? 0} color="#D9A84D" variant="compact" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <div className="caps-sm text-faint">Missing / Deferred</div>
                  {data.diagnostics.missing.length ? (
                    <ul className="mt-3 space-y-2 text-xs text-slate-500">
                      {data.diagnostics.missing.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-slate-700">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-3 text-xs text-slate-600">No missing V1 inputs reported.</div>
                  )}
                  <div className="mt-4 pt-4 border-t border-slate-900 text-[10px] font-mono text-slate-700">
                    Exchange deposit activity: {data.exchange_activity.status} · {data.exchange_activity.note}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
