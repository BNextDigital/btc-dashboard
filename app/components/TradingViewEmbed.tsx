"use client";

export default function TradingViewEmbed() {
  return (
    <div className="bg-surface border hairline overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 hairline-b">
        <div className="flex items-baseline gap-4">
          <span className="font-display-italic text-amber-sand text-[20px] leading-none">§</span>
          <h2 className="font-display text-paper text-[20px] leading-none">BTC price structure</h2>
        </div>
        <span className="caps-sm text-faint">BINANCE · BTCUSDT · 1D</span>
      </div>
      <iframe
        src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=BINANCE%3ABTCUSDT&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=0B0B0C&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1"
        style={{ width: "100%", height: "520px", border: "none", display: "block" }}
        title="BTC price chart"
      />
    </div>
  );
}