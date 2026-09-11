"use client";

import { useState } from "react";

const METRIC_TOOLTIPS: Record<string, { title: string; body: string }> = {
  exchange_netflow: {
    title: "Exchange Netflow",
    body: "Net BTC flow between wallets and exchanges. Negative = BTC leaving exchanges — accumulation signal, reduced sell pressure. Positive = BTC entering exchanges — potential sell pressure. Benchmarked against the 30-day average to identify structural extremes.",
  },
  etf_flow: {
    title: "ETF Flow",
    body: "Daily net inflows and outflows across US Bitcoin Spot ETFs (BlackRock IBIT, Fidelity FBTC, etc.). Represents institutional capital via regulated vehicles. Only updates on US trading days after 4pm EST market close — weekends and holidays show the last complete trading day.",
  },
  funding: {
    title: "Funding Rate",
    body: "The periodic rate paid between long and short positions on perpetual futures. High positive funding = longs paying shorts = elevated leverage and bullish crowding. Extreme readings historically precede sharp corrections. Resets every 8 hours on most exchanges.",
  },
  open_interest: {
    title: "Open Interest",
    body: "Total USD value of all open futures and perpetual contracts. Rising OI = new leveraged positions opening. Falling OI = deleveraging. OI rising with price = confirmed momentum. OI rising with flat price = leverage building without directional conviction.",
  },
  volume: {
    title: "Volume",
    body: "Current trading volume relative to the 30-day average. High volume confirms price moves. High volume + flat price = absorption (buyers absorbing supply). High volume + falling price = distribution. Low volume during a rally indicates weak conviction.",
  },
  price_move: {
    title: "Price Move",
    body: "Daily and weekly price change benchmarked against the 30-day average. Puts current volatility in historical context — a 5% move reads differently during a historically calm period vs a volatile one. Watch for large moves without on-chain or volume confirmation.",
  },
  realized_cap: {
    title: "Realized Cap",
    body: "The aggregate cost basis of all BTC on-chain — each coin valued at the price it last moved, not the current price. Rising realized cap = new capital entering at current prices. Falling = capital leaving, or coins moving at a loss. A slow-moving but structurally important indicator.",
  },
  lth_supply: {
    title: "LTH Supply",
    body: "Bitcoin held by wallets inactive for 155+ days. Rising supply = long-term holders accumulating (structurally bullish). Falling supply = LTHs distributing. Historically peaks near market tops and troughs near bottoms — one of the most reliable cycle indicators.",
  },
  cme_basis: {
    title: "CME Basis (Annualized)",
    body: "The annualized premium of CME Bitcoin futures over spot price. Institutions run cash-and-carry trades — buying spot, shorting futures — to capture this spread risk-free. High basis = carry is attractive = strong institutional demand. Compressed or negative basis = institutional demand has collapsed.",
  },
  stablecoin_supply: {
    title: "Stablecoin Supply",
    body: "Combined circulating supply of USDT and USDC — the primary dry powder available to deploy into crypto. Rising supply = new capital being minted and staged (bullish liquidity backdrop). Falling supply = capital deploying into risk assets or exiting crypto entirely.",
  },
  btc_dominance: {
    title: "BTC Dominance",
    body: "Bitcoin's share of the total cryptocurrency market cap in USD. Rising = capital consolidating in BTC, risk-off rotation. Falling = capital rotating into altcoins, risk-on. Historically, dominance above 60% suppresses altcoin seasons; below 50% signals active rotation away from BTC.",
  },
};

export default function MetricTooltip({ metricId }: { metricId: string }) {
  const [visible, setVisible] = useState(false);
  const content = METRIC_TOOLTIPS[metricId];

  if (!content) return null;

  return (
    <div
      className="relative inline-flex flex-shrink-0"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <button
        type="button"
        aria-label={`About ${content.title}`}
        aria-expanded={visible}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="flex items-center justify-center w-[13px] h-[13px] rounded-full border border-[#22231F] text-[#55534B] hover:text-[#B8B5AA] hover:border-[#55534B] transition-colors leading-none text-[8px]"
      >
        ?
      </button>
      {visible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none w-[220px]"
        >
          <div className="bg-[#0E0E10] border border-[#22231F] p-3 shadow-2xl">
            <div className="caps-sm text-amber-sand mb-1.5">
              {content.title}
            </div>
            <p className="font-sans-body text-paper-2 leading-relaxed text-[11px]">
              {content.body}
            </p>
          </div>
          <div className="flex justify-center">
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "5px solid #22231F",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
