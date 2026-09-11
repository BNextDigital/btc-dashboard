"use client";

import TradingViewEmbed from "@/app/components/TradingViewEmbed";
import PerpsPressureCard from "@/app/components/PerpsPressureCard";
import SpotDepthCard from "@/app/components/SpotDepthCard";
import SectionLabel from "@/app/components/dashboard/SectionLabel";
import BtcHeader from "@/app/components/btc/BtcHeader";
import DecisionSection from "@/app/components/btc/DecisionSection";
import DominanceSection from "@/app/components/btc/DominanceSection";
import ManualOverridePanel from "@/app/components/btc/ManualOverridePanel";
import MarketStateBar from "@/app/components/btc/MarketStateBar";
import MetricsSection from "@/app/components/btc/MetricsSection";
import PremiumCard from "@/app/components/btc/PremiumCard";
import ProxyStocksSection from "@/app/components/btc/ProxyStocksSection";
import StablecoinSection from "@/app/components/btc/StablecoinSection";
import TradeExecutionPanel from "@/app/components/btc/TradeExecutionPanel";
import TradeLogReview from "@/app/components/btc/TradeLogReview";
import { useBtcDashboard } from "@/app/hooks/useBtcDashboard";
import { getApiBaseUrl } from "@/app/lib/dashboard-api";

export default function BtcDashboard() {
  const dashboard = useBtcDashboard();
  const stablecoin = dashboard.selectedDate
    ? dashboard.historicalStablecoin
    : dashboard.stablecoinData;
  const dominance = dashboard.selectedDate
    ? dashboard.historicalDominance
    : dashboard.dominanceData;

  return (
    <div className="min-h-screen bg-ink text-paper font-sans-body grid-bg">
      <BtcHeader
        price={dashboard.price.price}
        change24h={dashboard.price.change_24h}
        onRefresh={dashboard.refreshNow}
        refreshing={dashboard.refreshing}
      />

      <main className="max-w-[1440px] mx-auto px-8 py-8 space-y-10">
        <MarketStateBar
          summary={dashboard.summary}
          alertCounts={dashboard.alertCounts}
        />

        <section>
          <TradingViewEmbed />
        </section>

        {!dashboard.selectedDate && dashboard.perpsPressure && (
          <section>
            <SectionLabel
              numeral="0"
              title="Perps Pressure"
              subtitle="Carry · crowding · forced flow · squeeze vulnerability"
            />
            <PerpsPressureCard data={dashboard.perpsPressure} />
          </section>
        )}

        <section>
          <SectionLabel
            numeral="0A"
            title="Spot Depth for Liquidity Cascade Risk"
            subtitle="If leverage gets forced, can spot absorb it?"
          />
          {dashboard.spotDepth && <SpotDepthCard data={dashboard.spotDepth} />}
        </section>

        <MetricsSection
          apiBaseUrl={getApiBaseUrl()}
          error={dashboard.error}
          etfAum={dashboard.etfAum}
          fromCache={dashboard.fromCache}
          historicalError={dashboard.historicalError}
          historicalLoading={dashboard.historicalLoading}
          historicalMetrics={dashboard.historicalMetrics}
          loading={dashboard.loading}
          metrics={dashboard.metrics}
          selectedDate={dashboard.selectedDate}
          setSelectedDate={dashboard.setSelectedDate}
        />

        <StablecoinSection
          data={stablecoin}
          selectedDate={dashboard.selectedDate}
        />

        <DominanceSection
          data={dominance}
          selectedDate={dashboard.selectedDate}
        />

        <section>
          <SectionLabel numeral="XII" title="North American BTC Premium" />
          <PremiumCard data={dashboard.premiumData} />
        </section>

        <ProxyStocksSection stocks={dashboard.proxyStocks} />

        <DecisionSection
          causal={dashboard.causal}
          judgment={dashboard.judgment}
          news={dashboard.news}
          setJudgment={dashboard.setJudgment}
        />

        <section>
          <SectionLabel
            numeral="V"
            title="Screenshot override"
            subtitle="Paste Claude extraction · Exchange Netflow · LTH Supply"
          />
          <ManualOverridePanel />
        </section>

        <section>
          <SectionLabel
            numeral="VI"
            title="Trade execution"
            subtitle="Quantitative log · slippage · volume benchmarks · SEM feed"
          />
          <TradeExecutionPanel
            executions={dashboard.executions}
            onAdd={() => {
              void dashboard.refreshUserData();
            }}
          />
        </section>

        <section>
          <SectionLabel
            numeral="VII"
            title="Trade Log, Review & notes"
            subtitle="Trade log · post-trade SEM review"
          />
          <TradeLogReview
            logs={dashboard.logs}
            onAdd={() => {
              void dashboard.refreshUserData();
            }}
          />
        </section>

        <footer className="pt-8 hairline-t flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-muted">
          <div className="caps-sm text-faint">
            Build · 0 → 1 · mock data · wire APIs in step 7
          </div>
          <div className="caps-sm text-faint">
            AI organizes reality. Humans make decisions. SEM improves how humans
            decide.
          </div>
        </footer>
      </main>
    </div>
  );
}
