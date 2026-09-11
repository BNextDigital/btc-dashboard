import type { DecisionSummary } from "@/app/types/asset-dashboard";

interface DecisionMarketStateBarProps {
  color: string;
  summary: DecisionSummary | null;
}

export default function DecisionMarketStateBar({
  color,
  summary,
}: DecisionMarketStateBarProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-3 flex items-center gap-4 flex-wrap">
      <span
        className="text-xs font-mono px-2.5 py-1 rounded border"
        style={{
          color,
          borderColor: `${color}60`,
          background: `${color}12`,
        }}
      >
        ◈ {summary?.structure ?? "LOADING"}
      </span>
      <div className="text-xs font-mono text-slate-500">
        <span style={{ color: "#E05252" }}>{summary?.extreme ?? 0} extreme</span>
        {" · "}
        <span style={{ color: "#D9A84D" }}>{summary?.notable ?? 0} notable</span>
        {" · "}
        <span className="text-slate-700">{summary?.neutral ?? 0} neutral</span>
      </div>
      <div className="ml-auto text-[10px] font-mono text-slate-700">
        AI organizes reality · Humans make decisions
      </div>
    </div>
  );
}
