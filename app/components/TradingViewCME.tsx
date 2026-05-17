export default function TradingViewCME() {
  return (
    <div
      className="overflow-hidden border border-[#22231F] bg-[#131315]"
      style={{ height: "500px" }}
    >
      <iframe
        src="https://sslcharts.investing.com/index.php?force_lang=1&pair_ID=1055949"
        style={{ width: "100%", height: "100%", border: "none" }}
        title="CME Bitcoin Futures"
      />
    </div>
  );
}
