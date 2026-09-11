import { Circle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import PercentileBar from "@/app/components/dashboard/PercentileBar";
import Sparkline from "@/app/components/dashboard/Sparkline";
import { alertClasses } from "@/app/lib/dashboard-styles";
import type { DominanceData } from "@/app/types/btc-dashboard";

const DominanceCard = ({ data }: { data: DominanceData }) => {
  const a = alertClasses(data.alert_level);
  const DirIcon = data.current_dir === "up" ? TrendingUp : data.current_dir === "down" ? TrendingDown : Minus;
  return (
    <div className="bg-surface border hairline p-4 flex flex-col gap-3 hover:bg-surface-2 transition-colors duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="caps-sm text-faint mb-1">{data.category}</div>
          <h3 className="font-sans-body text-paper text-[14px] font-medium leading-tight">{data.name}</h3>
        </div>
        <span className={`caps-sm px-2 py-[3px] border ${a.border} ${a.bg} ${a.text} whitespace-nowrap`}>
          {data.alert === "—" ? "No alert" : data.alert.split("—")[0].trim()}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono-data text-paper text-[22px] leading-none tracking-tight">{data.current}</span>
          <DirIcon size={12} className={data.current_dir === "up" ? "text-neutral-sage" : data.current_dir === "down" ? "text-alert-extreme" : "text-muted"} />
        </div>
        <Sparkline data={data.spark} dir={data.current_dir} />
      </div>
      <div className="hairline-t pt-3 flex flex-col gap-2">
        <div className="flex h-[6px] w-full overflow-hidden rounded-sm gap-[2px]">
          <div className="h-full transition-all duration-700" style={{ width: `${data.btc_share}%`, backgroundColor: "#D9A84D" }} />
          <div className="h-full transition-all duration-700" style={{ width: `${data.alt_share}%`, backgroundColor: "#55534B" }} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5"><div className="w-[7px] h-[7px] rounded-sm flex-shrink-0" style={{ backgroundColor: "#D9A84D" }} /><span className="caps-sm text-faint">BTC · {data.btc_share}%</span></div>
            <div className="font-mono-data text-paper text-[13px]">{data.btc_cap}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5"><div className="w-[7px] h-[7px] rounded-sm flex-shrink-0" style={{ backgroundColor: "#55534B" }} /><span className="caps-sm text-faint">Alts · {data.alt_share}%</span></div>
            <div className="font-mono-data text-paper text-[13px]">{data.alt_cap}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="caps-sm text-faint">Total crypto market cap</span>
          <span className="font-mono-data text-paper-2 text-[12px]">{data.total_cap}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 hairline-t pt-3">
        <div><div className="caps-sm text-faint mb-1">7d</div><div className="font-mono-data text-paper-2 text-[12px]">{data.d7}</div></div>
        <div><div className="caps-sm text-faint mb-1">vs 30d</div><div className="font-mono-data text-paper-2 text-[12px]">{data.vs30d}</div></div>
        <div><div className="caps-sm text-faint mb-1">Pctl</div><div className="font-mono-data text-paper-2 text-[12px]">{data.percentile}</div></div>
      </div>
      <div><PercentileBar value={data.percentile} /><div className="flex justify-between mt-1"><span className="caps-sm text-faint">p0</span><span className="caps-sm text-faint">p100</span></div></div>
      <div className="flex items-center justify-between hairline-t pt-2">
        <span className="caps-sm text-faint">Pattern</span>
        <span className="font-sans-body text-paper-2 text-[11px] italic text-right">{data.pattern}</span>
      </div>
      <div className="flex items-center gap-1 text-faint">
        <Circle size={5} fill={data._is_override ? "#D9A84D" : "#8DA078"} stroke="none" className="pulse-dot" />
        <span className="caps-sm">{data._is_override ? "Manual · screenshot" : "Live · CoinGecko · /global"}</span>
      </div>
    </div>
  );
};

export default DominanceCard;
