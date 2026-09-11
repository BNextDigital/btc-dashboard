import ProtocolEcosystemPanel from "@/app/components/dashboard/ProtocolEcosystemPanel";
import { formatUsd } from "@/app/lib/decision-dashboard";
import type { NetworkStat, ProtocolTvl } from "@/app/types/asset-dashboard";
import type { EthTvlResponse } from "@/app/types/eth-dashboard";

const FALLBACK_PROTOCOLS: ProtocolTvl[] = [
  { name: "Lido", tvl: 14.2e9, category: "Liquid Staking" },
  { name: "Aave", tvl: 12.1e9, category: "Lending" },
  { name: "Uniswap", tvl: 5.8e9, category: "DEX" },
  { name: "EigenLayer", tvl: 4.2e9, category: "Restaking" },
  { name: "Curve", tvl: 3.1e9, category: "DEX / Stableswap" },
  { name: "Other", tvl: 12.6e9, category: "All others" },
];

export default function EthEcosystemPanel({
  tvlData,
}: {
  tvlData: EthTvlResponse | null;
}) {
  const protocols = tvlData?.protocols?.slice(0, 6) ?? FALLBACK_PROTOCOLS;
  const mainnetTvl = tvlData?.mainnet?.tvl_usd ?? 52e9;
  const dexVolume = tvlData?.dex?.dex_volume_24h ?? null;
  const networkStats: NetworkStat[] = [
    {
      label: "Mainnet DeFi TVL",
      value: formatUsd(mainnetTvl),
      detail: "DeFiLlama Ethereum chain",
      status: true,
    },
    {
      label: "DEX volume (24h)",
      value: formatUsd(dexVolume),
      detail: "Uniswap + Curve + Balancer",
      status: true,
    },
    {
      label: "Validators",
      value: "~1.1M",
      detail: "Active beacon chain",
      status: true,
    },
    {
      label: "Staking yield (APY)",
      value: "~3.5%",
      detail: "PoS consensus reward",
      status: null,
    },
    {
      label: "ETH issuance/day",
      value: "~2,000 ETH",
      detail: "vs EIP-1559 burn",
      status: null,
    },
    {
      label: "EIP-1559 note",
      value: "Wire burn rate",
      detail: "ultrasound.money API",
      status: null,
    },
  ];

  return (
    <ProtocolEcosystemPanel
      networkStats={networkStats}
      networkTitle="Network context"
      protocols={protocols}
      protocolTitle="Mainnet DeFi — DeFiLlama"
      totalTvl={mainnetTvl}
    />
  );
}
