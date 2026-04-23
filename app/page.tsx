"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Activity,
  Clock,
  FileText,
  ChevronRight,
  Circle,
  Minus,
} from "lucide-react";
import TradingViewEmbed from "./components/TradingViewEmbed";

// ---------------------------------------------------------------------------
// BTC Decision Dashboard
// Philosophy: AI organizes the data. Humans make the decisions.
// ---------------------------------------------------------------------------

const FONT_LINK = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

  .font-display { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
  .font-display-italic { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; }
  .font-sans-body { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
  .font-mono-data { font-family: 'IBM Plex Mono', 'Courier New', monospace; font-feature-settings: 'tnum'; }

  .grid-bg {
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  .hairline { border-color: #22231F; }
  .hairline-b { border-bottom: 1px solid #22231F; }
  .hairline-t { border-top: 1px solid #22231F; }

  .caps-sm { letter-spacing: 0.22em; text-transform: uppercase; font-size: 9px; font-weight: 500; }

  .bg-ink { background-color: #0B0B0C; }
  .bg-surface { background-color: #131315; }
  .bg-surface-2 { background-color: #17171A; }
  .bg-surface-inset { background-color: #0E0E10; }

  .text-paper { color: #E8E4D9; }
  .text-paper-2 { color: #B8B5AA; }
  .text-muted { color: #8A8780; }
  .text-faint { color: #55534B; }

  .text-amber-sand { color: #D9A84D; }
  .text-alert-extreme { color: #C4614A; }
  .text-alert-notable { color: #C89A3F; }
  .text-neutral-sage { color: #8DA078; }

  .bg-amber-sand-10 { background-color: rgba(217, 168, 77, 0.10); }
  .bg-extreme-10 { background-color: rgba(196, 97, 74, 0.10); }
  .bg-notable-10 { background-color: rgba(200, 154, 63, 0.10); }
  .bg-sage-10 { background-color: rgba(141, 160, 120, 0.10); }

  .border-amber-sand { border-color: rgba(217, 168, 77, 0.35); }
  .border-extreme { border-color: rgba(196, 97, 74, 0.35); }
  .border-notable { border-color: rgba(200, 154, 63, 0.35); }
  .border-sage { border-color: rgba(141, 160, 120, 0.35); }

  .pulse-dot { animation: pulse-soft 2.4s ease-in-out infinite; }
  @keyframes pulse-soft {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }

  .fade-in { animation: fade-in 0.6s ease-out both; }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  textarea, input { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
  textarea:focus, input:focus, select:focus {
    outline: none;
    border-color: #D9A84D !important;
  }
`;

const API = process.env.NEXT_PUBLIC_API_URL;

type Metric = {
  id: string;
  name: string;
  category: string;
  current: string;
  currentDir: "up" | "down" | "flat";
  d7: string;
  vs30d: string;
  percentile: number;
  alert: string;
  alertLevel: "extreme" | "notable" | "neutral" | "none";
  pattern: string;
  spark: number[];
  updated: string;
  _is_override: boolean;
};

const TOP_EVENTS = [
  { idx: "01", title: "Strategy announces 8,100 BTC purchase", time: "06:15 UTC", tag: "Corporate Flow" },
  { idx: "02", title: "ETF daily inflow hits 30-day high", time: "04:30 UTC", tag: "Institutional" },
  { idx: "03", title: "Fed Chair speaking tomorrow · 14:00 UTC", time: "scheduled", tag: "Macro" },
];

const CAUSAL_CHAIN = [
  { label: "ETF inflow", state: "accelerating", weight: "strong" },
  { label: "Price action", state: "rising", weight: "moderate" },
  { label: "Volume", state: "high, no rejection", weight: "strong" },
  { label: "Funding", state: "elevated, leverage rising", weight: "extreme" },
  { label: "Netflow", state: "supply leaving exchanges", weight: "moderate" },
];

const INITIAL_TRADE_LOGS = [
  { date: "Oct 26", structure: "Range high test", read: "Absorption at $67.8k", plan: "Scale in, tight invalidation", result: "Pending", bias: "—" },
  { date: "Oct 21", structure: "Breakout retest", read: "Funding too hot", plan: "Skip", result: "Correct skip", bias: "Patience held" },
  { date: "Oct 14", structure: "Bull flag", read: "Clean structure", plan: "Enter, trail stop", result: "+4.2%", bias: "Trimmed early" },
];

const alertClasses = (level: string) => {
  switch (level) {
    case "extreme": return { text: "text-alert-extreme", bg: "bg-extreme-10", border: "border-extreme" };
    case "notable": return { text: "text-alert-notable", bg: "bg-notable-10", border: "border-notable" };
    case "neutral": return { text: "text-neutral-sage", bg: "bg-sage-10", border: "border-sage" };
    default: return { text: "text-muted", bg: "bg-surface-2", border: "hairline" };
  }
};

const Sparkline = ({ data, dir = "up" }: { data: number[]; dir?: string }) => {
  const w = 80, h = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const stroke = dir === "down" ? "#C4614A" : "#D9A84D";
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" points={pts} opacity="0.85" />
    </svg>
  );
};

const PercentileBar = ({ value }: { value: number }) => {
  const color = value >= 90 ? "#C4614A" : value >= 75 ? "#C89A3F" : value <= 10 ? "#C4614A" : "#8A8780";
  return (
    <div className="w-full">
      <div className="h-[3px] w-full bg-surface-inset relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full" style={{ width: `${value}%`, backgroundColor: color, transition: "width 600ms ease-out" }} />
        <div className="absolute top-0 h-full w-px" style={{ left: "10%", backgroundColor: "#2F2F2F" }} />
        <div className="absolute top-0 h-full w-px" style={{ left: "75%", backgroundColor: "#2F2F2F" }} />
        <div className="absolute top-0 h-full w-px" style={{ left: "90%", backgroundColor: "#2F2F2F" }} />
      </div>
    </div>
  );
};

const MetricCard = ({ metric, index }: { metric: Metric; index: number }) => {
  const a = alertClasses(metric.alertLevel);
  const DirIcon = metric.currentDir === "up" ? TrendingUp : metric.currentDir === "down" ? TrendingDown : Minus;
  return (
    <div className="fade-in bg-surface border hairline p-4 flex flex-col gap-3 hover:bg-surface-2 transition-colors duration-300" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="caps-sm text-faint mb-1">{metric.category}</div>
          <h3 className="font-sans-body text-paper text-[14px] font-medium leading-tight">{metric.name}</h3>
        </div>
        <span className={`caps-sm px-2 py-[3px] border ${a.border} ${a.bg} ${a.text} whitespace-nowrap`}>{metric.alert}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono-data text-paper text-[22px] leading-none tracking-tight">{metric.current}</span>
          <DirIcon size={12} className={metric.currentDir === "up" ? "text-neutral-sage" : metric.currentDir === "down" ? "text-alert-extreme" : "text-muted"} />
        </div>
        <Sparkline data={metric.spark} dir={metric.currentDir} />
      </div>
      <div className="grid grid-cols-3 gap-2 hairline-t pt-3">
        <div><div className="caps-sm text-faint mb-1">7d</div><div className="font-mono-data text-paper-2 text-[12px]">{metric.d7}</div></div>
        <div><div className="caps-sm text-faint mb-1">vs 30d</div><div className="font-mono-data text-paper-2 text-[12px]">{metric.vs30d}</div></div>
        <div><div className="caps-sm text-faint mb-1">Pctl</div><div className="font-mono-data text-paper-2 text-[12px]">{metric.percentile}</div></div>
      </div>
      <div>
        <PercentileBar value={metric.percentile} />
        <div className="flex justify-between mt-1"><span className="caps-sm text-faint">p0</span><span className="caps-sm text-faint">p100</span></div>
      </div>
      <div className="flex items-center justify-between hairline-t pt-2">
        <span className="caps-sm text-faint">Pattern</span>
        <span className={`font-sans-body text-[11px] ${metric.pattern === "—" ? "text-faint" : "text-paper-2 italic"}`}>{metric.pattern}</span>
      </div>
      <div className="flex items-center gap-1 text-faint">
        <Circle
          size={5}
          fill={metric._is_override ? "#D9A84D" : "#8DA078"}
          stroke="none"
          className="pulse-dot"
        />
        <span className="caps-sm">
          {metric._is_override ? "Manual · screenshot" : `Updated ${metric.updated}`}
        </span>
      </div>
    </div>
  );
};

const TopEvents = ({ items }: { items: Array<{ title: string; source: string; time: string; tag: string; url: string }> }) => (
  <div className="bg-surface border hairline p-5 flex flex-col h-full">
    <div className="flex items-center justify-between hairline-b pb-3 mb-4">
      <div>
        <div className="caps-sm text-faint">I</div>
        <h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Top events</h2>
      </div>
      <span className="caps-sm text-faint">Live</span>
    </div>
    <ul className="flex flex-col gap-5 overflow-y-auto scrollbar-thin" style={{ maxHeight: "320px" }}>
      {items.length === 0 ? (
        <li className="caps-sm text-faint">Loading news…</li>
      ) : (
        items.map((ev, i) => (
          <li key={i} className="flex gap-4">
            <span className="font-display-italic text-amber-sand text-[22px] leading-none mt-0.5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans-body text-paper text-[13px] leading-snug hover:text-amber-sand transition-colors"
              >
                {ev.title}
              </a>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="caps-sm text-faint">{ev.tag}</span>
                <span className="text-faint">·</span>
                <span className="caps-sm text-faint">{ev.source}</span>
                <span className="text-faint">·</span>
                <span className="caps-sm text-faint">{ev.time}</span>
              </div>
            </div>
          </li>
        ))
      )}
    </ul>
    <button className="caps-sm text-muted hover:text-paper transition-colors flex items-center mt-6 hairline-t pt-3 justify-between">
      <span>All events</span><ChevronRight size={12} />
    </button>
  </div>
);

const CausalAnalysis = ({ data }: {
  data: { chain: Array<{label: string; state: string; weight: string}>; contradiction: string } | null
}) => {
  const weightColor: Record<string, string> = {
    strong:   "text-paper",
    moderate: "text-paper-2",
    extreme:  "text-alert-extreme",
  };

  const chain = data?.chain ?? [
    { label: "Loading…", state: "", weight: "moderate" },
  ];

  const contradiction = data?.contradiction ?? "Calculating…";

  return (
    <div className="bg-surface border hairline p-5 flex flex-col h-full">
      <div className="flex items-center justify-between hairline-b pb-3 mb-4">
        <div>
          <div className="caps-sm text-faint">II</div>
          <h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Causal analysis</h2>
        </div>
        <span className="caps-sm text-faint">Structural labels</span>
      </div>
      <div className="flex flex-col">
        {chain.map((c, i) => (
          <div
            key={c.label}
            className="flex items-start gap-4 py-2.5"
            style={{ borderTop: i > 0 ? "1px solid #1A1A1C" : "none" }}
          >
            <span className="font-mono-data caps-sm text-faint mt-0.5 w-5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex-1">
              <div className="font-sans-body text-paper text-[13px]">{c.label}</div>
              <div className={`font-sans-body text-[12px] italic ${weightColor[c.weight] ?? "text-paper-2"} mt-0.5`}>
                {c.state}
              </div>
            </div>
            <span className={`caps-sm ${
              c.weight === "extreme" ? "text-alert-extreme" :
              c.weight === "strong"  ? "text-amber-sand"   : "text-muted"
            }`}>
              {c.weight}
            </span>
          </div>
        ))}
      </div>
      <div className="hairline-t pt-4 mt-5">
        <div className="caps-sm text-faint mb-2">Main contradiction</div>
        <p className="font-display-italic text-paper text-[16px] leading-snug">
          {contradiction}
        </p>
      </div>
      <div className="mt-4 bg-surface-inset border hairline p-3">
        <div className="caps-sm text-faint mb-2 flex items-center gap-1.5">
          <AlertCircle size={10} /> Not a judgment
        </div>
        <p className="font-sans-body text-muted text-[11px] leading-relaxed">
          These are neutral structural labels derived from benchmarked data. Interpretation and action are yours.
        </p>
      </div>
    </div>
  );
};

type JudgmentState = { read: string; supports: string; contradicts: string; invalidates: string; plan: string; risk: string | null };

const JudgmentPanel = ({ state, setState }: { state: JudgmentState; setState: React.Dispatch<React.SetStateAction<JudgmentState>> }) => {
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted]   = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  const handleCommit = async () => {
    if (!state.read.trim()) {
      setCommitError("Add your current read before committing.");
      return;
    }

    setCommitting(true);
    setCommitError(null);

    try {
      const res = await fetch(`${API}/judgment`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          read:        state.read,
          supports:    state.supports,
          contradicts: state.contradicts,
          invalidates: state.invalidates,
          plan:        state.plan,
          risk:        state.risk,
        }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      setCommitted(`Committed · Entry #${data.id} · ${new Date(data.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`);
      setState({ read: "", supports: "", contradicts: "", invalidates: "", plan: "", risk: null });

    } catch (e) {
      setCommitError(e instanceof Error ? e.message : "Commit failed");
    } finally {
      setCommitting(false);
    }
  };

  const fields = [
    { key: "read" as const, label: "My current read", rows: 2 },
    { key: "supports" as const, label: "What supports this view", rows: 2 },
    { key: "contradicts" as const, label: "What contradicts this view", rows: 2 },
    { key: "invalidates" as const, label: "What would change my mind", rows: 2 },
    { key: "plan" as const, label: "My action plan", rows: 2 },
  ];
  const risks = ["Low", "Medium", "High", "Stand aside"];

  return (
    <div className="bg-surface border hairline p-5 flex flex-col h-full">
      <div className="flex items-center justify-between hairline-b pb-3 mb-4">
        <div><div className="caps-sm text-faint">III</div><h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">User judgment</h2></div>
        <span className="caps-sm text-amber-sand">You decide</span>
      </div>

      {committed && (
        <div className="bg-sage-10 border border-sage px-3 py-2 mb-3">
          <span className="caps-sm text-neutral-sage">{committed}</span>
        </div>
      )}

      {commitError && (
        <div className="bg-extreme-10 border border-extreme px-3 py-2 mb-3">
          <span className="caps-sm text-alert-extreme">{commitError}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 flex-1">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="caps-sm text-faint block mb-1.5">{f.label}</label>
            <textarea
              rows={f.rows}
              value={state[f.key] || ""}
              onChange={(e) => {
                setState((s) => ({ ...s, [f.key]: e.target.value }));
                setCommitted(null);
                setCommitError(null);
              }}
              className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-sans-body resize-none"
              placeholder="..."
            />
          </div>
        ))}

        <div>
          <label className="caps-sm text-faint block mb-1.5">Risk level</label>
          <div className="grid grid-cols-4 gap-1.5">
            {risks.map((r) => (
              <button
                key={r}
                onClick={() => setState((s) => ({ ...s, risk: r }))}
                className={`caps-sm py-2 border transition-colors ${state.risk === r ? "border-amber-sand bg-amber-sand-10 text-amber-sand" : "hairline text-muted hover:text-paper"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 hairline-t pt-3 flex items-center justify-between">
        <span className="caps-sm text-faint">
          {committing ? "Saving…" : "Fill in your read before committing"}
        </span>
        <button
          onClick={handleCommit}
          disabled={committing}
          className={`caps-sm px-3 py-1.5 border transition-colors ${
            committing
              ? "border-faint text-faint cursor-not-allowed"
              : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"
          }`}
        >
          {committing ? "Saving…" : "Commit to log"}
        </button>
      </div>
    </div>
  );
};

const ManualOverridePanel = () => {
  const [input, setInput]     = useState("");
  const [status, setStatus]   = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setSaving(true);
    setStatus("idle");
    setMessage(null);

    try {
      const raw = JSON.parse(input.trim());
      const entries = Array.isArray(raw) ? raw : [raw];

      const results = await Promise.all(
        entries.map((entry) =>
          fetch(`${API}/manual-override`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(entry),
          }).then((r) => r.json())
        )
      );

      const failed = results.filter((r) => r.error);
      if (failed.length > 0) {
        setStatus("error");
        setMessage(`${failed.length} entry failed: ${failed[0].error}`);
      } else {
        setStatus("success");
        setMessage(
          `${results.length} metric${results.length > 1 ? "s" : ""} updated — ${results.map((r) => r.metric).join(", ")}`
        );
        setInput("");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (e) {
      setStatus("error");
      setMessage("Invalid JSON — check Claude's output and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async (metric: string) => {
    await fetch(`${API}/manual-override/${metric}`, { method: "DELETE" });
    window.location.reload();
  };

  return (
    <div className="bg-surface border hairline">
      <div className="flex items-center justify-between px-5 py-4 hairline-b">
        <div>
          <div className="caps-sm text-faint">Manual override</div>
          <h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">
            Screenshot → data
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Circle size={7} fill="#D9A84D" stroke="none" />
          <span className="caps-sm text-amber-sand">Paste Claude output</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x hairline">
        <div className="p-5">
          <div className="caps-sm text-faint mb-2">
            Paste JSON from Claude · single object or array
          </div>
          <textarea
            rows={12}
            value={input}
            onChange={(e) => { setInput(e.target.value); setStatus("idle"); setMessage(null); }}
            placeholder={`{
  "metric": "exchange_netflow",
  "current": "-3,400 BTC",
  "d7": "-5,200 BTC",
  "vs30d": "2.67x avg",
  "percentile": 60,
  "alert": "Strong outflow",
  "pattern": "Sustained outflow structure",
  "source": "CryptoQuant · tooltip exact",
  "baseline_date": "2026-04-20"
}`}
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
            <span className="caps-sm text-faint">
              Supports single metric or array of multiple
            </span>
            <button
              onClick={handleSubmit}
              disabled={saving || !input.trim()}
              className={`caps-sm px-4 py-2 border transition-colors ${
                saving || !input.trim()
                  ? "border-faint text-faint cursor-not-allowed"
                  : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"
              }`}
            >
              {saving ? "Updating…" : "Apply override"}
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="caps-sm text-faint mb-4">Active overrides</div>
          <ActiveOverrides onClear={handleClear} />
        </div>
      </div>

      <div className="px-5 py-3 hairline-t bg-surface-inset flex items-center justify-between">
        <div className="caps-sm text-faint">
          Overrides persist until cleared · amber dot on card indicates manual data
        </div>
        <span className="caps-sm text-faint">
          When CoinGlass API is wired · overrides auto-disabled
        </span>
      </div>
    </div>
  );
};

const ActiveOverrides = ({ onClear }: { onClear: (metric: string) => void }) => {
  const [overrides, setOverrides] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch(`${API}/manual-override`)
      .then((res) => res.json())
      .then((json) => setOverrides(json))
      .catch((err) => console.error(err));
  }, []);

  const entries = Object.entries(overrides);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="caps-sm text-faint">No active overrides</p>
        <p className="font-sans-body text-muted text-[11px] leading-relaxed">
          Paste Claude's JSON output on the left and click Apply override.
          Exchange Netflow and LTH Supply will update instantly.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map(([key, val]) => {
        const updatedAt = val.updated_at
          ? new Date(val.updated_at).toLocaleTimeString("en-US", {
              hour:     "2-digit",
              minute:   "2-digit",
              timeZone: "UTC",
            }) + " UTC"
          : "—";

        return (
          <div key={key} className="bg-surface-inset border hairline p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Circle size={5} fill="#D9A84D" stroke="none" className="pulse-dot" />
                <span className="font-sans-body text-paper text-[12px] font-medium">
                  {val.name}
                </span>
              </div>
              <button
                onClick={() => onClear(key)}
                className="caps-sm text-faint hover:text-alert-extreme transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="caps-sm text-faint">Current</div>
              <div className="font-mono-data text-paper-2 text-[11px]">{val.current}</div>
              <div className="caps-sm text-faint">Alert</div>
              <div className="font-mono-data text-alert-notable text-[11px]">{val.alert}</div>
              <div className="caps-sm text-faint">Source</div>
              <div className="font-mono-data text-faint text-[10px]">{val.source}</div>
              <div className="caps-sm text-faint">Updated</div>
              <div className="font-mono-data text-faint text-[10px]">{updatedAt}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TradeExecutionPanel = ({
  executions,
  onAdd,
}: {
  executions: any[];
  onAdd: () => void;
}) => {
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [saved, setSaved]           = useState<any | null>(null);

  const [form, setForm] = useState({
    planned_entry:    "",
    actual_entry:     "",
    size_btc:         "",
    max_drawdown_pct: "",
    current_volume:   "",
    market_state:     "",
  });

  const planned    = parseFloat(form.planned_entry)    || 0;
  const actual     = parseFloat(form.actual_entry)     || 0;
  const drawdownPct = parseFloat(form.max_drawdown_pct) || 0;
  const volume     = parseFloat(form.current_volume)   || 0;

  const slippage           = actual && planned ? (actual - planned) : null;
  const maxDrawdownPrice   = actual && drawdownPct ? actual * (1 - drawdownPct / 100) : null;
  const vol05x             = volume ? volume * 0.5  : null;
  const vol15x             = volume ? volume * 1.5  : null;
  const vol20x             = volume ? volume * 2.0  : null;

  const fmt = (n: number | null, decimals = 2, prefix = "") =>
    n !== null ? `${prefix}${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}` : "—";

  const handleSave = async () => {
    if (!form.planned_entry || !form.actual_entry || !form.size_btc || !form.max_drawdown_pct || !form.current_volume || !form.market_state) {
      setSaveError("All fields are required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API}/trade-execution`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          planned_entry:    parseFloat(form.planned_entry),
          actual_entry:     parseFloat(form.actual_entry),
          size_btc:         parseFloat(form.size_btc),
          max_drawdown_pct: parseFloat(form.max_drawdown_pct),
          current_volume:   parseFloat(form.current_volume),
          market_state:     form.market_state,
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setSaved(data);
      setShowForm(false);
      setForm({ planned_entry: "", actual_entry: "", size_btc: "", max_drawdown_pct: "", current_volume: "", market_state: "" });
      onAdd();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const marketStates = ["Green", "Yellow", "Red"];
  const stateColors: Record<string, string> = {
    Green:  "text-neutral-sage border-sage bg-sage-10",
    Yellow: "text-alert-notable border-notable bg-notable-10",
    Red:    "text-alert-extreme border-extreme bg-extreme-10",
  };

  return (
    <div className="bg-surface border hairline">
      <div className="flex items-center justify-between px-5 py-4 hairline-b">
        <div>
          <div className="caps-sm text-faint">VI</div>
          <h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">
            Trade execution
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="caps-sm text-faint">{executions.length} entries</span>
          <button
            onClick={() => { setShowForm(!showForm); setSaved(null); setSaveError(null); }}
            className={`caps-sm px-3 py-1.5 border transition-colors ${
              showForm
                ? "border-amber-sand bg-amber-sand-10 text-amber-sand"
                : "hairline text-muted hover:text-paper hover:border-amber-sand"
            }`}
          >
            {showForm ? "Cancel" : "Add trade"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="px-5 py-5 hairline-b bg-surface-2">
          <div className="caps-sm text-amber-sand mb-4">New execution entry</div>

          {saveError && (
            <div className="bg-extreme-10 border border-extreme px-3 py-2 mb-4">
              <span className="caps-sm text-alert-extreme">{saveError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="caps-sm text-faint block mb-1.5">Planned entry price (USD)</label>
              <input type="number" value={form.planned_entry} onChange={(e) => setForm((s) => ({ ...s, planned_entry: e.target.value }))} placeholder="e.g. 76000" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" />
            </div>
            <div>
              <label className="caps-sm text-faint block mb-1.5">Actual entry / fill price (USD)</label>
              <input type="number" value={form.actual_entry} onChange={(e) => setForm((s) => ({ ...s, actual_entry: e.target.value }))} placeholder="e.g. 76120" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" />
            </div>
            <div>
              <label className="caps-sm text-faint block mb-1.5">Slippage <span className="text-amber-sand">· calculated</span></label>
              <div className={`w-full bg-surface-inset border hairline px-2.5 py-2 text-[12px] font-mono-data ${slippage === null ? "text-faint" : slippage > 0 ? "text-alert-extreme" : slippage < 0 ? "text-neutral-sage" : "text-muted"}`}>
                {slippage !== null ? `${slippage > 0 ? "+" : ""}$${slippage.toFixed(2)}` : "—"}
              </div>
            </div>
            <div>
              <label className="caps-sm text-faint block mb-1.5">Current size (BTC)</label>
              <input type="number" value={form.size_btc} onChange={(e) => setForm((s) => ({ ...s, size_btc: e.target.value }))} placeholder="e.g. 0.5" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" />
            </div>
            <div>
              <label className="caps-sm text-faint block mb-1.5">Max drawdown / stop loss (%)</label>
              <input type="number" value={form.max_drawdown_pct} onChange={(e) => setForm((s) => ({ ...s, max_drawdown_pct: e.target.value }))} placeholder="e.g. 3" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" />
            </div>
            <div>
              <label className="caps-sm text-faint block mb-1.5">Stop price <span className="text-amber-sand">· calculated</span></label>
              <div className="w-full bg-surface-inset border hairline px-2.5 py-2 text-[12px] font-mono-data text-alert-extreme">
                {maxDrawdownPrice !== null ? `$${maxDrawdownPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </div>
            </div>
            <div>
              <label className="caps-sm text-faint block mb-1.5">Current volume (BTC)</label>
              <input type="number" value={form.current_volume} onChange={(e) => setForm((s) => ({ ...s, current_volume: e.target.value }))} placeholder="e.g. 1200" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" />
            </div>
            <div>
              <label className="caps-sm text-faint block mb-1.5">Market state</label>
              <div className="flex gap-2">
                {marketStates.map((s) => (
                  <button key={s} onClick={() => setForm((f) => ({ ...f, market_state: s }))} className={`caps-sm px-3 py-2 border flex-1 transition-colors ${form.market_state === s ? stateColors[s] : "hairline text-muted hover:text-paper"}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          {volume > 0 && (
            <div className="hairline-t pt-4 mb-5">
              <div className="caps-sm text-faint mb-3">Volume benchmarks <span className="text-amber-sand">· calculated · use for TradingView alerts</span></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-inset border hairline p-3"><div className="caps-sm text-faint mb-1">0.5x — Slowdown</div><div className="font-mono-data text-paper-2 text-[14px]">{fmt(vol05x, 2)} BTC</div></div>
                <div className="bg-surface-inset border hairline p-3"><div className="caps-sm text-faint mb-1">1.5x — Interest</div><div className="font-mono-data text-amber-sand text-[14px]">{fmt(vol15x, 2)} BTC</div></div>
                <div className="bg-surface-inset border hairline p-3"><div className="caps-sm text-faint mb-1">2.0x — Significant</div><div className="font-mono-data text-alert-notable text-[14px]">{fmt(vol20x, 2)} BTC</div></div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="caps-sm px-3 py-1.5 border hairline text-muted hover:text-paper transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className={`caps-sm px-3 py-1.5 border transition-colors ${saving ? "border-faint text-faint cursor-not-allowed" : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"}`}>
              {saving ? "Saving…" : "Save execution"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 caps-sm text-faint px-5 py-2.5 hairline-b bg-surface-inset">
        <div className="col-span-1">Date</div>
        <div className="col-span-1">State</div>
        <div className="col-span-2">Planned</div>
        <div className="col-span-2">Actual</div>
        <div className="col-span-1">Slip</div>
        <div className="col-span-1">Size</div>
        <div className="col-span-1">Stop%</div>
        <div className="col-span-2">Stop $</div>
        <div className="col-span-1">Vol BTC</div>
      </div>

      {executions.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <span className="caps-sm text-faint">No execution entries yet — add your first trade above</span>
        </div>
      ) : (
        executions.map((e, i) => {
          const stateColor = e.market_state === "Green" ? "text-neutral-sage" : e.market_state === "Yellow" ? "text-alert-notable" : e.market_state === "Red" ? "text-alert-extreme" : "text-muted";
          return (
            <div key={i} className={`grid grid-cols-12 px-5 py-3 text-[12px] font-sans-body items-center ${i < executions.length - 1 ? "hairline-b" : ""} hover:bg-surface-2 transition-colors`}>
              <div className="col-span-1 font-mono-data text-paper-2">{e.date}</div>
              <div className={`col-span-1 caps-sm ${stateColor}`}>{e.market_state}</div>
              <div className="col-span-2 font-mono-data text-paper-2">${e.planned_entry?.toLocaleString()}</div>
              <div className="col-span-2 font-mono-data text-paper">${e.actual_entry?.toLocaleString()}</div>
              <div className={`col-span-1 font-mono-data ${e.slippage > 0 ? "text-alert-extreme" : e.slippage < 0 ? "text-neutral-sage" : "text-muted"}`}>{e.slippage > 0 ? "+" : ""}{e.slippage?.toFixed(2)}</div>
              <div className="col-span-1 font-mono-data text-paper-2">{e.size_btc} BTC</div>
              <div className="col-span-1 font-mono-data text-muted">{e.max_drawdown_pct}%</div>
              <div className="col-span-2 font-mono-data text-alert-extreme">${e.max_drawdown_price?.toLocaleString()}</div>
              <div className="col-span-1 font-mono-data text-paper-2">{e.current_volume}</div>
            </div>
          );
        })
      )}

      <div className="px-5 py-4 hairline-t bg-surface-inset flex items-center justify-between">
        <div className="flex items-center gap-2 text-faint">
          <Activity size={12} />
          <span className="caps-sm">Quantitative execution log · feeds SEM analytics system</span>
        </div>
        <span className="caps-sm text-faint">Vol benchmarks usable as TradingView alert levels</span>
      </div>
    </div>
  );
};

type TradeLog = { date: string; structure: string; read: string; plan: string; result: string; bias: string };

const TradeLogReview = ({ logs, onAdd }: { logs: TradeLog[]; onAdd: () => void }) => {
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm]           = useState({
    structure:    "",
    capital:      "",
    read:         "",
    contradiction:"",
    plan:         "",
    risk:         "",
  });

  const handleSave = async () => {
    if (!form.read.trim() || !form.plan.trim()) {
      setSaveError("Read and plan are required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API}/trade-log`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setShowForm(false);
      setForm({ structure: "", capital: "", read: "", contradiction: "", plan: "", risk: "" });
      onAdd();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const formFields = [
    { key: "structure" as const,     label: "Market structure at entry",  placeholder: "Range high test, bull flag, breakout retest…" },
    { key: "capital" as const,       label: "Capital & flow picture",     placeholder: "ETF inflow strong, realized cap rising, OI elevated…" },
    { key: "read" as const,          label: "My read at the time",        placeholder: "What I believed was happening when I made this decision…" },
    { key: "contradiction" as const, label: "What I was ignoring",        placeholder: "The signal that argued against my read…" },
    { key: "plan" as const,          label: "What I did",                 placeholder: "Entered long at $X, sized Y%, stop at Z…" },
    { key: "risk" as const,          label: "Risk taken",                 placeholder: "Low / Medium / High / Oversized" },
  ];

  return (
    <div className="bg-surface border hairline">
      <div className="flex items-center justify-between px-5 py-4 hairline-b">
        <div>
          <div className="caps-sm text-faint">IV</div>
          <h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Review & notes</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="caps-sm text-faint">{logs.length} entries</span>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`caps-sm px-3 py-1.5 border transition-colors ${showForm ? "border-amber-sand bg-amber-sand-10 text-amber-sand" : "hairline text-muted hover:text-paper hover:border-amber-sand"}`}
          >
            {showForm ? "Cancel" : "New entry"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="px-5 py-4 hairline-b bg-surface-2">
          <div className="mb-4">
            <div className="caps-sm text-amber-sand mb-1">Log a trade decision</div>
            <p className="font-sans-body text-muted text-[11px]">Record what the market looked like, what you decided, and why. Add result and bias after the trade closes.</p>
          </div>
          {saveError && (
            <div className="bg-extreme-10 border border-extreme px-3 py-2 mb-3">
              <span className="caps-sm text-alert-extreme">{saveError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {formFields.map((f) => (
              <div key={f.key}>
                <label className="caps-sm text-faint block mb-1.5">{f.label}</label>
                <textarea rows={2} value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-sans-body resize-none" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="caps-sm px-3 py-1.5 hairline text-muted hover:text-paper border transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className={`caps-sm px-3 py-1.5 border transition-colors ${saving ? "border-faint text-faint cursor-not-allowed" : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"}`}>
              {saving ? "Saving…" : "Log This Trade"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 caps-sm text-faint px-5 py-2.5 hairline-b bg-surface-inset">
        <div className="col-span-1">Date</div>
        <div className="col-span-1">Price</div>
        <div className="col-span-2">Structure</div>
        <div className="col-span-3">Read</div>
        <div className="col-span-2">Plan</div>
        <div className="col-span-2">Result</div>
        <div className="col-span-1">Bias</div>
      </div>

      {logs.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <span className="caps-sm text-faint">No entries yet — add your first trade log above</span>
        </div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className={`grid grid-cols-12 px-5 py-3 text-[12px] font-sans-body items-center ${i < logs.length - 1 ? "hairline-b" : ""} hover:bg-surface-2 transition-colors`}>
            <div className="col-span-1 font-mono-data text-paper-2">{log.date}</div>
            <div className="col-span-1 font-mono-data text-faint text-[10px]">{(log as any).btc_price ?? "—"}</div>
            <div className="col-span-2 text-paper">{log.structure}</div>
            <div className="col-span-3 text-paper-2 italic">{log.read}</div>
            <div className="col-span-2 text-paper-2">{log.plan}</div>
            <div className={`col-span-2 font-mono-data ${log.result?.startsWith("+") ? "text-neutral-sage" : log.result?.startsWith("-") ? "text-alert-extreme" : "text-muted"}`}>{log.result ?? "Open"}</div>
            <div className="col-span-1 caps-sm text-faint">{log.bias ?? "—"}</div>
          </div>
        ))
      )}

      <div className="px-5 py-4 hairline-t flex items-center justify-between bg-surface-inset">
        <div className="flex items-center gap-2 text-faint">
          <FileText size={12} />
          <span className="caps-sm">Post-trade SEM review · run weekly with Claude</span>
        </div>
        <button className="caps-sm text-amber-sand hover:underline flex items-center gap-1">
          Run review <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
};

const Header = ({ price, change24h }: { price: string; change24h: string }) => (
  <header className="hairline-b">
    <div className="max-w-[1440px] mx-auto px-8 py-5 flex items-center justify-between">
      <div className="flex items-baseline gap-6">
        <h1 className="font-display text-paper text-[30px] leading-none tracking-tight">
          BTC<span className="font-display-italic text-amber-sand"> · </span><span className="font-display-italic">Decision</span> Desk
        </h1>
        <span className="caps-sm text-faint hidden md:inline">AI organizes · humans decide</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="caps-sm text-faint">Spot</div>
          <div className="font-mono-data text-paper text-[15px]">
            {price} <span className={`text-[12px] ${change24h.startsWith("+") ? "text-neutral-sage" : "text-alert-extreme"}`}>{change24h}</span>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className="caps-sm text-faint">Snapshot</div>
          <div className="font-mono-data text-paper-2 text-[12px]">
            {new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })}
          </div>
        </div>
        <div className="flex items-center gap-1.5 pl-4 border-l hairline">
          <Circle size={7} fill="#8DA078" stroke="none" className="pulse-dot" />
          <span className="caps-sm text-neutral-sage">Live</span>
        </div>
      </div>
    </div>
  </header>
);

const SectionLabel = ({ numeral, title, subtitle }: { numeral: string; title: string; subtitle?: string }) => (
  <div className="flex items-end justify-between mb-5 hairline-b pb-3">
    <div className="flex items-baseline gap-4">
      <span className="font-display-italic text-amber-sand text-[28px] leading-none">{numeral}</span>
      <h2 className="font-display text-paper text-[26px] leading-none">{title}</h2>
    </div>
    {subtitle && <span className="caps-sm text-faint">{subtitle}</span>}
  </div>
);

export default function BTCDecisionDashboard() {
  const [judgment, setJudgment] = useState<JudgmentState>({ read: "", supports: "", contradicts: "", invalidates: "", plan: "", risk: null });
  const [logs, setLogs] = useState<TradeLog[]>(INITIAL_TRADE_LOGS);
  const [now, setNow] = useState(new Date());
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState<{price: string; change_24h: string}>({ price: "—", change_24h: "—" });
  const [summary, setSummary] = useState<{
    structure: string;
    extreme_count: number;
    notable_count: number;
    active_alerts: Array<{metric: string; alert: string; level: string; current: string}>;
  } | null>(null);
  const [news, setNews] = useState<Array<{ title: string; source: string; time: string; tag: string; url: string }>>([]);
  const [causal, setCausal] = useState<{ chain: Array<{label: string; state: string; weight: string}>; contradiction: string } | null>(null);
  const [executions, setExecutions] = useState<any[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);

        const metricsRes = await fetch(`${API}/metrics`);
        if (!metricsRes.ok) throw new Error(`Backend returned ${metricsRes.status}`);
        const data = await metricsRes.json();

        await new Promise(r => setTimeout(r, 1000));

        const [priceRes, summaryRes] = await Promise.all([
          fetch(`${API}/price`),
          fetch(`${API}/summary`),
        ]);

        const newsRes  = await fetch(`${API}/news`);
        const newsData = await newsRes.json();
        if (newsData.items) setNews(newsData.items);

        const causalRes  = await fetch(`${API}/causal`);
        const causalData = await causalRes.json();
        setCausal(causalData);

        const priceData   = await priceRes.json();
        const summaryData = await summaryRes.json();

        const tradeLogRes  = await fetch(`${API}/trade-log`);
        const tradeLogData = await tradeLogRes.json();
        if (Array.isArray(tradeLogData) && tradeLogData.length > 0) {
          setLogs(tradeLogData);
        }

        const execRes  = await fetch(`${API}/trade-execution`);
        const execData = await execRes.json();
        if (Array.isArray(execData)) setExecutions(execData);

        const transformed: Metric[] = Object.entries(data).map(([id, raw]) => {
          const m = raw as Record<string, unknown>;
          return {
            id,
            name:        m.name as string,
            category:    m.category as string,
            current:     m.current as string,
            currentDir:  m.current_dir as "up" | "down" | "flat",
            d7:          m.d7 as string,
            vs30d:       m.vs30d as string,
            percentile:  m.percentile as number,
            alert:       m.alert as string,
            alertLevel:  m.alert_level as "extreme" | "notable" | "neutral" | "none",
            pattern:     m.pattern as string,
            spark:       (m.spark as number[]) ?? [],
            updated:     "just now",
            _is_override: (m._is_override ?? false) as boolean,
          };
        });

        setMetrics(transformed);
        setPrice(priceData);
        setSummary(summaryData);

      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    const id = setInterval(fetchAll, 60000);
    return () => clearInterval(id);
  }, []);

  const alertCounts = useMemo(() => {
    const extreme = metrics.filter((m) => m.alertLevel === "extreme").length;
    const notable = metrics.filter((m) => m.alertLevel === "notable").length;
    return { extreme, notable };
  }, [metrics]);

  return (
    <>
      <style>{FONT_LINK}</style>
      <div className="min-h-screen bg-ink text-paper font-sans-body grid-bg">
        <Header price={price.price} change24h={price.change_24h} />
        <main className="max-w-[1440px] mx-auto px-8 py-8 space-y-10">
          <div className="flex flex-wrap items-center gap-6 bg-surface border hairline px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-amber-sand" />
              <span className="caps-sm text-faint">Market state</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display-italic text-paper text-[18px]">
                {summary?.structure ?? "Calculating…"}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#C4614A" }} />
                <span className="caps-sm text-alert-extreme">{summary?.extreme_count ?? alertCounts.extreme} Extreme</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#C89A3F" }} />
                <span className="caps-sm text-alert-notable">{summary?.notable_count ?? alertCounts.notable} Notable</span>
              </div>
              <div className="flex items-center gap-2 pl-5 border-l hairline">
                <Clock size={11} className="text-faint" />
                <span className="caps-sm text-faint">{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>

          <section>
            <TradingViewEmbed />
          </section>

          <section>
            <SectionLabel
              numeral="I"
              title="Market state snapshot"
              subtitle={loading ? "Fetching…" : error ? "Backend unreachable" : "Benchmark · alert · pattern · no judgment"}
            />
            {error && (
              <div className="border border-extreme bg-extreme-10 p-5 mb-3">
                <div className="caps-sm text-alert-extreme mb-2 flex items-center gap-1.5">
                  <AlertCircle size={10} /> Backend error
                </div>
                <p className="font-sans-body text-paper-2 text-[12px] leading-relaxed">
                  Could not reach <span className="font-mono-data">{API}/metrics</span> — {error}.
                  Check that the FastAPI server is running (<span className="font-mono-data">uvicorn main:app --reload --port 8000</span>).
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {loading && metrics.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-surface border hairline p-4 h-[260px] fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="caps-sm text-faint">Loading…</div>
                  </div>
                ))
              ) : (
                metrics.map((m, i) => <MetricCard key={m.id} metric={m} index={i} />)
              )}
            </div>
          </section>

          <section>
            <SectionLabel numeral="II–IV" title="Events · causal · judgment" subtitle="Read from left. Decide on the right." />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-3"><TopEvents items={news} /></div>
              <div className="lg:col-span-5"><CausalAnalysis data={causal} /></div>
              <div className="lg:col-span-4"><JudgmentPanel state={judgment} setState={setJudgment} /></div>
            </div>
          </section>

          <section>
            <SectionLabel numeral="VI" title="Screenshot override" subtitle="Paste Claude extraction · Exchange Netflow · LTH Supply" />
            <ManualOverridePanel />
          </section>

          <section>
            <SectionLabel numeral="VII" title="Trade execution" subtitle="Quantitative log · slippage · volume benchmarks · SEM feed" />
            <TradeExecutionPanel
              executions={executions}
              onAdd={() => {
                fetch(`${API}/trade-execution`)
                  .then(r => r.json())
                  .then(data => { if (Array.isArray(data)) setExecutions(data); });
              }}
            />
          </section>

          <section>
            <SectionLabel numeral="VIII" title="Trade Log, Review & notes" subtitle="Trade log · post-trade SEM review" />
            <TradeLogReview
              logs={logs}
              onAdd={() => {
                fetch(`${API}/trade-log`)
                  .then(r => r.json())
                  .then(data => { if (Array.isArray(data)) setLogs(data); });
              }}
            />
          </section>

          <footer className="pt-8 hairline-t flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-muted">
            <div className="caps-sm text-faint">Build · 0 → 1 · mock data · wire APIs in step 7</div>
            <div className="caps-sm text-faint">AI organizes reality. Humans make decisions. SEM improves how humans decide.</div>
          </footer>
        </main>
      </div>
    </>
  );
}
