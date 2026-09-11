import JudgmentPanel from "@/app/components/dashboard/JudgmentPanel";
import SectionLabel from "@/app/components/dashboard/SectionLabel";
import type { DecisionEvent } from "@/app/types/asset-dashboard";

interface DecisionAnalysisSectionProps {
  causalSteps: readonly string[];
  contradiction: string;
  events: readonly DecisionEvent[];
}

export default function DecisionAnalysisSection({
  causalSteps,
  contradiction,
  events,
}: DecisionAnalysisSectionProps) {
  return (
    <section>
      <SectionLabel
        numeral="V–VII"
        title="Events · causal analysis · judgment"
        subtitle="Read left to right. Decide on the right."
        variant="compact"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            Top events
          </div>
          {events.map((event, index) => (
            <div
              key={`${event.date}-${event.tag}`}
              className={`pb-4 ${index < events.length - 1 ? "border-b border-slate-900" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-mono text-slate-600">
                  {event.date}
                </span>
                <span className="text-[9px] font-mono border border-slate-700 px-1.5 py-0.5 rounded text-slate-500">
                  {event.tag}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {event.text}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            Causal analysis
          </div>
          <div className="space-y-2.5">
            {causalSteps.map((step, index) => (
              <div key={step} className="flex items-start gap-2.5">
                <span className="text-[10px] font-mono text-slate-700 shrink-0 mt-0.5 w-5 text-right">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xs text-slate-400 leading-relaxed">
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2.5 mt-1">
            <div className="text-[10px] font-mono text-red-600 uppercase tracking-widest mb-1">
              Main contradiction
            </div>
            <p className="text-xs text-red-400 leading-relaxed">
              {contradiction}
            </p>
          </div>
        </div>

        <JudgmentPanel />
      </div>
    </section>
  );
}
