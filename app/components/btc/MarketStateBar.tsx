import { Activity, Clock } from "lucide-react";
import LiveClock from "@/app/components/dashboard/LiveClock";
import type { SummaryData } from "@/app/types/btc-dashboard";

interface MarketStateBarProps {
  summary: SummaryData | null;
  alertCounts: { extreme: number; notable: number };
}

export default function MarketStateBar({
  summary,
  alertCounts,
}: MarketStateBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-6 bg-surface border hairline px-5 py-4">
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-amber-sand" />
        <span className="caps-sm text-faint">Market state</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display-italic text-paper text-[18px]">
          {summary?.structure ?? "Calculating…"}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#C4614A" }}
          />
          <span className="caps-sm text-alert-extreme">
            {summary?.extreme_count ?? alertCounts.extreme} Extreme
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#C89A3F" }}
          />
          <span className="caps-sm text-alert-notable">
            {summary?.notable_count ?? alertCounts.notable} Notable
          </span>
        </div>
        <div className="flex items-center gap-2 pl-5 border-l hairline">
          <Clock size={11} className="text-faint" />
          <LiveClock />
        </div>
      </div>
    </div>
  );
}
