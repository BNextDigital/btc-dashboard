"use client";

import { useEffect, useState } from "react";
import { Circle } from "lucide-react";
import { getApiUrl } from "@/app/lib/dashboard-api";
import type {
  ManualHistoryEntry,
  ManualOverride,
} from "@/app/types/btc-dashboard";

const ManualOverridePanel = () => {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setSaving(true); setStatus("idle"); setMessage(null);
    try {
      const raw = JSON.parse(input.trim());
      const entries = Array.isArray(raw) ? raw : [raw];
      const results = await Promise.all(
        entries.map((entry) =>
          fetch(getApiUrl("/manual-override"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          }).then((r) => r.json())
        )
      );
      const failed = results.filter((r) => r.error);
      if (failed.length > 0) {
        setStatus("error");
        setMessage(`${failed.length} entry failed: ${failed[0].error}`);
      } else {
        setStatus("success");
        setMessage(`${results.length} metric${results.length > 1 ? "s" : ""} updated — ${results.map((r) => r.metric).join(", ")}`);
        setInput("");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch {
      setStatus("error");
      setMessage("Invalid JSON — check Claude's output and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async (metric: string) => {
    await fetch(getApiUrl(`/manual-override/${metric}`), { method: "DELETE" });
    window.location.reload();
  };

  return (
    <div className="bg-surface border hairline">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 hairline-b">
        <div>
          <div className="caps-sm text-faint">Manual override</div>
          <h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Screenshot → data</h2>
        </div>
        <div className="flex items-center gap-2">
          <Circle size={7} fill="#D9A84D" stroke="none" />
          <span className="caps-sm text-amber-sand">Paste Claude output</span>
        </div>
      </div>

      {/* Paste + active overrides */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x hairline">
        {/* Left — paste panel */}
        <div className="p-5">
          <div className="caps-sm text-faint mb-2">Paste JSON from Claude · single object or array</div>
          <textarea
            rows={12}
            value={input}
            onChange={(e) => { setInput(e.target.value); setStatus("idle"); setMessage(null); }}
            placeholder={`{\n  "metric": "exchange_netflow",\n  "current": "-3,400 BTC",\n  "d7": "-5,200 BTC",\n  "vs30d": "2.67x avg",\n  "percentile": 60,\n  "alert": "Strong outflow",\n  "pattern": "Sustained outflow structure",\n  "source": "CryptoQuant · tooltip exact",\n  "baseline_date": "2026-04-20"\n}`}
            className="w-full bg-surface-inset border hairline px-3 py-2.5 text-paper text-[11px] font-mono-data resize-none leading-relaxed"
          />
          {status === "success" && message && (
            <div className="mt-3 bg-sage-10 border border-sage px-3 py-2">
              <span className="caps-sm text-neutral-sage">{message}</span>
            </div>
          )}
          {status === "error" && message && (
            <div className="mt-3 bg-extreme-10 border border-extreme px-3 py-2">
              <span className="caps-sm text-alert-extreme">{message}</span>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="caps-sm text-faint">Supports single metric or array of multiple</span>
            <button
              onClick={handleSubmit}
              disabled={saving || !input.trim()}
              className={`caps-sm px-4 py-2 border transition-colors ${saving || !input.trim() ? "border-faint text-faint cursor-not-allowed" : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"}`}
            >
              {saving ? "Updating…" : "Apply override"}
            </button>
          </div>
        </div>

        {/* Right — active overrides */}
        <div className="p-5">
          <div className="caps-sm text-faint mb-4">Active overrides</div>
          <ActiveOverrides onClear={handleClear} />
        </div>
      </div>

      {/* Recent history section */}
      <div className="hairline-t">
        <div className="px-5 py-4 hairline-b flex items-center justify-between">
          <div className="caps-sm text-faint">Most recent backfill entries · manual_history.db</div>
          <span className="caps-sm text-faint">Applied automatically when live API unavailable</span>
        </div>
        <RecentHistoryPanel />
      </div>

      <div className="px-5 py-3 hairline-t bg-surface-inset flex items-center justify-between">
        <div className="caps-sm text-faint">Overrides persist until cleared · amber dot on card indicates manual data</div>
        <span className="caps-sm text-faint">When CoinGlass API is wired · overrides auto-disabled</span>
      </div>
    </div>
  );
};

const ActiveOverrides = ({ onClear }: { onClear: (metric: string) => void }) => {
  const [overrides, setOverrides] = useState<Record<string, ManualOverride>>({});
  useEffect(() => {
    fetch(getApiUrl("/manual-override"))
      .then((res) => res.json())
      .then((json) => setOverrides(json))
      .catch((err) => console.error(err));
  }, []);
  const entries = Object.entries(overrides);
  if (entries.length === 0)
    return (
      <div className="flex flex-col gap-3">
        <p className="caps-sm text-faint">No active overrides</p>
        <p className="font-sans-body text-muted text-[11px] leading-relaxed">
          Paste Claude&apos;s JSON output on the left and click Apply override.
        </p>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      {entries.map(([key, val]) => {
        const updatedAt = val.updated_at
          ? new Date(val.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC"
          : "—";
        return (
          <div key={key} className="bg-surface-inset border hairline p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Circle size={5} fill="#D9A84D" stroke="none" className="pulse-dot" />
                <span className="font-sans-body text-paper text-[12px] font-medium">{val.name}</span>
              </div>
              <button onClick={() => onClear(key)} className="caps-sm text-faint hover:text-alert-extreme transition-colors">Clear</button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="caps-sm text-faint">Current</div><div className="font-mono-data text-paper-2 text-[11px]">{val.current}</div>
              <div className="caps-sm text-faint">7d</div><div className="font-mono-data text-paper-2 text-[11px]">{val.d7 ?? "—"}</div>
              <div className="caps-sm text-faint">vs 30d</div><div className="font-mono-data text-paper-2 text-[11px]">{val.vs30d ?? "—"}</div>
              <div className="caps-sm text-faint">Alert</div><div className="font-mono-data text-alert-notable text-[11px]">{val.alert}</div>
              <div className="caps-sm text-faint">Source</div><div className="font-mono-data text-faint text-[10px]">{val.source}</div>
              <div className="caps-sm text-faint">Updated</div><div className="font-mono-data text-faint text-[10px]">{updatedAt}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RecentHistoryPanel = () => {
  const [entries, setEntries] = useState<ManualHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch(getApiUrl("/manual-history/latest"))
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setEntries(d.entries ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="px-5 py-4">
        <p className="caps-sm text-faint animate-pulse">Loading history…</p>
      </div>
    );

  if (error)
    return (
      <div className="px-5 py-4">
        <p className="caps-sm text-alert-extreme">{error}</p>
      </div>
    );

  if (entries.length === 0)
    return (
      <div className="px-5 py-4">
        <p className="caps-sm text-faint">No backfill entries found in manual_history.db</p>
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="hairline-b">
            {["Metric", "Date", "Current", "7d", "vs 30d", "Percentile", "Alert", "Pattern", "Source"].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 caps-sm text-faint font-normal whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.metric} className={`hairline-b hover:bg-surface-2 transition-colors ${i === entries.length - 1 ? "border-b-0" : ""}`}>
              <td className="px-4 py-2.5 font-mono-data text-amber-sand whitespace-nowrap">{e.metric}</td>
              <td className="px-4 py-2.5 font-mono-data text-faint whitespace-nowrap">{e.date}</td>
              <td className="px-4 py-2.5 font-mono-data text-paper whitespace-nowrap">{e.current ?? "—"}</td>
              <td className="px-4 py-2.5 font-mono-data text-paper-2 whitespace-nowrap">{e.d7 ?? "—"}</td>
              <td className="px-4 py-2.5 font-mono-data text-paper-2 whitespace-nowrap">{e.vs30d ?? "—"}</td>
              <td className="px-4 py-2.5 font-mono-data text-paper-2 whitespace-nowrap">{e.percentile != null ? `${e.percentile}th` : "—"}</td>
              <td className="px-4 py-2.5 font-mono-data text-alert-notable whitespace-nowrap">{e.alert ?? "—"}</td>
              <td className="px-4 py-2.5 font-sans-body text-paper-2 max-w-[200px] truncate">{e.pattern ?? "—"}</td>
              <td className="px-4 py-2.5 font-mono-data text-faint text-[10px] whitespace-nowrap">{e.source ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManualOverridePanel;
