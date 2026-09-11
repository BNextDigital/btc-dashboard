"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { getApiUrl } from "@/app/lib/dashboard-api";
import type { TradeExecution } from "@/app/types/btc-dashboard";

const TradeExecutionPanel = ({ executions, onAdd }: { executions: TradeExecution[]; onAdd: () => void }) => {
  const [showForm, setShowForm] = useState(false); const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({ planned_entry: "", actual_entry: "", size_btc: "", max_drawdown_pct: "", current_volume: "", market_state: "" });
  const planned = parseFloat(form.planned_entry) || 0; const actual = parseFloat(form.actual_entry) || 0; const drawdownPct = parseFloat(form.max_drawdown_pct) || 0; const volume = parseFloat(form.current_volume) || 0;
  const slippage = actual && planned ? (actual - planned) : null; const maxDrawdownPrice = actual && drawdownPct ? actual * (1 - drawdownPct / 100) : null;
  const vol05x = volume ? volume * 0.5 : null; const vol15x = volume ? volume * 1.5 : null; const vol20x = volume ? volume * 2.0 : null;
  const fmt = (n: number | null, d = 2) => n !== null ? n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";
  const handleSave = async () => {
    if (!form.planned_entry || !form.actual_entry || !form.size_btc || !form.max_drawdown_pct || !form.current_volume || !form.market_state) { setSaveError("All fields are required."); return; }
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(getApiUrl("/trade-execution"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planned_entry: parseFloat(form.planned_entry), actual_entry: parseFloat(form.actual_entry), size_btc: parseFloat(form.size_btc), max_drawdown_pct: parseFloat(form.max_drawdown_pct), current_volume: parseFloat(form.current_volume), market_state: form.market_state }) });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setShowForm(false); setForm({ planned_entry: "", actual_entry: "", size_btc: "", max_drawdown_pct: "", current_volume: "", market_state: "" }); onAdd();
    } catch (e) { setSaveError(e instanceof Error ? e.message : "Save failed"); } finally { setSaving(false); }
  };
  const marketStates = ["Green", "Yellow", "Red"]; const stateColors: Record<string, string> = { Green: "text-neutral-sage border-sage bg-sage-10", Yellow: "text-alert-notable border-notable bg-notable-10", Red: "text-alert-extreme border-extreme bg-extreme-10" };
  return (
    <div className="bg-surface border hairline">
      <div className="flex items-center justify-between px-5 py-4 hairline-b"><div><div className="caps-sm text-faint">VI</div><h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Trade execution</h2></div><div className="flex items-center gap-4"><span className="caps-sm text-faint">{executions.length} entries</span><button onClick={() => { setShowForm(!showForm); setSaveError(null); }} className={`caps-sm px-3 py-1.5 border transition-colors ${showForm ? "border-amber-sand bg-amber-sand-10 text-amber-sand" : "hairline text-muted hover:text-paper hover:border-amber-sand"}`}>{showForm ? "Cancel" : "Add trade"}</button></div></div>
      {showForm && (
        <div className="px-5 py-5 hairline-b bg-surface-2">
          <div className="caps-sm text-amber-sand mb-4">New execution entry</div>
          {saveError && <div className="bg-extreme-10 border border-extreme px-3 py-2 mb-4"><span className="caps-sm text-alert-extreme">{saveError}</span></div>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
            <div><label className="caps-sm text-faint block mb-1.5">Planned entry price (USD)</label><input type="number" value={form.planned_entry} onChange={(e) => setForm((s) => ({ ...s, planned_entry: e.target.value }))} placeholder="e.g. 76000" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" /></div>
            <div><label className="caps-sm text-faint block mb-1.5">Actual entry / fill price (USD)</label><input type="number" value={form.actual_entry} onChange={(e) => setForm((s) => ({ ...s, actual_entry: e.target.value }))} placeholder="e.g. 76120" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" /></div>
            <div><label className="caps-sm text-faint block mb-1.5">Slippage <span className="text-amber-sand">calculated</span></label><div className={`w-full bg-surface-inset border hairline px-2.5 py-2 text-[12px] font-mono-data ${slippage === null ? "text-faint" : slippage > 0 ? "text-alert-extreme" : slippage < 0 ? "text-neutral-sage" : "text-muted"}`}>{slippage !== null ? `${slippage > 0 ? "+" : ""}$${slippage.toFixed(2)}` : "—"}</div></div>
            <div><label className="caps-sm text-faint block mb-1.5">Current size (BTC)</label><input type="number" value={form.size_btc} onChange={(e) => setForm((s) => ({ ...s, size_btc: e.target.value }))} placeholder="e.g. 0.5" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" /></div>
            <div><label className="caps-sm text-faint block mb-1.5">Max drawdown / stop loss (%)</label><input type="number" value={form.max_drawdown_pct} onChange={(e) => setForm((s) => ({ ...s, max_drawdown_pct: e.target.value }))} placeholder="e.g. 3" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" /></div>
            <div><label className="caps-sm text-faint block mb-1.5">Stop price <span className="text-amber-sand">calculated</span></label><div className="w-full bg-surface-inset border hairline px-2.5 py-2 text-[12px] font-mono-data text-alert-extreme">{maxDrawdownPrice !== null ? `$${maxDrawdownPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</div></div>
            <div><label className="caps-sm text-faint block mb-1.5">Current volume (BTC)</label><input type="number" value={form.current_volume} onChange={(e) => setForm((s) => ({ ...s, current_volume: e.target.value }))} placeholder="e.g. 1200" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" /></div>
            <div><label className="caps-sm text-faint block mb-1.5">Market state</label><div className="flex gap-2">{marketStates.map((s) => (<button key={s} onClick={() => setForm((f) => ({ ...f, market_state: s }))} className={`caps-sm px-3 py-2 border flex-1 transition-colors ${form.market_state === s ? stateColors[s] : "hairline text-muted hover:text-paper"}`}>{s}</button>))}</div></div>
          </div>
          {volume > 0 && (<div className="hairline-t pt-4 mb-5"><div className="caps-sm text-faint mb-3">Volume benchmarks <span className="text-amber-sand">calculated</span></div><div className="grid grid-cols-3 gap-3"><div className="bg-surface-inset border hairline p-3"><div className="caps-sm text-faint mb-1">0.5x - Slowdown</div><div className="font-mono-data text-paper-2 text-[14px]">{fmt(vol05x)} BTC</div></div><div className="bg-surface-inset border hairline p-3"><div className="caps-sm text-faint mb-1">1.5x - Interest</div><div className="font-mono-data text-amber-sand text-[14px]">{fmt(vol15x)} BTC</div></div><div className="bg-surface-inset border hairline p-3"><div className="caps-sm text-faint mb-1">2.0x - Significant</div><div className="font-mono-data text-alert-notable text-[14px]">{fmt(vol20x)} BTC</div></div></div></div>)}
          <div className="flex justify-end gap-3"><button onClick={() => setShowForm(false)} className="caps-sm px-3 py-1.5 border hairline text-muted hover:text-paper transition-colors">Cancel</button><button onClick={handleSave} disabled={saving} className={`caps-sm px-3 py-1.5 border transition-colors ${saving ? "border-faint text-faint cursor-not-allowed" : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"}`}>{saving ? "Saving..." : "Save execution"}</button></div>
        </div>
      )}
      <div className="grid grid-cols-12 caps-sm text-faint px-5 py-2.5 hairline-b bg-surface-inset"><div className="col-span-1">Date</div><div className="col-span-1">State</div><div className="col-span-2">Planned</div><div className="col-span-2">Actual</div><div className="col-span-1">Slip</div><div className="col-span-1">Size</div><div className="col-span-1">Stop%</div><div className="col-span-2">Stop $</div><div className="col-span-1">Vol BTC</div></div>
      {executions.length === 0 ? <div className="px-5 py-8 text-center"><span className="caps-sm text-faint">No execution entries yet - add your first trade above</span></div> : executions.map((e, i) => { const sc = e.market_state === "Green" ? "text-neutral-sage" : e.market_state === "Yellow" ? "text-alert-notable" : e.market_state === "Red" ? "text-alert-extreme" : "text-muted"; return (<div key={i} className={`grid grid-cols-12 px-5 py-3 text-[12px] font-sans-body items-center ${i < executions.length - 1 ? "hairline-b" : ""} hover:bg-surface-2 transition-colors`}><div className="col-span-1 font-mono-data text-paper-2">{e.date}</div><div className={`col-span-1 caps-sm ${sc}`}>{e.market_state}</div><div className="col-span-2 font-mono-data text-paper-2">${e.planned_entry?.toLocaleString()}</div><div className="col-span-2 font-mono-data text-paper">${e.actual_entry?.toLocaleString()}</div><div className={`col-span-1 font-mono-data ${e.slippage > 0 ? "text-alert-extreme" : e.slippage < 0 ? "text-neutral-sage" : "text-muted"}`}>{e.slippage > 0 ? "+" : ""}{e.slippage?.toFixed(2)}</div><div className="col-span-1 font-mono-data text-paper-2">{e.size_btc} BTC</div><div className="col-span-1 font-mono-data text-muted">{e.max_drawdown_pct}%</div><div className="col-span-2 font-mono-data text-alert-extreme">${e.max_drawdown_price?.toLocaleString()}</div><div className="col-span-1 font-mono-data text-paper-2">{e.current_volume}</div></div>); })}
      <div className="px-5 py-4 hairline-t bg-surface-inset flex items-center justify-between"><div className="flex items-center gap-2 text-faint"><Activity size={12} /><span className="caps-sm">Quantitative execution log - feeds SEM analytics system</span></div><span className="caps-sm text-faint">Vol benchmarks usable as TradingView alert levels</span></div>
    </div>
  );
};

export default TradeExecutionPanel;
