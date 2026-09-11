import { formatUsd } from "@/app/lib/decision-dashboard";
import type {
  NetworkStat,
  ProtocolTvl,
} from "@/app/types/asset-dashboard";

interface ProtocolEcosystemPanelProps {
  networkStats: readonly NetworkStat[];
  networkTitle: string;
  neutralValueClassName?: string;
  protocols: readonly ProtocolTvl[];
  protocolTitle: string;
  totalTvl: number | null;
}

export default function ProtocolEcosystemPanel({
  networkStats,
  networkTitle,
  neutralValueClassName = "text-slate-400",
  protocols,
  protocolTitle,
  totalTvl,
}: ProtocolEcosystemPanelProps) {
  const maxTvl = Math.max(...protocols.map((protocol) => protocol.tvl ?? 0));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            {protocolTitle}
          </div>
          <div className="font-mono text-sm text-slate-300">
            {formatUsd(totalTvl)}
          </div>
        </div>
        <div className="space-y-2.5">
          {protocols.map((protocol, index) => (
            <div key={protocol.name}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-300">
                  {protocol.name}{" "}
                  <span className="text-slate-600 text-[10px]">
                    · {protocol.category}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {formatUsd(protocol.tvl)}
                </span>
              </div>
              <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${maxTvl ? ((protocol.tvl ?? 0) / maxTvl) * 100 : 0}%`,
                    background:
                      index < 2
                        ? "#D9A84D"
                        : index < 4
                          ? "#6A9A6A"
                          : "#374151",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-1">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
          {networkTitle}
        </div>
        {networkStats.map((stat, index) => (
          <div
            key={stat.label}
            className={`flex justify-between items-center py-2 ${
              index < networkStats.length - 1 ? "border-b border-slate-900" : ""
            }`}
          >
            <div>
              <div className="text-xs text-slate-300">{stat.label}</div>
              <div className="text-[9px] text-slate-600">{stat.detail}</div>
            </div>
            <div
              className={`font-mono text-sm font-medium ${
                stat.status === true
                  ? "text-green-500"
                  : stat.status === false
                    ? "text-red-400"
                    : neutralValueClassName
              }`}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
