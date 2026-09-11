"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { AlertCircle, ChevronRight } from "lucide-react";
import { getApiUrl } from "@/app/lib/dashboard-api";
import type {
  CausalData,
  JudgmentState,
  NewsItem,
} from "@/app/types/btc-dashboard";

const TopEvents = ({ items }: { items: NewsItem[] }) => (
  <div className="bg-surface border hairline p-5 flex flex-col h-full">
    <div className="flex items-center justify-between hairline-b pb-3 mb-4">
      <div><div className="caps-sm text-faint">I</div><h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Top events</h2></div>
      <span className="caps-sm text-faint">Live</span>
    </div>
    <ul className="flex flex-col gap-5 overflow-y-auto scrollbar-thin" style={{ maxHeight: "320px" }}>
      {items.length === 0 ? <li className="caps-sm text-faint">Loading news…</li> : items.map((ev, i) => (
        <li key={i} className="flex gap-4">
          <span className="font-display-italic text-amber-sand text-[22px] leading-none mt-0.5">{String(i + 1).padStart(2, "0")}</span>
          <div className="flex-1 min-w-0">
            <a href={ev.url} target="_blank" rel="noopener noreferrer" className="font-sans-body text-paper text-[13px] leading-snug hover:text-amber-sand transition-colors">{ev.title}</a>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="caps-sm text-faint">{ev.tag}</span><span className="text-faint">·</span><span className="caps-sm text-faint">{ev.source}</span><span className="text-faint">·</span><span className="caps-sm text-faint">{ev.time}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
    <button className="caps-sm text-muted hover:text-paper transition-colors flex items-center mt-6 hairline-t pt-3 justify-between"><span>All events</span><ChevronRight size={12} /></button>
  </div>
);

const CausalAnalysis = ({ data }: { data: CausalData | null }) => {
  const weightColor: Record<string, string> = { strong: "text-paper", moderate: "text-paper-2", extreme: "text-alert-extreme" };
  const chain = data?.chain ?? [{ label: "Loading…", state: "", weight: "moderate" }];
  const contradiction = data?.contradiction ?? "Calculating…";
  return (
    <div className="bg-surface border hairline p-5 flex flex-col h-full">
      <div className="flex items-center justify-between hairline-b pb-3 mb-4">
        <div><div className="caps-sm text-faint">II</div><h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Causal analysis</h2></div>
        <span className="caps-sm text-faint">Structural labels</span>
      </div>
      <div className="flex flex-col">
        {chain.map((c, i) => (
          <div key={c.label} className="flex items-start gap-4 py-2.5" style={{ borderTop: i > 0 ? "1px solid #1A1A1C" : "none" }}>
            <span className="font-mono-data caps-sm text-faint mt-0.5 w-5">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex-1"><div className="font-sans-body text-paper text-[13px]">{c.label}</div><div className={`font-sans-body text-[12px] italic ${weightColor[c.weight] ?? "text-paper-2"} mt-0.5`}>{c.state}</div></div>
            <span className={`caps-sm ${c.weight === "extreme" ? "text-alert-extreme" : c.weight === "strong" ? "text-amber-sand" : "text-muted"}`}>{c.weight}</span>
          </div>
        ))}
      </div>
      <div className="hairline-t pt-4 mt-5"><div className="caps-sm text-faint mb-2">Main contradiction</div><p className="font-display-italic text-paper text-[16px] leading-snug">{contradiction}</p></div>
      <div className="mt-4 bg-surface-inset border hairline p-3">
        <div className="caps-sm text-faint mb-2 flex items-center gap-1.5"><AlertCircle size={10} /> Not a judgment</div>
        <p className="font-sans-body text-muted text-[11px] leading-relaxed">These are neutral structural labels derived from benchmarked data. Interpretation and action are yours.</p>
      </div>
    </div>
  );
};

const JudgmentPanel = ({ state, setState }: { state: JudgmentState; setState: Dispatch<SetStateAction<JudgmentState>> }) => {
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const handleCommit = async () => {
    if (!state.read.trim()) { setCommitError("Add your current read before committing."); return; }
    setCommitting(true); setCommitError(null);
    try {
      const res = await fetch(getApiUrl("/judgment"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: state.read, supports: state.supports, contradicts: state.contradicts, invalidates: state.invalidates, plan: state.plan, risk: state.risk }) });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setCommitted(`Committed · Entry #${data.id} · ${new Date(data.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`);
      setState({ read: "", supports: "", contradicts: "", invalidates: "", plan: "", risk: null });
    } catch (e) { setCommitError(e instanceof Error ? e.message : "Commit failed"); }
    finally { setCommitting(false); }
  };
  const fields = [{ key: "read" as const, label: "My current read", rows: 2 }, { key: "supports" as const, label: "What supports this view", rows: 2 }, { key: "contradicts" as const, label: "What contradicts this view", rows: 2 }, { key: "invalidates" as const, label: "What would change my mind", rows: 2 }, { key: "plan" as const, label: "My action plan", rows: 2 }];
  const risks = ["Low", "Medium", "High", "Stand aside"];
  return (
    <div className="bg-surface border hairline p-5 flex flex-col h-full">
      <div className="flex items-center justify-between hairline-b pb-3 mb-4"><div><div className="caps-sm text-faint">III</div><h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">User judgment</h2></div><span className="caps-sm text-amber-sand">You decide</span></div>
      {committed && <div className="bg-sage-10 border border-sage px-3 py-2 mb-3"><span className="caps-sm text-neutral-sage">{committed}</span></div>}
      {commitError && <div className="bg-extreme-10 border border-extreme px-3 py-2 mb-3"><span className="caps-sm text-alert-extreme">{commitError}</span></div>}
      <div className="flex flex-col gap-3 flex-1">
        {fields.map((f) => (<div key={f.key}><label className="caps-sm text-faint block mb-1.5">{f.label}</label><textarea rows={f.rows} value={state[f.key] || ""} onChange={(e) => { setState((s) => ({ ...s, [f.key]: e.target.value })); setCommitted(null); setCommitError(null); }} className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-sans-body resize-none" placeholder="..." /></div>))}
        <div><label className="caps-sm text-faint block mb-1.5">Risk level</label><div className="grid grid-cols-4 gap-1.5">{risks.map((r) => (<button key={r} onClick={() => setState((s) => ({ ...s, risk: r }))} className={`caps-sm py-2 border transition-colors ${state.risk === r ? "border-amber-sand bg-amber-sand-10 text-amber-sand" : "hairline text-muted hover:text-paper"}`}>{r}</button>))}</div></div>
      </div>
      <div className="mt-4 hairline-t pt-3 flex items-center justify-between">
        <span className="caps-sm text-faint">{committing ? "Saving…" : "Fill in your read before committing"}</span>
        <button onClick={handleCommit} disabled={committing} className={`caps-sm px-3 py-1.5 border transition-colors ${committing ? "border-faint text-faint cursor-not-allowed" : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"}`}>{committing ? "Saving…" : "Commit to log"}</button>
      </div>
    </div>
  );
};

export { CausalAnalysis, JudgmentPanel, TopEvents };
