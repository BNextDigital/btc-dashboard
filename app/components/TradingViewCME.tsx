export default function TradingViewCME() {
  return (
    <div className="overflow-hidden border border-[#22231F] bg-[#131315]" style={{ height: "500px" }}>
      <iframe
        src="https://sslcharts.investing.com/index.php?force_lang=56&pair_ID=961747"
        style={{ width: "100%", height: "100%" }}
        title="CME Bitcoin Futures"
      />
    </div>
  );
}
