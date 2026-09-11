"use client";

import { useState } from "react";
import { DECISION_DASHBOARD_API } from "@/app/lib/decision-dashboard";

interface ManualOverridePanelProps<TKey extends string> {
  endpoint: string;
  keys: readonly TKey[];
  labels: Record<TKey, string>;
  placeholder: string;
  rows?: number;
  successMessage?: string;
}

export default function ManualOverridePanel<TKey extends string>({
  endpoint,
  keys,
  labels,
  placeholder,
  rows = 3,
  successMessage = "Override applied — refresh to see",
}: ManualOverridePanelProps<TKey>) {
  const [raw, setRaw] = useState("");
  const [metric, setMetric] = useState<TKey>(keys[0]);
  const [status, setStatus] = useState<string | null>(null);

  const apply = async () => {
    try {
      const fields: unknown = JSON.parse(raw);
      const response = await fetch(`${DECISION_DASHBOARD_API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric, ...(fields as object) }),
      });
      setStatus(response.ok ? successMessage : "Backend error");
    } catch {
      setStatus("Invalid JSON — check format");
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-3">
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
        Screenshot override
      </div>
      <div>
        <label className="text-[10px] font-mono text-slate-600 block mb-1">
          Metric
        </label>
        <select
          value={metric}
          onChange={(event) => setMetric(event.target.value as TKey)}
          className="bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 w-full focus:outline-none focus:border-amber-900"
        >
          {keys.map((key) => (
            <option key={key} value={key}>
              {labels[key]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-mono text-slate-600 block mb-1">
          JSON from Claude extraction
        </label>
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono resize-none focus:outline-none focus:border-amber-900"
        />
      </div>
      {status && (
        <div
          className={`text-xs font-mono px-3 py-2 rounded-lg border ${
            status.includes("applied")
              ? "border-green-900 text-green-500 bg-green-950/30"
              : "border-red-900 text-red-400 bg-red-950/30"
          }`}
        >
          {status}
        </div>
      )}
      <button
        onClick={() => {
          void apply();
        }}
        className="w-full py-2 rounded-lg text-xs font-mono font-bold bg-amber-950/40 border border-amber-900/50 text-amber-500 hover:bg-amber-950/60 transition-colors"
      >
        Apply override
      </button>
    </div>
  );
}
