"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_STRESS_ASSUMPTIONS,
  liquidityStressInputs,
  pressureContext,
  stressScenario,
} from "@/app/lib/liquidity-stress";
import type { StressAssumptions } from "@/app/lib/liquidity-stress";
import type { PerpsPressureData, SpotDepthData } from "@/app/types/btc-dashboard";

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  const unit = value >= 1e9 ? 1e9 : 1e6;
  return `$${(value / unit).toFixed(1)}${unit === 1e9 ? "B" : "M"}`;
}
function coverage(value: number | null) {
  return value === null ? "No pressure" : `${value.toFixed(2)}×`;
}
function ComparisonBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  return <div className="space-y-1.5">
    <div className="flex justify-between gap-4 text-[11px]">
      <span className="text-paper-2">{label}</span>
      <span className="font-mono-data text-paper">{money(value)}</span>
    </div>
    <div className="h-2 bg-surface-inset overflow-hidden">
      <div className="h-full transition-all" style={{ width: `${max > 0 ? value / max * 100 : 0}%`, backgroundColor: color }} />
    </div>
  </div>;
}

export default function LiquidityStressCard({ depth, pressure }: {
  depth: SpotDepthData; pressure: PerpsPressureData | null;
}) {
  const [assumptions, setAssumptions] = useState<StressAssumptions>({ ...DEFAULT_STRESS_ASSUMPTIONS });
  const [side, setSide] = useState<"downside" | "upside">("downside");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, []);
  const inputs = liquidityStressInputs(depth, pressure, now);
  const scenario = inputs.ready ? stressScenario(inputs.oiUsd, inputs.bidUsd, inputs.askUsd, assumptions) : null;
  const context = pressureContext(pressure);
  const capacity = scenario ? side === "downside" ? scenario.retainedBidUsd : scenario.retainedAskUsd : 0;
  const modeledPressure = scenario?.pressureUsd ?? 0;
  const excess = Math.max(0, modeledPressure - capacity);
  const sampledSide = side === "downside" ? "bids" : "asks";
  const ratio = scenario ? side === "downside" ? scenario.bidCoverage : scenario.askCoverage : null;
  const update = (key: keyof StressAssumptions, value: number) =>
    setAssumptions((current) => ({ ...current, [key]: value }));
  const controls: { key: keyof StressAssumptions; label: string; max: number; step: number; note: string }[] = [
    { key: "unwindPct", label: "Open interest closing", max: 5, step: 0.25, note: "Hypothetical contract notional closed in one shock." },
    { key: "spotTransmissionPct", label: "Pressure reaching spot", max: 100, step: 5, note: "Assumed share transmitted to spot through hedging and arbitrage." },
    { key: "retainedDepthPct", label: "Quoted liquidity remaining", max: 100, step: 5, note: "Assumed share of the sampled orders that stays available." },
  ];

  return <div className="bg-surface border hairline p-5 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="caps-sm text-faint mb-1">Current leverage context · inferred</div>
        <h3 className="font-sans-body text-paper text-[16px] font-medium">
          {inputs.ready ? context.label : "Liquidity model unavailable"}
        </h3>
        <p className="text-[12px] text-paper-2 mt-2 max-w-3xl leading-relaxed">
          {inputs.ready ? context.explanation : inputs.reason}
        </p>
      </div>
      <span className="caps-sm text-amber-sand border hairline px-2 py-1">Exploratory model</span>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 hairline-t pt-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="caps-sm text-paper-2">Choose a shock</h4>
          <div className="flex gap-1" role="group" aria-label="Shock direction">
            {(["downside", "upside"] as const).map((option) =>
              <button key={option} type="button" aria-pressed={side === option} onClick={() => setSide(option)}
                className={`text-[11px] px-3 py-1.5 border hairline ${side === option ? "bg-surface-2 text-amber-sand" : "text-faint"}`}>
                {option === "downside" ? "Sell pressure" : "Buy pressure"}
              </button>)}
          </div>
        </div>
        {controls.map((control) => <label key={control.key} className="block space-y-1.5">
          <span className="flex justify-between gap-3 text-[12px] text-paper-2">
            <span>{control.label}</span>
            <span className="font-mono-data text-paper">{assumptions[control.key]}%</span>
          </span>
          <input type="range" min={0} max={control.max} step={control.step} value={assumptions[control.key]}
            aria-label={control.label} onChange={(event) => update(control.key, Number(event.target.value))}
            className="w-full accent-amber-sand" />
          <span className="block text-[10px] text-faint leading-relaxed">{control.note}</span>
        </label>)}
        <button type="button" className="text-[11px] text-amber-sand underline underline-offset-4"
          onClick={() => setAssumptions({ ...DEFAULT_STRESS_ASSUMPTIONS })}>Reset exploration defaults</button>
        <p className="text-[10px] text-faint leading-relaxed">Defaults are uncalibrated assumptions. The selected shock is independent of the current directional context.</p>
      </div>

      <div className="space-y-4">
        <div className="caps-sm text-paper-2">Scenario pressure vs sampled liquidity</div>
        {scenario ? <>
          <ComparisonBar label={`Sampled ${sampledSide} after liquidity withdrawal`} value={capacity}
            max={Math.max(capacity, modeledPressure)} color="#8A8780" />
          <ComparisonBar label={`Modeled spot ${side === "downside" ? "selling" : "buying"}`} value={modeledPressure}
            max={Math.max(capacity, modeledPressure)} color="#D9A84D" />
          <div className="border hairline p-3 space-y-2">
            <div className="text-paper text-[14px]">
              {modeledPressure === 0 ? "No spot pressure in this scenario"
                : excess > 0 ? "Scenario exceeds the sampled book" : "Scenario fits the retained sample"}
            </div>
            <p className="text-[12px] text-paper-2 leading-relaxed">
              {modeledPressure === 0 ? "Increase the closing share or spot transmission to test a shock."
                : excess > 0 ? `${money(excess)} would require liquidity beyond the retained sample. Wider market capacity is unknown.`
                : "The retained sample covers this shock under the chosen assumptions. Execution still depends on where and when orders remain available."}
            </p>
            <div className="text-[11px] font-mono-data text-faint">Sample coverage: {coverage(ratio)}</div>
          </div>
          <p className="text-[11px] text-faint leading-relaxed">
            {money(inputs.ready ? inputs.oiUsd : null)} open interest × {assumptions.unwindPct}% closing
            × {assumptions.spotTransmissionPct}% reaching spot = {money(modeledPressure)} scenario pressure.
          </p>
        </> : <div className="border hairline p-4 text-[12px] text-faint">{inputs.ready ? "Choose valid scenario assumptions." : inputs.reason}</div>}
      </div>
    </div>

    {scenario && inputs.ready && <div className="hairline-t pt-4 overflow-x-auto">
      <div className="caps-sm text-paper-2 mb-3">Sensitivity · same transmission and retained liquidity assumptions</div>
      <table className="w-full text-[11px] text-left">
        <thead className="text-faint"><tr><th className="pb-2 font-normal">OI closing</th>
          <th className="pb-2 font-normal">Modeled spot pressure</th>
          <th className="pb-2 font-normal">Bid sample coverage</th><th className="pb-2 font-normal">Ask sample coverage</th></tr></thead>
        <tbody className="font-mono-data text-paper-2">{[0.25, 0.5, 1, 2].map((unwindPct) => {
          const row = stressScenario(inputs.oiUsd, inputs.bidUsd, inputs.askUsd, { ...assumptions, unwindPct })!;
          return <tr key={unwindPct} className="hairline-t"><td className="py-2">{unwindPct}%</td>
            <td>{money(row.pressureUsd)}</td><td>{coverage(row.bidCoverage)}</td><td>{coverage(row.askCoverage)}</td></tr>;
        })}</tbody>
      </table>
    </div>}

    <div className="hairline-t pt-3 text-[10px] text-faint leading-relaxed space-y-1">
      <p>Sampled liquidity is a partial view across {depth.venues_online?.join(" · ") || "unavailable venues"}. Unobserved liquidity and replenishment are excluded. Figures use rounded source amounts.</p>
      <p>Coverage is a scenario comparison, not a probability, full-market capacity, or a price target. There is no fixed time horizon for the hypothetical shock.</p>
      <p>{inputs.ready ? `Oldest input: ${Math.floor(inputs.ageMinutes)}m ago · ` : ""}Collector cadence: approximately 15 minutes.</p>
    </div>
  </div>;
}
