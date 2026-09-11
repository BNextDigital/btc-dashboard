import PercentileBar from "@/app/components/dashboard/PercentileBar";
import Sparkline from "@/app/components/dashboard/Sparkline";
import { alertBadge, alertColor } from "@/app/lib/decision-dashboard";
import type { DecisionMetric } from "@/app/types/asset-dashboard";

interface DecisionMetricCardProps {
  label: string;
  metric: DecisionMetric;
  sparkline: number[];
  sparklinePadding?: number;
}

export default function DecisionMetricCard({
  label,
  metric,
  sparkline,
  sparklinePadding = 2,
}: DecisionMetricCardProps) {
  const color = alertColor(metric.level);
  const badge = alertBadge(metric.level);
  const resolvedColor = metric.level === "none" ? "#374151" : color;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest leading-tight">
          {label}
        </div>
        {metric.alert !== "—" && metric.alert !== "No data" && (
          <span
            className={`text-[10px] font-mono border px-1.5 py-0.5 rounded shrink-0 ${badge}`}
          >
            {metric.alert}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div className="font-mono text-2xl text-slate-100 leading-none">
          {metric.current}
        </div>
        <Sparkline
          data={sparkline}
          color={resolvedColor}
          height={28}
          verticalPadding={sparklinePadding}
          className="shrink-0"
          strokeWidth={1.5}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-900 pt-3">
        {[
          ["7d", metric.d7],
          ["vs 30d", metric.vs30d],
          ["Pctl", `${metric.percentile}%`],
        ].map(([labelText, value]) => (
          <div key={labelText}>
            <div className="text-[9px] font-mono text-slate-600 uppercase mb-1">
              {labelText}
            </div>
            <div className="font-mono text-[11px] text-slate-300">{value}</div>
          </div>
        ))}
      </div>

      <PercentileBar
        value={metric.percentile}
        color={resolvedColor}
        variant="compact"
      />

      <div className="flex items-start justify-between border-t border-slate-900 pt-2 gap-2">
        <span className="text-[9px] font-mono text-slate-600 uppercase shrink-0">
          Pattern
        </span>
        <span className="text-[10px] text-slate-400 italic text-right leading-tight">
          {metric.pattern}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <span
          className={`w-1.5 h-1.5 rounded-full inline-block ${
            metric._is_override
              ? "bg-amber-500"
              : metric._mock
                ? "bg-slate-700"
                : "bg-green-500"
          }`}
        />
        <span className="text-[9px] font-mono text-slate-700">
          {metric._is_override
            ? "Manual override"
            : metric._mock
              ? "Mock — connect backend"
              : "Live"}
        </span>
      </div>
    </div>
  );
}
