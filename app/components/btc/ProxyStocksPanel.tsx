import Sparkline from "@/app/components/dashboard/Sparkline";
import type { ProxyStock } from "@/app/types/btc-dashboard";

const corrColor = (c: number) => { const a = Math.abs(c); if (a >= 0.80) return "#8DA078"; if (a >= 0.65) return "#D9A84D"; if (a >= 0.45) return "#B8B5AA"; return "#55534B"; };
const regimeBadge = (regime: string) => {
  switch (regime) {
    case "Lockstep": return "border-[rgba(141,160,120,0.35)] bg-[rgba(141,160,120,0.10)] text-[#8DA078]";
    case "Strong": return "border-[rgba(217,168,77,0.35)] bg-[rgba(217,168,77,0.10)] text-[#D9A84D]";
    case "Moderate": return "border-[#22231F] bg-[#17171A] text-[#B8B5AA]";
    case "Weak": return "border-[#22231F] bg-[#17171A] text-[#55534B]";
    case "Decorrelated": return "border-[rgba(196,97,74,0.35)] bg-[rgba(196,97,74,0.10)] text-[#C4614A]";
    default: return "border-[#22231F] bg-[#17171A] text-[#55534B]";
  }
};

const CorrBar = ({ label, value }: { label: string; value: number }) => {
  const pct = Math.round(Math.abs(value) * 100);
  const color = corrColor(value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="caps-sm text-faint">{label}</span>
        <span className="font-mono-data text-[11px]" style={{ color }}>{value >= 0 ? "+" : ""}{value.toFixed(2)}</span>
      </div>
      <div className="h-[3px] w-full bg-surface-inset relative overflow-hidden rounded-sm">
        <div className="absolute top-0 left-0 h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

const ProxyStockCard = ({ stock }: { stock: ProxyStock }) => {
  const dir1d = stock.change_1d_raw >= 0 ? "up" : "down";
  const dir7d = stock.change_7d_raw >= 0 ? "up" : "down";
  return (
    <div className="bg-surface border hairline p-4 flex flex-col gap-3 hover:bg-surface-2 transition-colors duration-300">
      <div className="flex items-start justify-between gap-2">
        <div><div className="font-mono-data text-amber-sand text-[16px] font-medium leading-none">{stock.ticker}</div><div className="caps-sm text-faint mt-1">{stock.name}</div></div>
        <span className={`caps-sm px-2 py-[3px] border whitespace-nowrap ${regimeBadge(stock.regime)}`}>{stock.regime}</span>
      </div>
      <div>
        <div className="font-mono-data text-paper text-[20px] leading-none tracking-tight">{stock.price}</div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`font-mono-data text-[11px] ${dir1d === "up" ? "text-neutral-sage" : "text-alert-extreme"}`}>{stock.change_1d} 1d</span>
          <span className={`font-mono-data text-[11px] ${dir7d === "up" ? "text-neutral-sage" : "text-alert-extreme"}`}>{stock.change_7d} 7d</span>
        </div>
      </div>
      <Sparkline data={stock.spark} dir={stock.change_7d_raw >= 0 ? "up" : "down"} />
      <div className="hairline-t pt-3 flex flex-col gap-2">
        <CorrBar label="7d" value={stock.corr_7d} />
        <CorrBar label="30d" value={stock.corr_30d} />
        <CorrBar label="90d" value={stock.corr_90d} />
      </div>
      <div className="hairline-t pt-2 flex items-center justify-between">
        <span className="caps-sm text-faint">vs BTC</span>
        <span className="font-sans-body text-paper-2 text-[11px] italic">{stock.lead_lag_label}</span>
      </div>
    </div>
  );
};

const CorrelationMatrix = ({ stocks }: { stocks: ProxyStock[] }) => {
  const sorted = stocks;
  return (
    <div className="bg-surface border hairline">
      <div className="grid grid-cols-12 caps-sm text-faint px-5 py-2.5 hairline-b bg-surface-inset">
        <div className="col-span-3">Stock</div><div className="col-span-2 text-center">7d corr</div><div className="col-span-2 text-center">30d corr</div><div className="col-span-2 text-center">90d corr</div><div className="col-span-2 text-center">vs BTC</div><div className="col-span-1 text-center">Regime</div>
      </div>
      {sorted.map((s, i) => (
        <div key={s.ticker} className={`grid grid-cols-12 px-5 py-3 items-center text-[12px] ${i < sorted.length - 1 ? "hairline-b" : ""} hover:bg-surface-2 transition-colors`}>
          <div className="col-span-3"><span className="font-mono-data text-amber-sand text-[13px]">{s.ticker}</span><span className="font-sans-body text-faint text-[10px] ml-2">{s.name}</span></div>
          <div className="col-span-2 text-center font-mono-data" style={{ color: corrColor(s.corr_7d) }}>{s.corr_7d >= 0 ? "+" : ""}{s.corr_7d.toFixed(2)}</div>
          <div className="col-span-2 text-center font-mono-data" style={{ color: corrColor(s.corr_30d) }}>{s.corr_30d >= 0 ? "+" : ""}{s.corr_30d.toFixed(2)}</div>
          <div className="col-span-2 text-center font-mono-data" style={{ color: corrColor(s.corr_90d) }}>{s.corr_90d >= 0 ? "+" : ""}{s.corr_90d.toFixed(2)}</div>
          <div className="col-span-2 text-center font-sans-body text-paper-2 italic text-[11px]">{s.lead_lag_label}</div>
          <div className="col-span-1 text-center"><span className={`caps-sm px-1.5 py-[2px] border ${regimeBadge(s.regime)}`}>{s.regime[0]}</span></div>
        </div>
      ))}
      <div className="px-5 py-3 hairline-t bg-surface-inset flex items-center justify-between">
        <div className="caps-sm text-faint">Sorted by 30d correlation · cross-correlation window ±5 trading days</div>
        <div className="flex items-center gap-4">
          {[{ label: "Lockstep", color: "#8DA078" }, { label: "Strong", color: "#D9A84D" }, { label: "Moderate", color: "#B8B5AA" }, { label: "Decorrelated", color: "#C4614A" }].map(r => (
            <div key={r.label} className="flex items-center gap-1.5"><div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: r.color }} /><span className="caps-sm text-faint">{r.label}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { CorrelationMatrix, ProxyStockCard };
