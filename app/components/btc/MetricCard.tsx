import { Circle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import MetricTooltip from "@/app/components/dashboard/MetricTooltip";
import PercentileBar from "@/app/components/dashboard/PercentileBar";
import Sparkline from "@/app/components/dashboard/Sparkline";
import { alertClasses } from "@/app/lib/dashboard-styles";
import type { Metric } from "@/app/types/btc-dashboard";

const MetricCard = ({ metric, index }: { metric: Metric; index: number }) => {
  const a = alertClasses(metric.alertLevel);
  const DirIcon = metric.currentDir === "up" ? TrendingUp : metric.currentDir === "down" ? TrendingDown : Minus;

  const dotColor =
    metric._is_historical       ? "#378ADD" :
    metric._is_override         ? "#D9A84D" :
    metric._is_history_fallback ? "#C89A3F" :
    "#8DA078";

  const dotLabel =
    metric._is_historical       ? `Historical · ${metric._date}` :
    metric._is_override         ? "Manual · screenshot" :
    metric._is_history_fallback ? `Backfill · ${metric.updated}` :
    metric.source               ? `${metric.source} · ${metric.updated}` :
  `Updated ${metric.updated}`;

  return (
    <div
      className="fade-in bg-surface border hairline p-4 flex flex-col gap-3 hover:bg-surface-2 transition-colors duration-300"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="caps-sm text-faint mb-1">{metric.category}</div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-sans-body text-paper text-[14px] font-medium leading-tight">{metric.name}</h3>
            <MetricTooltip metricId={metric.id} />
          </div>
        </div>
        <span className={`caps-sm px-2 py-[3px] border ${a.border} ${a.bg} ${a.text} whitespace-nowrap`}>
          {metric.alert}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono-data text-paper text-[22px] leading-none tracking-tight">{metric.current}</span>
          <DirIcon
            size={12}
            className={
              metric.currentDir === "up" ? "text-neutral-sage" :
              metric.currentDir === "down" ? "text-alert-extreme" :
              "text-muted"
            }
          />
        </div>
        <Sparkline data={metric.spark} dir={metric.currentDir} />
      </div>

      <div className="grid grid-cols-3 gap-2 hairline-t pt-3">
        <div>
          <div className="caps-sm text-faint mb-1">7d</div>
          <div className="font-mono-data text-paper-2 text-[12px]">{metric.d7}</div>
        </div>
        <div>
          <div className="caps-sm text-faint mb-1">vs 30d</div>
          <div className="font-mono-data text-paper-2 text-[12px]">{metric.vs30d}</div>
        </div>
        <div>
          <div className="caps-sm text-faint mb-1">Pctl</div>
          <div className="font-mono-data text-paper-2 text-[12px]">{metric.percentile}</div>
        </div>
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
        <span className={`font-sans-body text-[11px] ${metric.pattern === "—" ? "text-faint" : "text-paper-2 italic"}`}>
          {metric.pattern}
        </span>
      </div>

      <div className="flex items-center gap-1 text-faint">
        <Circle
          size={5}
          fill={dotColor}
          stroke="none"
          className={metric._is_historical || metric._is_history_fallback ? "" : "pulse-dot"}
        />
        <span className="caps-sm">{dotLabel}</span>
      </div>
    </div>
  );
};

export default MetricCard;
