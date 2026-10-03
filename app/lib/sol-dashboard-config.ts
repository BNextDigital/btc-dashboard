import type { DecisionEvent } from "@/app/types/asset-dashboard";
import type { SolMetricKey } from "@/app/types/sol-dashboard";

export const SOL_CORE_METRICS = [
  "price_move",
  "volume",
  "funding",
  "open_interest",
  "cme_basis",
] as const satisfies readonly SolMetricKey[];

export const SOL_ECOSYSTEM_METRICS = [
  "defi_tvl",
  "dex_volume",
  "staking_rate",
  "stablecoin_sol",
  "dominance",
] as const satisfies readonly SolMetricKey[];

export const SOL_OVERRIDE_METRICS = [
  ...SOL_CORE_METRICS,
  ...SOL_ECOSYSTEM_METRICS,
] as const;

export const SOL_METRIC_LABELS: Record<SolMetricKey, string> = {
  price_move: "Price Move",
  volume: "Volume",
  funding: "Funding Rate",
  open_interest: "Open Interest",
  cme_basis: "CME Basis",
  defi_tvl: "DeFi TVL",
  dex_volume: "DEX Volume",
  staking_rate: "Staking Rate",
  stablecoin_sol: "Stablecoin (SOL)",
  dominance: "SOL Dominance",
};

export const SOL_SEED_SPARKS: Record<SolMetricKey, number[]> = {
  price_move: [55, 58, 62, 60, 65, 68, 70, 72, 75, 77, 80, 80],
  volume: [1.2, 1.4, 1.8, 2.1, 1.9, 2.3, 2.5, 2.2, 2.6, 2.9, 2.8, 2.8],
  funding: [15, 18, 22, 20, 25, 24, 27, 26, 28, 28, 28, 28],
  open_interest: [2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 2.8, 3, 3.1, 3.3, 3.2, 3.2],
  cme_basis: [6.2, 6.5, 6.8, 7, 7.2, 7.5, 7.8, 8, 8.2, 8.4, 8.4, 8.4],
  defi_tvl: [6.5, 6.8, 7, 7.1, 7.3, 7.5, 7.6, 7.8, 8, 8.2, 8.2, 8.2],
  dex_volume: [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.2, 1.3, 1.5, 1.4, 1.4],
  staking_rate: [66, 65.8, 65.5, 65.2, 65, 64.8, 64.5, 64.6, 64.7, 64.8, 64.8, 64.8],
  stablecoin_sol: [7.5, 7.7, 7.9, 8, 8.2, 8.4, 8.5, 8.7, 8.9, 9, 9.1, 9.1],
  dominance: [1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2, 2.1, 2.1, 2.1],
};

export const SOL_EVENTS: readonly DecisionEvent[] = [
  {
    date: "Sep 30, 2026",
    tag: "Structural",
    text: "Open USD launched on Solana, Base, Ethereum and Tempo. Open Standard reported more than 200 partners; Stripe defaults to OUSD on Tempo.",
  },
  {
    date: "Jul 1",
    tag: "Adoption",
    text: "Solana on-chain activity near yearly highs — 89.4M daily transactions, fee revenue +28% week-over-week.",
  },
  {
    date: "Jun 28",
    tag: "Protocol",
    text: "Solana onchain governance live — stake-weighted validator voting with 15% cluster support threshold now operational.",
  },
];

export const SOL_CAUSAL_STEPS = [
  "OUSD launch provides native stablecoin infrastructure on Solana",
  "Payment-network partners provide distribution potential; actual usage needs measurement",
  "Check post-launch OUSD supply and transfer activity on Solana",
  "Compare observed stablecoin liquidity and DeFi participation with the launch thesis",
  "Track network activity and DEX volume for sustained participation",
  "Use current CME basis and derivatives data to assess institutional positioning",
] as const;

export const SOL_CONTRADICTION =
  "OUSD is live, but Solana adoption is unmeasured here. Stripe defaults to Tempo; partner announcements alone do not establish Solana payment demand. Monthly reserve attestations are announced, but the latest report has not been reviewed here.";

export const SOL_OVERRIDE_PLACEHOLDER =
  '{"current":"$8.4B","d7":"+$420M","vs30d":"+18%","percentile":71,"alert":"TVL acceleration","level":"notable","pattern":"Capital returning to ecosystem"}';
