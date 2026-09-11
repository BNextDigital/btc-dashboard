"use client";

import DashboardNav from "@/app/components/DashboardNav";
import TradingViewEmbed from "@/app/components/TradingViewEmbed";
import DecisionAnalysisSection from "@/app/components/dashboard/DecisionAnalysisSection";
import DecisionMarketStateBar from "@/app/components/dashboard/DecisionMarketStateBar";
import DecisionMetricsSection from "@/app/components/dashboard/DecisionMetricsSection";
import DecisionPriceHeader from "@/app/components/dashboard/DecisionPriceHeader";
import ManualOverridePanel from "@/app/components/dashboard/ManualOverridePanel";
import SectionLabel from "@/app/components/dashboard/SectionLabel";
import EthEcosystemPanel from "@/app/components/eth/EthEcosystemPanel";
import EthStructuralPanel from "@/app/components/eth/EthStructuralPanel";
import { useEthDashboard } from "@/app/hooks/useEthDashboard";
import { structureColor } from "@/app/lib/decision-dashboard";
import {
  ETH_CAUSAL_STEPS,
  ETH_CONTRADICTION,
  ETH_CORE_METRICS,
  ETH_ECOSYSTEM_METRICS,
  ETH_EVENTS,
  ETH_METRIC_LABELS,
  ETH_OVERRIDE_METRICS,
  ETH_OVERRIDE_PLACEHOLDER,
  ETH_SEED_SPARKS,
} from "@/app/lib/eth-dashboard-config";

export default function EthDashboard() {
  const dashboard = useEthDashboard();
  const ratio = dashboard.price?.price_btc;
  const stateColor = structureColor(
    dashboard.summary?.structure ?? "NEUTRAL",
    "#D9A84D",
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
          current="eth"
          title="ETH Decision Dashboard"
          lastUpdated={dashboard.lastUpdated}
        />

        <DecisionPriceHeader
          price={dashboard.price}
          secondary={
            ratio
              ? { label: "ETH/BTC", value: ratio.toFixed(5) }
              : null
          }
        />

        {dashboard.error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400 font-mono">
            {dashboard.error} — ensure /eth/metrics is reachable and
            eth_routes.py is mounted.
          </div>
        )}
        {dashboard.loading && !dashboard.metrics && (
          <div className="text-center py-20 text-slate-600 font-mono text-sm animate-pulse">
            Fetching ETH data…
          </div>
        )}

        <DecisionMarketStateBar
          color={stateColor}
          summary={dashboard.summary}
        />

        <TradingViewEmbed
          symbol="BINANCE:ETHUSDT"
          label="ETH price structure"
          subtitle="BINANCE · ETHUSDT · 1D"
        />

        <DecisionMetricsSection
          keys={ETH_CORE_METRICS}
          labels={ETH_METRIC_LABELS}
          metrics={dashboard.metrics}
          numeral="I"
          seeds={ETH_SEED_SPARKS}
          subtitle="Price · Volume · Funding · OI · CME Basis"
          title="Market state snapshot — core"
        />

        <DecisionMetricsSection
          keys={ETH_ECOSYSTEM_METRICS}
          labels={ETH_METRIC_LABELS}
          metrics={dashboard.metrics}
          numeral="II"
          seeds={ETH_SEED_SPARKS}
          subtitle="DeFi TVL · L2 TVL · Staking · ETH/BTC Ratio · Gas"
          title="Ethereum ecosystem metrics"
        />

        <section>
          <SectionLabel
            numeral="III"
            title="ETH structural thesis"
            variant="compact"
          />
          <EthStructuralPanel structural={dashboard.structural} />
        </section>

        <section>
          <SectionLabel
            numeral="IV"
            title="Ecosystem deep-dive"
            subtitle="DeFiLlama mainnet protocols · Network context"
            variant="compact"
          />
          <EthEcosystemPanel tvlData={dashboard.tvl} />
        </section>

        <DecisionAnalysisSection
          causalSteps={ETH_CAUSAL_STEPS}
          contradiction={ETH_CONTRADICTION}
          events={ETH_EVENTS}
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
              endpoint="/eth/manual-override"
              keys={ETH_OVERRIDE_METRICS}
              labels={ETH_METRIC_LABELS}
              placeholder={ETH_OVERRIDE_PLACEHOLDER}
            />
          </div>
        </section>

        <footer className="pt-4 border-t border-slate-900 text-[10px] text-slate-700 font-mono flex items-center gap-4 flex-wrap">
          <span>
            Data: CoinGecko · DeFiLlama · yFinance (ETH=F) · beaconcha.in ·
            Cloudflare RPC
          </span>
          <span>·</span>
          <span>AI organizes reality. Humans make decisions.</span>
        </footer>
      </div>
    </main>
  );
}
