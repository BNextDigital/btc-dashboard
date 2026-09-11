"use client";

import DashboardNav from "@/app/components/DashboardNav";
import TradingViewEmbed from "@/app/components/TradingViewEmbed";
import DecisionAnalysisSection from "@/app/components/dashboard/DecisionAnalysisSection";
import DecisionMarketStateBar from "@/app/components/dashboard/DecisionMarketStateBar";
import DecisionMetricsSection from "@/app/components/dashboard/DecisionMetricsSection";
import DecisionPriceHeader from "@/app/components/dashboard/DecisionPriceHeader";
import ManualOverridePanel from "@/app/components/dashboard/ManualOverridePanel";
import SectionLabel from "@/app/components/dashboard/SectionLabel";
import SolDashboardEcosystemPanel from "@/app/components/sol/SolEcosystemPanel";
import SolOusdTracker from "@/app/components/sol/SolOusdTracker";
import { useSolDashboard } from "@/app/hooks/useSolDashboard";
import { structureColor } from "@/app/lib/decision-dashboard";
import {
  SOL_CAUSAL_STEPS,
  SOL_CONTRADICTION,
  SOL_CORE_METRICS,
  SOL_ECOSYSTEM_METRICS,
  SOL_EVENTS,
  SOL_METRIC_LABELS,
  SOL_OVERRIDE_METRICS,
  SOL_OVERRIDE_PLACEHOLDER,
  SOL_SEED_SPARKS,
} from "@/app/lib/sol-dashboard-config";

export default function SolDashboard() {
  const dashboard = useSolDashboard();
  const stateColor = structureColor(
    dashboard.summary?.structure ?? "NEUTRAL",
  );

  return (
    <main
      className="min-h-screen p-6"
      style={{
        background: "#0B0B0C",
        color: "#E8E6E0",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardNav
          current="sol"
          title="SOL Decision Dashboard"
          lastUpdated={dashboard.lastUpdated}
        />

        <DecisionPriceHeader price={dashboard.price} />

        {dashboard.error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {dashboard.error} — ensure /sol/metrics is reachable and
            sol_routes.py is mounted.
          </div>
        )}
        {dashboard.loading && !dashboard.metrics && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Fetching SOL data…
          </div>
        )}

        <DecisionMarketStateBar
          color={stateColor}
          summary={dashboard.summary}
        />

        <TradingViewEmbed
          symbol="BINANCE:SOLUSDT"
          label="SOL price structure"
          subtitle="BINANCE · SOLUSDT · 1D"
        />

        <DecisionMetricsSection
          keys={SOL_CORE_METRICS}
          labels={SOL_METRIC_LABELS}
          metrics={dashboard.metrics}
          numeral="I"
          seeds={SOL_SEED_SPARKS}
          sparklinePadding={1}
          subtitle="Price · Volume · Funding · OI · CME Basis"
          title="Market state snapshot — core"
        />

        <DecisionMetricsSection
          keys={SOL_ECOSYSTEM_METRICS}
          labels={SOL_METRIC_LABELS}
          metrics={dashboard.metrics}
          numeral="II"
          seeds={SOL_SEED_SPARKS}
          sparklinePadding={1}
          subtitle="DeFi TVL · DEX Volume · Staking · Stablecoin · Dominance"
          title="Solana ecosystem metrics"
        />

        <section>
          <SectionLabel
            numeral="III"
            title="Investment thesis — OUSD catalyst"
            variant="compact"
          />
          <SolOusdTracker ousd={dashboard.ousd} />
        </section>

        <section>
          <SectionLabel
            numeral="IV"
            title="Ecosystem deep-dive"
            subtitle="DeFiLlama protocol breakdown · Solana network activity"
            variant="compact"
          />
          <SolDashboardEcosystemPanel tvlData={dashboard.tvl} />
        </section>

        <DecisionAnalysisSection
          causalSteps={SOL_CAUSAL_STEPS}
          contradiction={SOL_CONTRADICTION}
          events={SOL_EVENTS}
        />

        <section>
          <SectionLabel
            numeral="VIII"
            title="Screenshot override"
            subtitle="Same pattern as BTC — paste JSON from Claude extraction"
            variant="compact"
          />
          <div className="max-w-xl">
            <ManualOverridePanel
              endpoint="/sol/manual-override"
              keys={SOL_OVERRIDE_METRICS}
              labels={SOL_METRIC_LABELS}
              placeholder={SOL_OVERRIDE_PLACEHOLDER}
              rows={4}
              successMessage="Override applied — refresh to see it"
            />
          </div>
        </section>

        <footer className="pt-4 border-t border-slate-900 text-[10px] text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>
            Data: CoinGecko · DeFiLlama · yFinance (SOL=F) · Solana RPC
          </span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>
      </div>
    </main>
  );
}
