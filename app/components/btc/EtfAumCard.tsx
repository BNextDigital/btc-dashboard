import type { ReactNode } from "react";
import { Circle } from "lucide-react";
import { alertClasses } from "@/app/lib/dashboard-styles";
import type { EtfAumData } from "@/app/types/btc-dashboard";

const EtfAumCard = ({ data }: { data: EtfAumData }) => {
  const a = alertClasses(data.alert_level);
  const spark = data.spark ?? [];
  let sparkSvg: ReactNode = null;
  if (spark.length >= 2) {
    const w = 80, h = 24;
    const min = Math.min(...spark), max = Math.max(...spark);
    const range = max - min || 1;
    const pts = spark.map((v, i) => {
      const x = (i / (spark.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    sparkSvg = (
      <svg width={w} height={h} className="overflow-visible">
        <polyline fill="none" stroke="#D9A84D" strokeWidth="1.25"
          strokeLinejoin="round" strokeLinecap="round" points={pts} opacity="0.85" />
      </svg>
    );
  }
  return (
    <div className={`fade-in bg-surface border hairline p-4 flex flex-col gap-3 hover:bg-surface-2 transition-colors duration-300 ${a.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="caps-sm text-faint mb-1">Flow - Institutional</div>
          <h3 className="font-sans-body text-paper text-[14px] font-medium leading-tight">ETF Market Cap</h3>
        </div>
        {data.alert_level !== "none" && (
          <span className={`caps-sm px-2 py-[3px] border ${a.border} ${a.bg} ${a.text} whitespace-nowrap`}>
            {data.alert}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="font-mono-data text-paper text-[22px] leading-none tracking-tight">
          {data.total_aum}
        </span>
        {sparkSvg}
      </div>
      <div className="w-full">
        <div className="h-[3px] w-full bg-surface-inset relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full" style={{
            width: `${data.percentile}%`,
            backgroundColor: data.percentile >= 90 ? "#C4614A" : data.percentile >= 75 ? "#C89A3F" : "#8A8780",
            transition: "width 600ms ease-out"
          }} />
          <div className="absolute top-0 h-full w-px" style={{ left: "75%", backgroundColor: "#2F2F2F" }} />
          <div className="absolute top-0 h-full w-px" style={{ left: "90%", backgroundColor: "#2F2F2F" }} />
        </div>
      </div>
      <div className="space-y-1.5 text-xs hairline-t pt-3">
        <div className="flex justify-between">
          <span className="caps-sm text-faint">7d</span>
          <span className={`font-mono-data text-[11px] ${data.d7_chg.startsWith("+") ? "text-neutral-sage" : data.d7_chg.startsWith("-") ? "text-alert-extreme" : "text-paper-2"}`}>
            {data.d7_chg} ({data.d7_pct})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="caps-sm text-faint">30d</span>
          <span className={`font-mono-data text-[11px] ${data.d30_chg.startsWith("+") ? "text-neutral-sage" : data.d30_chg.startsWith("-") ? "text-alert-extreme" : "text-paper-2"}`}>
            {data.d30_chg} ({data.d30_pct})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="caps-sm text-faint">90d percentile</span>
          <span className="font-mono-data text-[11px] text-paper-2">{data.percentile}th</span>
        </div>
      </div>
      {data.breakdown && data.breakdown.length > 0 && (
        <div className="hairline-t pt-3 space-y-1.5">
          <div className="caps-sm text-faint mb-2">Breakdown</div>
          {data.breakdown.slice(0, 4).map(etf => (
            <div key={etf.ticker} className="flex items-center justify-between gap-2">
              <span className="font-mono-data text-faint text-[10px] w-8">{etf.ticker}</span>
              <div className="flex-1 h-[3px] bg-surface-inset rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${etf.share_pct ?? 0}%`,
                  backgroundColor: "#D9A84D",
                  opacity: 0.5,
                }} />
              </div>
              <span className="font-mono-data text-paper-2 text-[11px] w-14 text-right">{etf.aum}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5 hairline-t pt-2">
        <Circle size={7} fill="#8DA078" stroke="none" className="pulse-dot" />
        <span className="caps-sm text-faint">shares x price - {data.etf_count} ETFs - updates after US close</span>
      </div>
    </div>
  );
};

export default EtfAumCard;
