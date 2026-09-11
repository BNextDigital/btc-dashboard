import type { PremiumData } from "@/app/types/btc-dashboard";

function PremiumCard({ data }: { data: PremiumData | null }) {
  if (!data) return null

  const bps          = data.premium_bps ?? 0
  const premiumUsd   = data.premium_usd
  const onshorePrice = data.onshore_price
  const offshorePrice= data.offshore_price
  const onLabel      = data.onshore_label  ?? "Coinbase"
  const offLabel     = data.offshore_label ?? "Binance"
  const alertLevel   = data.alert_level ?? "none"
  const unavailable  = premiumUsd === null || premiumUsd === undefined

  const alertColor =
    alertLevel === "extreme" ? "text-red-400 border-red-400/30 bg-red-400/5" :
    alertLevel === "notable" ? "text-amber-400 border-amber-400/30 bg-amber-400/5" :
    "text-zinc-500 border-zinc-700 bg-zinc-900"

  // Bar: centre = 0 premium. Range ±30 bps fills the bar.
  // Positive bps = bar extends right (onshore premium, amber)
  // Negative bps = bar extends left (offshore premium, blue)
  const MAX_BPS   = 30
  const clampedBps = Math.max(-MAX_BPS, Math.min(MAX_BPS, bps))
  const barPct    = Math.abs(clampedBps) / MAX_BPS * 50  // max 50% of half-bar
  const barRight  = clampedBps >= 0  // true = onshore premium (extends right from centre)

  return (
     <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
            North American Premium
          </div>
          <div className="text-xs text-zinc-600 mt-0.5">
            {onLabel} BTC/USD vs {offLabel} BTC/USDT
          </div>
        </div>
        {!unavailable && (
          <div className={`text-xs px-2 py-0.5 rounded border font-mono ${alertColor}`}>
            {bps >= 0 ? "+" : ""}{bps.toFixed(1)} bps
          </div>
        )}
      </div>

      {unavailable ? (
        <div className="text-zinc-600 text-sm font-mono">Data unavailable</div>
      ) : (
        <>
          {/* Price row */}
          <div className="flex justify-between text-xs font-mono mb-3">
            <div>
              <div className="text-zinc-500">{onLabel}</div>
              <div className="text-zinc-200">${onshorePrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="text-center">
              <div className="text-zinc-500">Premium</div>
              <div className={premiumUsd >= 0 ? "text-amber-400" : "text-blue-400"}>
                {premiumUsd >= 0 ? "+" : ""}${Math.abs(premiumUsd).toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-zinc-500">{offLabel}</div>
              <div className="text-zinc-200">${offshorePrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* Premium bar — centred, extends in direction of premium */}
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs text-zinc-600 font-mono w-16 text-right">offshore</span>
              <div className="flex-1 flex items-center h-3 bg-zinc-800 rounded-full overflow-hidden relative">
                {/* Centre marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600 z-10" />
                {/* Premium bar */}
                <div
                  className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-500"
                  style={{
                    width:  `${barPct}%`,
                    left:   barRight ? "50%" : `${50 - barPct}%`,
                    backgroundColor: barRight ? "#D9A84D" : "#60a5fa",
                  }}
                />
              </div>
              <span className="text-xs text-zinc-600 font-mono w-16">onshore</span>
            </div>
            <div className="text-center text-xs text-zinc-600 font-mono">
              ± {MAX_BPS} bps scale
            </div>
          </div>

          {/* Pattern / alert */}
          <div className="text-xs text-zinc-500 font-mono leading-relaxed">
            {data.pattern ?? "—"}
          </div>
        </>
      )}
    </div>
  )
}

export default PremiumCard;
