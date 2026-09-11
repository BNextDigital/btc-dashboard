import ProtocolEcosystemPanel from "@/app/components/dashboard/ProtocolEcosystemPanel";
import type { NetworkStat, ProtocolTvl } from "@/app/types/asset-dashboard";
import type { SolTvlResponse } from "@/app/types/sol-dashboard";

const FALLBACK_PROTOCOLS: ProtocolTvl[] = [
  { name: "Jupiter", tvl: 2.4e9, category: "DEX Aggregator" },
  { name: "Raydium", tvl: 1.8e9, category: "AMM / DEX" },
  { name: "Marinade", tvl: 1.2e9, category: "Liquid Staking" },
  { name: "Jito", tvl: 0.9e9, category: "Liquid Staking" },
  { name: "Velocity", tvl: 0.6e9, category: "Perps" },
  { name: "Other", tvl: 1.3e9, category: "All others" },
];

const NETWORK_STATS: readonly NetworkStat[] = [
  {
    label: "Daily transactions",
    value: "89.4M",
    detail: "+12% vs 7d avg",
    status: true,
  },
  {
    label: "Avg TPS (7d)",
    value: "4,218",
    detail: "Near yearly high",
    status: true,
  },
  {
    label: "Staking APY",
    value: "6.8%",
    detail: "vs SOL price return",
    status: null,
  },
  {
    label: "Active validators",
    value: "1,463",
    detail: "Decentralization OK",
    status: true,
  },
  {
    label: "Fee revenue (7d)",
    value: "$8.2M",
    detail: "+28% week-over-week",
    status: true,
  },
  {
    label: "Failed tx rate",
    value: "0.4%",
    detail: "Network normal",
    status: true,
  },
];

export default function SolEcosystemPanel({
  tvlData,
}: {
  tvlData: SolTvlResponse | null;
}) {
  return (
    <ProtocolEcosystemPanel
      networkStats={NETWORK_STATS}
      networkTitle="Network activity"
      neutralValueClassName="text-slate-300"
      protocols={tvlData?.protocols?.slice(0, 6) ?? FALLBACK_PROTOCOLS}
      protocolTitle="DeFi TVL — DeFiLlama"
      totalTvl={tvlData?.chain_tvl?.tvl_usd ?? 8.2e9}
    />
  );
}
