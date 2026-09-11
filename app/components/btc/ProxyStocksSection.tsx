import SectionLabel from "@/app/components/dashboard/SectionLabel";
import {
  CorrelationMatrix,
  ProxyStockCard,
} from "@/app/components/btc/ProxyStocksPanel";
import type { ProxyStock } from "@/app/types/btc-dashboard";

export default function ProxyStocksSection({
  stocks,
}: {
  stocks: ProxyStock[];
}) {
  if (stocks.length === 0) return null;

  return (
    <section>
      <SectionLabel
        numeral="XIIi"
        title="Crypto Proxy Stocks"
        subtitle="S&P 500 crypto-exposed · BTC correlation · lead/lag · yFinance"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
        {stocks.map((stock) => (
          <ProxyStockCard key={stock.ticker} stock={stock} />
        ))}
      </div>
      <CorrelationMatrix stocks={stocks} />
    </section>
  );
}
