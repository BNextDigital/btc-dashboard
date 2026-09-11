import { formatUsd } from "@/app/lib/decision-dashboard";
import type { EthStructural } from "@/app/types/eth-dashboard";

interface EthStructuralPanelProps {
  structural: EthStructural | null;
}

const FALLBACK_L2_CHAINS = [
  { name: "Arbitrum", tvl: 8.2e9 },
  { name: "Base", tvl: 5.1e9 },
  { name: "Optimism", tvl: 3.4e9 },
  { name: "zkSync Era", tvl: 2.1e9 },
  { name: "Linea", tvl: 1.4e9 },
  { name: "Scroll", tvl: 0.9e9 },
];

const BULLISH_STRUCTURE = [
  "L2 activity drives ETH fee burn — deflationary at high usage",
  "Staking lock-up removes ~28% of supply from circulation",
  "Spot ETH ETF provides institutional on-ramp (launched May 2024)",
  "Rising ETH/BTC ratio signals capital rotation into alts",
] as const;

const WATCH_ITEMS = [
  "ETH/BTC ratio trend direction — falling ratio = BTC dominance phase",
  "Gas < 5 gwei sustained = low DeFi demand, burn rate minimal",
  "ETF flow momentum — wire manual override for weekly data",
  "L2 TVL growth rate slowing = scaling narrative weakening",
] as const;

export default function EthStructuralPanel({
  structural,
}: EthStructuralPanelProps) {
  const ratio = structural?.eth_btc_ratio;
  const stakingRate = structural?.staking_rate_pct;
  const l2Total = structural?.l2_total_tvl;
  const gas = structural?.gas_gwei;
  const l2Chains = structural?.l2_chains ?? FALLBACK_L2_CHAINS;
  const maxL2 = Math.max(...l2Chains.map((chain) => chain.tvl ?? 0));

  const ratioSignal =
    ratio == null
      ? null
      : ratio > 0.055
        ? { label: "Alt season territory", color: "#6A9A6A" }
        : ratio < 0.03
          ? { label: "BTC dominance extreme", color: "#E05252" }
          : { label: "Neutral zone", color: "#D9A84D" };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              ETH structural thesis
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 18,
              color: "#E8E6E0",
            }}
          >
            Monetary Model · L2 Flywheel · Alt Season Signal
          </div>
          <div className="text-xs text-slate-600 font-mono mt-1">
            EIP-1559 burn · PoS staking yield · Spot ETF flows · L2 scaling
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-900 pt-4">
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            ETH / BTC ratio
          </div>
          <div className="font-mono text-3xl text-slate-100">
            {ratio != null ? ratio.toFixed(5) : "—"}
          </div>
          {ratioSignal && (
            <span
              className="text-[10px] font-mono px-2 py-1 rounded border w-fit"
              style={{
                color: ratioSignal.color,
                borderColor: `${ratioSignal.color}50`,
                background: `${ratioSignal.color}12`,
              }}
            >
              {ratioSignal.label}
            </span>
          )}
          <div className="space-y-1 mt-1">
            {[
              { range: "> 0.055", label: "Alt season", color: "#6A9A6A" },
              { range: "0.030–0.055", label: "Neutral zone", color: "#D9A84D" },
              { range: "< 0.030", label: "BTC dominance", color: "#E05252" },
            ].map((item) => (
              <div key={item.range} className="flex items-center gap-2">
                <span
                  className="text-[9px] font-mono"
                  style={{ color: item.color }}
                >
                  {item.range}
                </span>
                <span className="text-[9px] text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">
              Staking rate
            </div>
            <div className="font-mono text-2xl text-slate-100">
              {stakingRate != null ? `${stakingRate.toFixed(1)}%` : "—"}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              of circulating ETH locked in validators
            </div>
          </div>
          <div className="border-t border-slate-900 pt-3">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">
              Gas price
            </div>
            <div className="font-mono text-2xl text-slate-100">
              {gas != null ? `${gas} gwei` : "—"}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {gas != null && gas > 30
                ? "High — DeFi demand elevated"
                : gas != null && gas < 5
                  ? "Very low — network idle"
                  : "Normal range"}
            </div>
          </div>
          <div className="border-t border-slate-900 pt-3">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">
              L2 total TVL
            </div>
            <div className="font-mono text-2xl text-slate-100">
              {formatUsd(l2Total)}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              Arbitrum · Base · Optimism · zkSync
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            L2 breakdown
          </div>
          {l2Chains.map((chain, index) => (
            <div key={chain.name}>
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-slate-300">{chain.name}</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {formatUsd(chain.tvl)}
                </span>
              </div>
              <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${maxL2 ? ((chain.tvl ?? 0) / maxL2) * 100 : 0}%`,
                    background:
                      index === 0
                        ? "#D9A84D"
                        : index === 1
                          ? "#6A9A6A"
                          : "#374151",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-4">
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
            Bullish structure
          </div>
          {BULLISH_STRUCTURE.map((item) => (
            <div key={item} className="flex items-start gap-2 mb-1.5">
              <span className="text-[10px] mt-0.5" style={{ color: "#6A9A6A" }}>
                ▲
              </span>
              <span className="text-xs text-slate-400">{item}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
            Watch / contradicts
          </div>
          {WATCH_ITEMS.map((item) => (
            <div key={item} className="flex items-start gap-2 mb-1.5">
              <span className="text-[10px] mt-0.5" style={{ color: "#E05252" }}>
                ▼
              </span>
              <span className="text-xs text-slate-400">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
