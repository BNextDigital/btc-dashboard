"use client";

/**
 * app/components/TradingViewEmbed.tsx — TradingView chart embed
 *
 * Accepts props so the same component works across BTC, ETH, SOL, and
 * any future pages. All defaults are BTC so the existing BTC page import
 * requires no changes:
 *
 *   import TradingViewEmbed from "./components/TradingViewEmbed";
 *   <TradingViewEmbed />                          ← BTC (unchanged)
 *   <TradingViewEmbed
 *     symbol="BINANCE:ETHUSDT"
 *     label="ETH price structure"
 *     subtitle="BINANCE · ETHUSDT · 1D"
 *   />                                            ← ETH
 *   <TradingViewEmbed
 *     symbol="BINANCE:SOLUSDT"
 *     label="SOL price structure"
 *     subtitle="BINANCE · SOLUSDT · 1D"
 *   />                                            ← SOL
 *
 * Styling uses inline styles for typography so the component is not
 * dependent on the custom CSS classes (bg-surface, hairline, etc.) that
 * are injected only by app/page.tsx's <style> block.
 *
 * Note: TradingView free embed supports exchange symbols (BINANCE:ETHUSDT).
 * CME continuous contracts (CME:ETH1!) require a paid TradingView plan.
 */

interface Props {
  symbol?:   string;   // TradingView symbol string
  label?:    string;   // Section heading text
  subtitle?: string;   // Right-side label (exchange · pair · interval)
  height?:   number;   // Chart height in px
}

export default function TradingViewEmbed({
  symbol   = "BINANCE:BTCUSDT",
  label    = "BTC price structure",
  subtitle = "BINANCE · BTCUSDT · 1D",
  height   = 520,
}: Props) {
  const src = [
    "https://s.tradingview.com/widgetembed/",
    "?frameElementId=tradingview_widget",
    `&symbol=${encodeURIComponent(symbol)}`,
    "&interval=D",
    "&hidesidetoolbar=1",
    "&symboledit=1",
    "&saveimage=0",
    "&toolbarbg=0B0B0C",
    "&studies=%5B%5D",
    "&theme=dark",
    "&style=1",
    "&timezone=Etc%2FUTC",
    "&withdateranges=1",
    "&hideideas=1",
  ].join("");

  return (
    <div style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        className="flex items-center justify-between px-5 py-3"
      >
        <div className="flex items-baseline gap-4">
          <span
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle:  "italic",
              color:      "#D9A84D",
              fontSize:   20,
              lineHeight: 1,
            }}
          >
            §
          </span>
          <h2
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              color:      "#E8E6E0",
              fontSize:   20,
              lineHeight: 1,
              fontWeight: 400,
            }}
          >
            {label}
          </h2>
        </div>
        <span
          style={{
            fontFamily:    "'IBM Plex Mono', monospace",
            fontSize:      10,
            fontWeight:    600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color:         "#3A3A4A",
          }}
        >
          {subtitle}
        </span>
      </div>

      {/* Chart */}
      <iframe
        src={src}
        style={{ width: "100%", height: `${height}px`, border: "none", display: "block" }}
        title={label}
        loading="lazy"
      />
    </div>
  );
}
