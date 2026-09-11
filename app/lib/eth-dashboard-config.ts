import type { DecisionEvent } from "@/app/types/asset-dashboard";
import type { EthMetricKey } from "@/app/types/eth-dashboard";

export const ETH_CORE_METRICS = [
  "price_move",
  "volume",
  "funding",
  "open_interest",
  "cme_basis",
] as const satisfies readonly EthMetricKey[];

export const ETH_ECOSYSTEM_METRICS = [
  "defi_tvl",
  "l2_tvl",
  "staking_rate",
  "eth_btc_ratio",
  "gas_price",
] as const satisfies readonly EthMetricKey[];

export const ETH_OVERRIDE_METRICS = [
  ...ETH_CORE_METRICS,
  ...ETH_ECOSYSTEM_METRICS,
] as const;

export const ETH_METRIC_LABELS: Record<EthMetricKey, string> = {
  price_move: "Price Move",
  volume: "Volume",
  funding: "Funding Rate",
  open_interest: "Open Interest",
  cme_basis: "CME Basis",
  defi_tvl: "DeFi TVL (Mainnet)",
  l2_tvl: "L2 TVL",
  staking_rate: "Staking Rate",
  eth_btc_ratio: "ETH / BTC Ratio",
  gas_price: "Gas Price",
};

export const ETH_SEED_SPARKS: Record<EthMetricKey, number[]> = {
  price_move: [2100, 2200, 2350, 2280, 2400, 2380, 2450, 2420, 2480, 2500, 2470, 2480],
  volume: [6.2, 7.1, 8.4, 9.2, 7.8, 8.9, 9.5, 8.2, 9.8, 10.1, 9.4, 9.2],
  funding: [12, 15, 18, 16, 22, 20, 24, 22, 25, 25, 25, 25],
  open_interest: [6.8, 7.2, 7.6, 8.1, 8.4, 8.8, 9.1, 9.4, 9.6, 9.8, 9.7, 9.8],
  cme_basis: [4.2, 4.8, 5.1, 5.6, 5.8, 6, 6.2, 6.4, 6.5, 6.5, 6.5, 6.5],
  defi_tvl: [44, 46, 47, 48, 49, 50, 51, 51, 52, 52, 52, 52],
  l2_tvl: [16, 17, 18, 18, 19, 20, 21, 21, 22, 22, 22, 22],
  staking_rate: [27.2, 27.4, 27.6, 27.7, 27.8, 27.9, 28, 28, 28.1, 28.1, 28.1, 28.1],
  eth_btc_ratio: [0.036, 0.037, 0.038, 0.037, 0.038, 0.039, 0.04, 0.039, 0.04, 0.041, 0.04, 0.04],
  gas_price: [18, 22, 15, 25, 30, 20, 18, 22, 25, 20, 18, 18],
};

export const ETH_EVENTS: readonly DecisionEvent[] = [
  {
    date: "Jul 3",
    tag: "Structural",
    text: "OpenUSD (OUSD) announced native on Solana — but ETH Base chain also in partner list. Stripe + Visa participation relevant to ETH stablecoin flows.",
  },
  {
    date: "Jun 28",
    tag: "L2",
    text: "Base (Coinbase L2) surpasses Optimism in daily active users — ETH L2 ecosystem consolidating around 2-3 dominant chains.",
  },
  {
    date: "Jun 20",
    tag: "Protocol",
    text: "Ethereum Pectra upgrade live — EIP-7702 enables smart account functionality for EOAs, lowering friction for institutional DeFi.",
  },
];

export const ETH_CAUSAL_STEPS = [
  "L2 ecosystem growing — Arbitrum + Base absorbing ETH activity",
  "L2 fees burn ETH on mainnet — deflationary at scale",
  "Staking lock-up reduces circulating supply pressure",
  "ETH ETF provides institutional demand channel (May 2024+)",
  "ETH/BTC ratio trend determines alt season positioning",
  "Pectra upgrade reduces institutional DeFi friction",
] as const;

export const ETH_CONTRADICTION =
  "ETH underperformed BTC in 2024–2025. ETH/BTC ratio recovery is not confirmed — falling ratio invalidates the alt season thesis.";

export const ETH_OVERRIDE_PLACEHOLDER =
  '{"current":"$52.1B","d7":"+$1.2B","vs30d":"+8%","percentile":68,"alert":"—","level":"none","pattern":"Capital steady in Ethereum mainnet DeFi"}';
