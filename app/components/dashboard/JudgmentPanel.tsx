"use client";

import { useState } from "react";

const FIELD_LABELS = [
  ["read", "My current read"],
  ["supports", "What supports this view"],
  ["contradicts", "What contradicts"],
  ["invalidates", "What would change my mind"],
  ["plan", "Action plan"],
] as const;

type JudgmentField = (typeof FIELD_LABELS)[number][0];
type Risk = "low" | "medium" | "high" | "extreme";

const RISK_COLORS: Record<Risk, string> = {
  low: "#6A9A6A",
  medium: "#D9A84D",
  high: "#E05252",
  extreme: "#E05252",
};

const EMPTY_FIELDS: Record<JudgmentField, string> = {
  read: "",
  supports: "",
  contradicts: "",
  invalidates: "",
  plan: "",
};

export default function JudgmentPanel() {
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [risk, setRisk] = useState<Risk>("medium");
  const [saved, setSaved] = useState(false);

  const commit = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2_000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
        Judgment panel
      </div>
      {FIELD_LABELS.map(([key, label]) => (
        <div key={key}>
          <label className="text-[10px] font-mono text-slate-600 block mb-1">
            {label}
          </label>
          <textarea
            value={fields[key]}
            onChange={(event) =>
              setFields((previous) => ({
                ...previous,
                [key]: event.target.value,
              }))
            }
            rows={2}
            className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono resize-none focus:outline-none focus:border-amber-900 transition-colors"
          />
        </div>
      ))}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-slate-600">Risk level</span>
        {(Object.keys(RISK_COLORS) as Risk[]).map((option) => (
          <button
            key={option}
            onClick={() => setRisk(option)}
            className="text-[10px] font-mono px-2.5 py-1 rounded border transition-colors capitalize"
            style={{
              borderColor: risk === option ? RISK_COLORS[option] : "#1f2937",
              color: risk === option ? RISK_COLORS[option] : "#6b7280",
              background:
                risk === option ? `${RISK_COLORS[option]}18` : "transparent",
            }}
          >
            {option}
          </button>
        ))}
      </div>
      <button
        onClick={commit}
        className="w-full py-2 rounded-lg text-xs font-mono font-bold transition-all"
        style={{
          background: saved ? "#6A9A6A" : "#D9A84D",
          color: "#0B0B0C",
        }}
      >
        {saved ? "✓ Saved to log" : "Commit judgment to log"}
      </button>
    </div>
  );
}
