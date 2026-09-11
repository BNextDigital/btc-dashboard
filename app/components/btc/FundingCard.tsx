import { Circle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import MetricTooltip from "@/app/components/dashboard/MetricTooltip";
import PercentileBar from "@/app/components/dashboard/PercentileBar";
import Sparkline from "@/app/components/dashboard/Sparkline";
import { alertClasses } from "@/app/lib/dashboard-styles";
import type { Metric } from "@/app/types/btc-dashboard";

const FundingCard = ({ metric }: { metric: Metric & {
  spread?: number;
  spread_label?: string;
  exchange_rates?: Record<string, number>;
  high_exchange?: string;
  low_exchange?: string;
}}) => {
  const a = alertClasses(metric.alertLevel);
  const DirIcon = metric.currentDir === "up" ? TrendingUp
                : metric.currentDir === "down" ? TrendingDown : Minus;

  return (
    <div className="fade-in bg-surface border hairline p-4 flex flex-col gap-3
                    hover:bg-surface-2 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="caps-sm text-faint mb-1">{metric.category}</div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-sans-body text-paper text-[14px] font-medium leading-tight">
              {metric.name}
            </h3>
            <MetricTooltip metricId={metric.id} />
          </div>
        </div>
        <span className={`caps-sm px-2 py-[3px] border ${a.border} ${a.bg} ${a.text} whitespace-nowrap`}>
          {metric.alert}
        </span>
      </div>

      {/* Hero value */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono-data text-paper text-[22px] leading-none tracking-tight">
            {metric.current}
          </span>
          <DirIcon size={12} className={metric.currentDir === "up" ? "text-neutral-sage" : metric.currentDir === "down" ? "text-alert-extreme" : "text-muted"} />
          <span className="caps-sm text-faint">per 8h</span>
        </div>
        <Sparkline data={metric.spark} dir={metric.currentDir} />
      </div>

      {/* Exchange rates breakdown */}
      {metric.exchange_rates && Object.keys(metric.exchange_rates).length > 0 && (
        <div className="hairline-t pt-3 flex flex-col gap-1.5">
          <div className="caps-sm text-faint mb-1">Exchange rates</div>
          {Object.entries(metric.exchange_rates)
            .sort(([, a], [, b]) => b - a)
            .map(([exchange, rate]) => {
              const isHigh = exchange === metric.high_exchange;
              const isLow  = exchange === metric.low_exchange;
              return (
                <div key={exchange} className="flex items-center justify-between">
                  <span className="caps-sm text-faint">{exchange}</span>
                  <span className={`font-mono-data text-[11px] ${
                    isHigh ? "text-alert-notable" :
                    isLow  ? "text-neutral-sage"  : "text-paper-2"
                  }`}>
                    {rate >= 0 ? "+" : ""}{rate.toFixed(4)}%
                  </span>
                </div>
              );
            })}
          {/* Spread bar */}
          {metric.spread !== undefined && (
            <div className="mt-1 pt-2 hairline-t">
              <div className="flex items-center justify-between mb-1">
                <span className="caps-sm text-faint">Spread</span>
                <span className={`font-mono-data text-[11px] ${
                  metric.spread > 0.005 ? "text-alert-notable" : "text-paper-2"
                }`}>
                  {metric.spread_label}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standard fields */}
      <div className="grid grid-cols-3 gap-2 hairline-t pt-3">
        <div><div className="caps-sm text-faint mb-1">7d</div><div className="font-mono-data text-paper-2 text-[12px]">{metric.d7}</div></div>
        <div><div className="caps-sm text-faint mb-1">vs 30d</div><div className="font-mono-data text-paper-2 text-[12px]">{metric.vs30d}</div></div>
        <div><div className="caps-sm text-faint mb-1">Pctl</div><div className="font-mono-data text-paper-2 text-[12px]">{metric.percentile}</div></div>
      </div>

      <div>
        <PercentileBar value={metric.percentile} />
        <div className="flex justify-between mt-1">
          <span className="caps-sm text-faint">p0</span>
          <span className="caps-sm text-faint">p100</span>
        </div>
      </div>

      <div className="flex items-center justify-between hairline-t pt-2">
        <span className="caps-sm text-faint">Pattern</span>
        <span className={`font-sans-body text-[11px] ${
          metric.pattern === "—" ? "text-faint" : "text-paper-2 italic"
        }`}>{metric.pattern}</span>
      </div>

      <div className="flex items-center gap-1 text-faint">
        <Circle size={5} fill="#8DA078" stroke="none" className="pulse-dot" />
        <span className="caps-sm">Live · Binance · OKX · Bybit</span>
      </div>
    </div>
  );
};

export default FundingCard;
