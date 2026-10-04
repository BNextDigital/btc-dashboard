import type { ReactNode } from "react";
import { Circle } from "lucide-react";
import { alertClasses } from "@/app/lib/dashboard-styles";
import type { EtfAumData } from "@/app/types/btc-dashboard";

const EtfAumCard = ({ data }: { data: EtfAumData }) => {
  const verified = data.methodology_version === 2;
  const status = verified ? data.data_quality?.status ?? "unavailable" : "unverified";
  const fresh = status === "ok";
  const a = alertClasses(fresh ? data.alert_level : "none");
  const percentile = fresh ? data.percentile : null;
  const spark = verified ? (data.spark ?? []).filter(Number.isFinite) : [];
  const d7 = fresh ? data.d7_chg : "—";
  const d30 = fresh ? data.d30_chg : "—";
  const breakdown = verified ? data.breakdown : [];
  const qualityLabel = status === "stale" ? "Last known value · source unavailable or stale"
    : status === "unavailable" ? "Complete dated basket unavailable"
    : status === "unverified" ? "Awaiting dated market cap data"
    : "Dated market cap estimate";
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
          <div className="caps-sm text-faint mb-1">BTC ETFs · Eight-fund basket</div>
          <h3 className="font-sans-body text-paper text-[14px] font-medium leading-tight">ETF Market Cap</h3>
        </div>
        {fresh && data.alert_level !== "none" && (
          <span className={`caps-sm px-2 py-[3px] border ${a.border} ${a.bg} ${a.text} whitespace-nowrap`}>
            {data.alert}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="font-mono-data text-paper text-[22px] leading-none tracking-tight">
          {verified ? data.total_aum : "—"}
        </span>
        {sparkSvg}
      </div>
      {percentile !== null && <div className="w-full">
        <div className="h-[3px] w-full bg-surface-inset relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full" style={{
            width: `${percentile}%`,
            backgroundColor: percentile >= 90 ? "#C4614A" : percentile >= 75 ? "#C89A3F" : "#8A8780",
            transition: "width 600ms ease-out"
          }} />
          <div className="absolute top-0 h-full w-px" style={{ left: "75%", backgroundColor: "#2F2F2F" }} />
          <div className="absolute top-0 h-full w-px" style={{ left: "90%", backgroundColor: "#2F2F2F" }} />
        </div>
      </div>}
      <div className="space-y-1.5 text-xs hairline-t pt-3">
        <div className="flex justify-between">
          <span className="caps-sm text-faint">7d</span>
          <span className={`font-mono-data text-[11px] ${d7.startsWith("+") ? "text-neutral-sage" : d7.startsWith("-") ? "text-alert-extreme" : "text-paper-2"}`}>
            {d7}{fresh && data.d7_pct !== "—" ? ` (${data.d7_pct})` : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="caps-sm text-faint">30d</span>
          <span className={`font-mono-data text-[11px] ${d30.startsWith("+") ? "text-neutral-sage" : d30.startsWith("-") ? "text-alert-extreme" : "text-paper-2"}`}>
            {d30}{fresh && data.d30_pct !== "—" ? ` (${data.d30_pct})` : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="caps-sm text-faint">90d percentile</span>
          <span className="font-mono-data text-[11px] text-paper-2">{percentile !== null ? `${percentile}th` : "—"}</span>
        </div>
      </div>
      {breakdown && breakdown.length > 0 && (
        <div className="hairline-t pt-3 space-y-1.5">
          <div className="caps-sm text-faint mb-2">Breakdown</div>
          {breakdown.slice(0, 4).map(etf => (
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
      <div className="hairline-t pt-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Circle size={7} fill={fresh ? "#8DA078" : status === "stale" ? "#C89A3F" : "#8A8780"} stroke="none" />
          <span className="caps-sm text-faint">{qualityLabel}</span>
        </div>
        {verified && data.as_of && <p className="text-[10px] text-faint">As of {data.as_of} · {data.etf_count}/{data.expected_etf_count ?? 8} ETFs</p>}
        {verified && fresh && percentile === null && <p className="text-[10px] text-faint">Building dated history · comparisons appear when available</p>}
        <p className="text-[10px] text-faint">Excludes GBTC/BTC and other funds. Changes include price moves; not net flows.</p>
        {verified && <p className="text-[10px] text-faint">Shares × close estimate · share observations may lag by up to 7 days.</p>}
      </div>
    </div>
  );
};

export default EtfAumCard;
