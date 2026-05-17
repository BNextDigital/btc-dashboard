export default function TradingViewCME() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#22231F] bg-[#131315]">
      <iframe
        src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_cme&symbol=CME%3ABTC1%21&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=131315&studies=%5B%5D&theme=dark&style=1&timezone=America%2FNew_York&withdateranges=1&hideideas=1"
        style={{ width: "100%", height: "500px" }}
        title="CME Bitcoin Futures"
      />
    </div>
  );
}
