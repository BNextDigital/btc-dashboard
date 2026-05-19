"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Activity,
  Clock,
  FileText,
  ChevronRight,
  Circle,
  Minus,
} from "lucide-react";
import TradingViewEmbed from "./components/TradingViewEmbed";
import TradingViewCME from "./components/TradingViewCME";

const FONT_LINK = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
  .font-display { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
  .font-display-italic { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; }
  .font-sans-body { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
  .font-mono-data { font-family: 'IBM Plex Mono', 'Courier New', monospace; font-feature-settings: 'tnum'; }
  .grid-bg { background-image: linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 48px 48px; }
  .hairline { border-color: #22231F; }
  .hairline-b { border-bottom: 1px solid #22231F; }
  .hairline-t { border-top: 1px solid #22231F; }
  .caps-sm { letter-spacing: 0.22em; text-transform: uppercase; font-size: 9px; font-weight: 500; }
  .bg-ink { background-color: #0B0B0C; }
  .bg-surface { background-color: #131315; }
  .bg-surface-2 { background-color: #17171A; }
  .bg-surface-inset { background-color: #0E0E10; }
  .text-paper { color: #E8E4D9; }
  .text-paper-2 { color: #B8B5AA; }
  .text-muted { color: #8A8780; }
  .text-faint { color: #55534B; }
  .text-amber-sand { color: #D9A84D; }
  .text-alert-extreme { color: #C4614A; }
  .text-alert-notable { color: #C89A3F; }
  .text-neutral-sage { color: #8DA078; }
  .bg-amber-sand-10 { background-color: rgba(217, 168, 77, 0.10); }
  .bg-extreme-10 { background-color: rgba(196, 97, 74, 0.10); }
  .bg-notable-10 { background-color: rgba(200, 154, 63, 0.10); }
  .bg-sage-10 { background-color: rgba(141, 160, 120, 0.10); }
  .border-amber-sand { border-color: rgba(217, 168, 77, 0.35); }
  .border-extreme { border-color: rgba(196, 97, 74, 0.35); }
  .border-notable { border-color: rgba(200, 154, 63, 0.35); }
  .border-sage { border-color: rgba(141, 160, 120, 0.35); }
  .pulse-dot { animation: pulse-soft 2.4s ease-in-out infinite; }
  @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .fade-in { animation: fade-in 0.6s ease-out both; }
  @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  textarea, input { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
  textarea:focus, input:focus, select:focus { outline: none; border-color: #D9A84D !important; }
`;

const API = process.env.NEXT_PUBLIC_API_URL;
const METRICS_CACHE_KEY = "btc_metrics_v1";

type Metric = {
  id: string; name: string; category: string; current: string;
  currentDir: "up" | "down" | "flat"; d7: string; vs30d: string;
  percentile: number; alert: string;
  alertLevel: "extreme" | "notable" | "neutral" | "none";
  pattern: string; spark: number[]; updated: string;
  _is_override: boolean; _is_historical?: boolean; _date?: string;
};

type StablecoinData = {
  name: string; category: string; current: string;
  current_dir: "up" | "down" | "flat"; d7: string; vs30d: string;
  percentile: number; alert: string;
  alert_level: "extreme" | "notable" | "neutral" | "none";
  pattern: string; spark: number[];
  usdt: string; usdc: string; usdt_share: number; usdc_share: number;
  usdt_7d: string; usdc_7d: string; _is_override?: boolean;
};

type DominanceData = {
  name: string; category: string; current: string;
  current_dir: "up" | "down" | "flat"; d7: string; vs30d: string;
  percentile: number; alert: string;
  alert_level: "extreme" | "notable" | "neutral" | "none";
  pattern: string; spark: number[];
  btc_cap: string; alt_cap: string; total_cap: string;
  btc_share: number; alt_share: number; dominance_pct: number;
  _is_override?: boolean;
};

type ProxyStock = {
  ticker: string; name: string; price: string;
  change_1d: string; change_7d: string;
  change_1d_raw: number; change_7d_raw: number;
  corr_7d: number; corr_30d: number; corr_90d: number;
  lead_lag_label: string; lead_lag_days: number;
  regime: string; spark: number[];
};

const INITIAL_TRADE_LOGS = [
  { date: "Oct 26", structure: "Range high test", read: "Absorption at $67.8k", plan: "Scale in, tight invalidation", result: "Pending", bias: "—" },
  { date: "Oct 21", structure: "Breakout retest", read: "Funding too hot", plan: "Skip", result: "Correct skip", bias: "Patience held" },
  { date: "Oct 14", structure: "Bull flag", read: "Clean structure", plan: "Enter, trail stop", result: "+4.2%", bias: "Trimmed early" },
];

const alertClasses = (level: string) => {
  switch (level) {
    case "extreme": return { text: "text-alert-extreme", bg: "bg-extreme-10", border: "border-extreme" };
    case "notable": return { text: "text-alert-notable", bg: "bg-notable-10", border: "border-notable" };
    case "neutral": return { text: "text-neutral-sage", bg: "bg-sage-10", border: "border-sage" };
    default: return { text: "text-muted", bg: "bg-surface-2", border: "hairline" };
  }
};

const METRIC_TOOLTIPS: Record<string, { title: string; body: string }> = {
  exchange_netflow: { title: "Exchange Netflow", body: "Net BTC flow between wallets and exchanges. Negative = BTC leaving exchanges — accumulation signal, reduced sell pressure. Positive = BTC entering exchanges — potential sell pressure. Benchmarked against the 30-day average to identify structural extremes." },
  etf_flow: { title: "ETF Flow", body: "Daily net inflows and outflows across US Bitcoin Spot ETFs (BlackRock IBIT, Fidelity FBTC, etc.). Represents institutional capital via regulated vehicles. Only updates on US trading days after 4pm EST market close — weekends and holidays show the last complete trading day." },
  funding: { title: "Funding Rate", body: "The periodic rate paid between long and short positions on perpetual futures. High positive funding = longs paying shorts = elevated leverage and bullish crowding. Extreme readings historically precede sharp corrections. Resets every 8 hours on most exchanges." },
  open_interest: { title: "Open Interest", body: "Total USD value of all open futures and perpetual contracts. Rising OI = new leveraged positions opening. Falling OI = deleveraging. OI rising with price = confirmed momentum. OI rising with flat price = leverage building without directional conviction." },
  volume: { title: "Volume", body: "Current trading volume relative to the 30-day average. High volume confirms price moves. High volume + flat price = absorption (buyers absorbing supply). High volume + falling price = distribution. Low volume during a rally indicates weak conviction." },
  price_move: { title: "Price Move", body: "Daily and weekly price change benchmarked against the 30-day average. Puts current volatility in historical context — a 5% move reads differently during a historically calm period vs a volatile one. Watch for large moves without on-chain or volume confirmation." },
  realized_cap: { title: "Realized Cap", body: "The aggregate cost basis of all BTC on-chain — each coin valued at the price it last moved, not the current price. Rising realized cap = new capital entering at current prices. Falling = capital leaving, or coins moving at a loss. A slow-moving but structurally important indicator." },
  lth_supply: { title: "LTH Supply", body: "Bitcoin held by wallets inactive for 155+ days. Rising supply = long-term holders accumulating (structurally bullish). Falling supply = LTHs distributing. Historically peaks near market tops and troughs near bottoms — one of the most reliable cycle indicators." },
  cme_basis: { title: "CME Basis (Annualized)", body: "The annualized premium of CME Bitcoin futures over spot price. Institutions run cash-and-carry trades — buying spot, shorting futures — to capture this spread risk-free. High basis = carry is attractive = strong institutional demand. Compressed or negative basis = institutional demand has collapsed." },
  stablecoin_supply: { title: "Stablecoin Supply", body: "Combined circulating supply of USDT and USDC — the primary dry powder available to deploy into crypto. Rising supply = new capital being minted and staged (bullish liquidity backdrop). Falling supply = capital deploying into risk assets or exiting crypto entirely." },
  btc_dominance: { title: "BTC Dominance", body: "Bitcoin's share of the total cryptocurrency market cap in USD. Rising = capital consolidating in BTC, risk-off rotation. Falling = capital rotating into altcoins, risk-on. Historically, dominance above 60% suppresses altcoin seasons; below 50% signals active rotation away from BTC." },
};

const MetricTooltip = ({ metricId }: { metricId: string }) => {
  const [visible, setVisible] = useState(false);
  const content = METRIC_TOOLTIPS[metricId];
  if (!content) return null;
  return (
    <div className="relative inline-flex flex-shrink-0" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <button className="flex items-center justify-center w-[13px] h-[13px] rounded-full border border-[#22231F] text-[#55534B] hover:text-[#B8B5AA] hover:border-[#55534B] transition-colors leading-none" style={{ fontSize: "8px" }}>?</button>
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none" style={{ width: "220px" }}>
          <div className="bg-[#0E0E10] border border-[#22231F] p-3 shadow-2xl">
            <div className="caps-sm text-amber-sand mb-1.5">{content.title}</div>
            <p className="font-sans-body text-paper-2 leading-relaxed" style={{ fontSize: "11px" }}>{content.body}</p>
          </div>
          <div className="flex justify-center"><div className="w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #22231F" }} /></div>
        </div>
      )}
    </div>
  );
};

// ── FIX: guard against empty/invalid spark arrays ─────────────────────────
const Sparkline = ({ data, dir = "up" }: { data: number[]; dir?: string }) => {
  if (!data || data.length < 2) return null;
  const w = 80, h = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  if (!isFinite(max) || !isFinite(min)) return null;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const stroke = dir === "down" ? "#C4614A" : "#D9A84D";
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" points={pts} opacity="0.85" />
    </svg>
  );
};

const PercentileBar = ({ value }: { value: number }) => {
  const color = value >= 90 ? "#C4614A" : value >= 75 ? "#C89A3F" : value <= 10 ? "#C4614A" : "#8A8780";
  return (
    <div className="w-full">
      <div className="h-[3px] w-full bg-surface-inset relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full" style={{ width: `${value}%`, backgroundColor: color, transition: "width 600ms ease-out" }} />
        <div className="absolute top-0 h-full w-px" style={{ left: "10%", backgroundColor: "#2F2F2F" }} />
        <div className="absolute top-0 h-full w-px" style={{ left: "75%", backgroundColor: "#2F2F2F" }} />
        <div className="absolute top-0 h-full w-px" style={{ left: "90%", backgroundColor: "#2F2F2F" }} />
      </div>
    </div>
  );
};

const MetricCard = ({ metric, index }: { metric: Metric; index: number }) => {
  const a = alertClasses(metric.alertLevel);
  const DirIcon = metric.currentDir === "up" ? TrendingUp : metric.currentDir === "down" ? TrendingDown : Minus;
  return (
    <div className="fade-in bg-surface border hairline p-4 flex flex-col gap-3 hover:bg-surface-2 transition-colors duration-300" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="caps-sm text-faint mb-1">{metric.category}</div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-sans-body text-paper text-[14px] font-medium leading-tight">{metric.name}</h3>
            <MetricTooltip metricId={metric.id} />
          </div>
        </div>
        <span className={`caps-sm px-2 py-[3px] border ${a.border} ${a.bg} ${a.text} whitespace-nowrap`}>{metric.alert}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono-data text-paper text-[22px] leading-none tracking-tight">{metric.current}</span>
          <DirIcon size={12} className={metric.currentDir === "up" ? "text-neutral-sage" : metric.currentDir === "down" ? "text-alert-extreme" : "text-muted"} />
        </div>
        <Sparkline data={metric.spark} dir={metric.currentDir} />
      </div>
      <div className="grid grid-cols-3 gap-2 hairline-t pt-3">
        <div><div className="caps-sm text-faint mb-1">7d</div><div className="font-mono-data text-paper-2 text-[12px]">{metric.d7}</div></div>
        <div><div className="caps-sm text-faint mb-1">vs 30d</div><div className="font-mono-data text-paper-2 text-[12px]">{metric.vs30d}</div></div>
        <div><div className="caps-sm text-faint mb-1">Pctl</div><div className="font-mono-data text-paper-2 text-[12px]">{metric.percentile}</div></div>
      </div>
      <div>
        <PercentileBar value={metric.percentile} />
        <div className="flex justify-between mt-1"><span className="caps-sm text-faint">p0</span><span className="caps-sm text-faint">p100</span></div>
      </div>
      <div className="flex items-center justify-between hairline-t pt-2">
        <span className="caps-sm text-faint">Pattern</span>
        <span className={`font-sans-body text-[11px] ${metric.pattern === "—" ? "text-faint" : "text-paper-2 italic"}`}>{metric.pattern}</span>
      </div>
      <div className="flex items-center gap-1 text-faint">
        <Circle size={5} fill={metric._is_historical ? "#378ADD" : metric._is_override ? "#D9A84D" : "#8DA078"} stroke="none" className={metric._is_historical ? "" : "pulse-dot"} />
        <span className="caps-sm">
          {metric._is_historical ? `Historical · ${metric._date}` : metric._is_override ? "Manual · screenshot" : `Updated ${metric.updated}`}
        </span>
      </div>
    </div>
  );
};

const StablecoinCard = ({ data }: { data: StablecoinData }) => {
  const a = alertClasses(data.alert_level);
  const DirIcon = data.current_dir === "up" ? TrendingUp : data.current_dir === "down" ? TrendingDown : Minus;
  return (
    <div className="bg-surface border hairline p-4 flex flex-col gap-3 hover:bg-surface-2 transition-colors duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="caps-sm text-faint mb-1">{data.category}</div>
          <h3 className="font-sans-body text-paper text-[14px] font-medium leading-tight">{data.name}</h3>
        </div>
        <span className={`caps-sm px-2 py-[3px] border ${a.border} ${a.bg} ${a.text} whitespace-nowrap`}>
          {data.alert === "—" ? "No alert" : data.alert.split("—")[0].trim()}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono-data text-paper text-[22px] leading-none tracking-tight">{data.current}</span>
          <DirIcon size={12} className={data.current_dir === "up" ? "text-neutral-sage" : data.current_dir === "down" ? "text-alert-extreme" : "text-muted"} />
        </div>
        <Sparkline data={data.spark} dir={data.current_dir} />
      </div>
      <div className="hairline-t pt-3 flex flex-col gap-2">
        <div className="flex h-[6px] w-full overflow-hidden rounded-sm gap-[2px]">
          <div className="h-full transition-all duration-700" style={{ width: `${data.usdt_share}%`, backgroundColor: "#26A17B" }} />
          <div className="h-full transition-all duration-700" style={{ width: `${data.usdc_share}%`, backgroundColor: "#2775CA" }} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5"><div className="w-[7px] h-[7px] rounded-sm flex-shrink-0" style={{ backgroundColor: "#26A17B" }} /><span className="caps-sm text-faint">USDT · {data.usdt_share}%</span></div>
            <div className="font-mono-data text-paper text-[13px]">{data.usdt}</div>
            <div className={`font-mono-data text-[11px] mt-0.5 ${data.usdt_7d.startsWith("+") ? "text-neutral-sage" : data.usdt_7d.startsWith("-") ? "text-alert-extreme" : "text-muted"}`}>{data.usdt_7d} 7d</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5"><div className="w-[7px] h-[7px] rounded-sm flex-shrink-0" style={{ backgroundColor: "#2775CA" }} /><span className="caps-sm text-faint">USDC · {data.usdc_share}%</span></div>
            <div className="font-mono-data text-paper text-[13px]">{data.usdc}</div>
            <div className={`font-mono-data text-[11px] mt-0.5 ${data.usdc_7d.startsWith("+") ? "text-neutral-sage" : data.usdc_7d.startsWith("-") ? "text-alert-extreme" : "text-muted"}`}>{data.usdc_7d} 7d</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 hairline-t pt-3">
        <div><div className="caps-sm text-faint mb-1">7d</div><div className="font-mono-data text-paper-2 text-[12px]">{data.d7}</div></div>
        <div><div className="caps-sm text-faint mb-1">vs 30d</div><div className="font-mono-data text-paper-2 text-[12px]">{data.vs30d}</div></div>
        <div><div className="caps-sm text-faint mb-1">Pctl</div><div className="font-mono-data text-paper-2 text-[12px]">{data.percentile}</div></div>
      </div>
      <div><PercentileBar value={data.percentile} /><div className="flex justify-between mt-1"><span className="caps-sm text-faint">p0</span><span className="caps-sm text-faint">p100</span></div></div>
      <div className="flex items-center justify-between hairline-t pt-2">
        <span className="caps-sm text-faint">Pattern</span>
        <span className="font-sans-body text-paper-2 text-[11px] italic text-right">{data.pattern}</span>
      </div>
      <div className="flex items-center gap-1 text-faint">
        <Circle size={5} fill={data._is_override ? "#D9A84D" : "#8DA078"} stroke="none" className="pulse-dot" />
        <span className="caps-sm">{data._is_override ? "Manual · screenshot" : "Live · CoinGecko"}</span>
      </div>
    </div>
  );
};

const DominanceCard = ({ data }: { data: DominanceData }) => {
  const a = alertClasses(data.alert_level);
  const DirIcon = data.current_dir === "up" ? TrendingUp : data.current_dir === "down" ? TrendingDown : Minus;
  return (
    <div className="bg-surface border hairline p-4 flex flex-col gap-3 hover:bg-surface-2 transition-colors duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="caps-sm text-faint mb-1">{data.category}</div>
          <h3 className="font-sans-body text-paper text-[14px] font-medium leading-tight">{data.name}</h3>
        </div>
        <span className={`caps-sm px-2 py-[3px] border ${a.border} ${a.bg} ${a.text} whitespace-nowrap`}>
          {data.alert === "—" ? "No alert" : data.alert.split("—")[0].trim()}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono-data text-paper text-[22px] leading-none tracking-tight">{data.current}</span>
          <DirIcon size={12} className={data.current_dir === "up" ? "text-neutral-sage" : data.current_dir === "down" ? "text-alert-extreme" : "text-muted"} />
        </div>
        <Sparkline data={data.spark} dir={data.current_dir} />
      </div>
      <div className="hairline-t pt-3 flex flex-col gap-2">
        <div className="flex h-[6px] w-full overflow-hidden rounded-sm gap-[2px]">
          <div className="h-full transition-all duration-700" style={{ width: `${data.btc_share}%`, backgroundColor: "#D9A84D" }} />
          <div className="h-full transition-all duration-700" style={{ width: `${data.alt_share}%`, backgroundColor: "#55534B" }} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5"><div className="w-[7px] h-[7px] rounded-sm flex-shrink-0" style={{ backgroundColor: "#D9A84D" }} /><span className="caps-sm text-faint">BTC · {data.btc_share}%</span></div>
            <div className="font-mono-data text-paper text-[13px]">{data.btc_cap}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5"><div className="w-[7px] h-[7px] rounded-sm flex-shrink-0" style={{ backgroundColor: "#55534B" }} /><span className="caps-sm text-faint">Alts · {data.alt_share}%</span></div>
            <div className="font-mono-data text-paper text-[13px]">{data.alt_cap}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="caps-sm text-faint">Total crypto market cap</span>
          <span className="font-mono-data text-paper-2 text-[12px]">{data.total_cap}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 hairline-t pt-3">
        <div><div className="caps-sm text-faint mb-1">7d</div><div className="font-mono-data text-paper-2 text-[12px]">{data.d7}</div></div>
        <div><div className="caps-sm text-faint mb-1">vs 30d</div><div className="font-mono-data text-paper-2 text-[12px]">{data.vs30d}</div></div>
        <div><div className="caps-sm text-faint mb-1">Pctl</div><div className="font-mono-data text-paper-2 text-[12px]">{data.percentile}</div></div>
      </div>
      <div><PercentileBar value={data.percentile} /><div className="flex justify-between mt-1"><span className="caps-sm text-faint">p0</span><span className="caps-sm text-faint">p100</span></div></div>
      <div className="flex items-center justify-between hairline-t pt-2">
        <span className="caps-sm text-faint">Pattern</span>
        <span className="font-sans-body text-paper-2 text-[11px] italic text-right">{data.pattern}</span>
      </div>
      <div className="flex items-center gap-1 text-faint">
        <Circle size={5} fill={data._is_override ? "#D9A84D" : "#8DA078"} stroke="none" className="pulse-dot" />
        <span className="caps-sm">{data._is_override ? "Manual · screenshot" : "Live · CoinGecko · /global"}</span>
      </div>
    </div>
  );
};

const corrColor = (c: number) => { const a = Math.abs(c); if (a >= 0.80) return "#8DA078"; if (a >= 0.65) return "#D9A84D"; if (a >= 0.45) return "#B8B5AA"; return "#55534B"; };
const regimeBadge = (regime: string) => {
  switch (regime) {
    case "Lockstep": return "border-[rgba(141,160,120,0.35)] bg-[rgba(141,160,120,0.10)] text-[#8DA078]";
    case "Strong": return "border-[rgba(217,168,77,0.35)] bg-[rgba(217,168,77,0.10)] text-[#D9A84D]";
    case "Moderate": return "border-[#22231F] bg-[#17171A] text-[#B8B5AA]";
    case "Weak": return "border-[#22231F] bg-[#17171A] text-[#55534B]";
    case "Decorrelated": return "border-[rgba(196,97,74,0.35)] bg-[rgba(196,97,74,0.10)] text-[#C4614A]";
    default: return "border-[#22231F] bg-[#17171A] text-[#55534B]";
  }
};

const CorrBar = ({ label, value }: { label: string; value: number }) => {
  const pct = Math.round(Math.abs(value) * 100);
  const color = corrColor(value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="caps-sm text-faint">{label}</span>
        <span className="font-mono-data text-[11px]" style={{ color }}>{value >= 0 ? "+" : ""}{value.toFixed(2)}</span>
      </div>
      <div className="h-[3px] w-full bg-surface-inset relative overflow-hidden rounded-sm">
        <div className="absolute top-0 left-0 h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

const ProxyStockCard = ({ stock }: { stock: ProxyStock }) => {
  const dir1d = stock.change_1d_raw >= 0 ? "up" : "down";
  const dir7d = stock.change_7d_raw >= 0 ? "up" : "down";
  return (
    <div className="bg-surface border hairline p-4 flex flex-col gap-3 hover:bg-surface-2 transition-colors duration-300">
      <div className="flex items-start justify-between gap-2">
        <div><div className="font-mono-data text-amber-sand text-[16px] font-medium leading-none">{stock.ticker}</div><div className="caps-sm text-faint mt-1">{stock.name}</div></div>
        <span className={`caps-sm px-2 py-[3px] border whitespace-nowrap ${regimeBadge(stock.regime)}`}>{stock.regime}</span>
      </div>
      <div>
        <div className="font-mono-data text-paper text-[20px] leading-none tracking-tight">{stock.price}</div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`font-mono-data text-[11px] ${dir1d === "up" ? "text-neutral-sage" : "text-alert-extreme"}`}>{stock.change_1d} 1d</span>
          <span className={`font-mono-data text-[11px] ${dir7d === "up" ? "text-neutral-sage" : "text-alert-extreme"}`}>{stock.change_7d} 7d</span>
        </div>
      </div>
      <Sparkline data={stock.spark} dir={stock.change_7d_raw >= 0 ? "up" : "down"} />
      <div className="hairline-t pt-3 flex flex-col gap-2">
        <CorrBar label="7d" value={stock.corr_7d} />
        <CorrBar label="30d" value={stock.corr_30d} />
        <CorrBar label="90d" value={stock.corr_90d} />
      </div>
      <div className="hairline-t pt-2 flex items-center justify-between">
        <span className="caps-sm text-faint">vs BTC</span>
        <span className="font-sans-body text-paper-2 text-[11px] italic">{stock.lead_lag_label}</span>
      </div>
    </div>
  );
};

const CorrelationMatrix = ({ stocks }: { stocks: ProxyStock[] }) => {
  const sorted = [...stocks].sort((a, b) => b.corr_30d - a.corr_30d);
  return (
    <div className="bg-surface border hairline">
      <div className="grid grid-cols-12 caps-sm text-faint px-5 py-2.5 hairline-b bg-surface-inset">
        <div className="col-span-3">Stock</div><div className="col-span-2 text-center">7d corr</div><div className="col-span-2 text-center">30d corr</div><div className="col-span-2 text-center">90d corr</div><div className="col-span-2 text-center">vs BTC</div><div className="col-span-1 text-center">Regime</div>
      </div>
      {sorted.map((s, i) => (
        <div key={s.ticker} className={`grid grid-cols-12 px-5 py-3 items-center text-[12px] ${i < sorted.length - 1 ? "hairline-b" : ""} hover:bg-surface-2 transition-colors`}>
          <div className="col-span-3"><span className="font-mono-data text-amber-sand text-[13px]">{s.ticker}</span><span className="font-sans-body text-faint text-[10px] ml-2">{s.name}</span></div>
          <div className="col-span-2 text-center font-mono-data" style={{ color: corrColor(s.corr_7d) }}>{s.corr_7d >= 0 ? "+" : ""}{s.corr_7d.toFixed(2)}</div>
          <div className="col-span-2 text-center font-mono-data" style={{ color: corrColor(s.corr_30d) }}>{s.corr_30d >= 0 ? "+" : ""}{s.corr_30d.toFixed(2)}</div>
          <div className="col-span-2 text-center font-mono-data" style={{ color: corrColor(s.corr_90d) }}>{s.corr_90d >= 0 ? "+" : ""}{s.corr_90d.toFixed(2)}</div>
          <div className="col-span-2 text-center font-sans-body text-paper-2 italic text-[11px]">{s.lead_lag_label}</div>
          <div className="col-span-1 text-center"><span className={`caps-sm px-1.5 py-[2px] border ${regimeBadge(s.regime)}`}>{s.regime[0]}</span></div>
        </div>
      ))}
      <div className="px-5 py-3 hairline-t bg-surface-inset flex items-center justify-between">
        <div className="caps-sm text-faint">Sorted by 30d correlation · cross-correlation window ±5 trading days</div>
        <div className="flex items-center gap-4">
          {[{ label: "Lockstep", color: "#8DA078" }, { label: "Strong", color: "#D9A84D" }, { label: "Moderate", color: "#B8B5AA" }, { label: "Decorrelated", color: "#C4614A" }].map(r => (
            <div key={r.label} className="flex items-center gap-1.5"><div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: r.color }} /><span className="caps-sm text-faint">{r.label}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TopEvents = ({ items }: { items: Array<{ title: string; source: string; time: string; tag: string; url: string }> }) => (
  <div className="bg-surface border hairline p-5 flex flex-col h-full">
    <div className="flex items-center justify-between hairline-b pb-3 mb-4">
      <div><div className="caps-sm text-faint">I</div><h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Top events</h2></div>
      <span className="caps-sm text-faint">Live</span>
    </div>
    <ul className="flex flex-col gap-5 overflow-y-auto scrollbar-thin" style={{ maxHeight: "320px" }}>
      {items.length === 0 ? <li className="caps-sm text-faint">Loading news…</li> : items.map((ev, i) => (
        <li key={i} className="flex gap-4">
          <span className="font-display-italic text-amber-sand text-[22px] leading-none mt-0.5">{String(i + 1).padStart(2, "0")}</span>
          <div className="flex-1 min-w-0">
            <a href={ev.url} target="_blank" rel="noopener noreferrer" className="font-sans-body text-paper text-[13px] leading-snug hover:text-amber-sand transition-colors">{ev.title}</a>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="caps-sm text-faint">{ev.tag}</span><span className="text-faint">·</span><span className="caps-sm text-faint">{ev.source}</span><span className="text-faint">·</span><span className="caps-sm text-faint">{ev.time}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
    <button className="caps-sm text-muted hover:text-paper transition-colors flex items-center mt-6 hairline-t pt-3 justify-between"><span>All events</span><ChevronRight size={12} /></button>
  </div>
);

const CausalAnalysis = ({ data }: { data: { chain: Array<{ label: string; state: string; weight: string }>; contradiction: string } | null }) => {
  const weightColor: Record<string, string> = { strong: "text-paper", moderate: "text-paper-2", extreme: "text-alert-extreme" };
  const chain = data?.chain ?? [{ label: "Loading…", state: "", weight: "moderate" }];
  const contradiction = data?.contradiction ?? "Calculating…";
  return (
    <div className="bg-surface border hairline p-5 flex flex-col h-full">
      <div className="flex items-center justify-between hairline-b pb-3 mb-4">
        <div><div className="caps-sm text-faint">II</div><h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Causal analysis</h2></div>
        <span className="caps-sm text-faint">Structural labels</span>
      </div>
      <div className="flex flex-col">
        {chain.map((c, i) => (
          <div key={c.label} className="flex items-start gap-4 py-2.5" style={{ borderTop: i > 0 ? "1px solid #1A1A1C" : "none" }}>
            <span className="font-mono-data caps-sm text-faint mt-0.5 w-5">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex-1"><div className="font-sans-body text-paper text-[13px]">{c.label}</div><div className={`font-sans-body text-[12px] italic ${weightColor[c.weight] ?? "text-paper-2"} mt-0.5`}>{c.state}</div></div>
            <span className={`caps-sm ${c.weight === "extreme" ? "text-alert-extreme" : c.weight === "strong" ? "text-amber-sand" : "text-muted"}`}>{c.weight}</span>
          </div>
        ))}
      </div>
      <div className="hairline-t pt-4 mt-5"><div className="caps-sm text-faint mb-2">Main contradiction</div><p className="font-display-italic text-paper text-[16px] leading-snug">{contradiction}</p></div>
      <div className="mt-4 bg-surface-inset border hairline p-3">
        <div className="caps-sm text-faint mb-2 flex items-center gap-1.5"><AlertCircle size={10} /> Not a judgment</div>
        <p className="font-sans-body text-muted text-[11px] leading-relaxed">These are neutral structural labels derived from benchmarked data. Interpretation and action are yours.</p>
      </div>
    </div>
  );
};

type JudgmentState = { read: string; supports: string; contradicts: string; invalidates: string; plan: string; risk: string | null };

const JudgmentPanel = ({ state, setState }: { state: JudgmentState; setState: React.Dispatch<React.SetStateAction<JudgmentState>> }) => {
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const handleCommit = async () => {
    if (!state.read.trim()) { setCommitError("Add your current read before committing."); return; }
    setCommitting(true); setCommitError(null);
    try {
      const res = await fetch(`${API}/judgment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: state.read, supports: state.supports, contradicts: state.contradicts, invalidates: state.invalidates, plan: state.plan, risk: state.risk }) });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setCommitted(`Committed · Entry #${data.id} · ${new Date(data.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`);
      setState({ read: "", supports: "", contradicts: "", invalidates: "", plan: "", risk: null });
    } catch (e) { setCommitError(e instanceof Error ? e.message : "Commit failed"); }
    finally { setCommitting(false); }
  };
  const fields = [{ key: "read" as const, label: "My current read", rows: 2 }, { key: "supports" as const, label: "What supports this view", rows: 2 }, { key: "contradicts" as const, label: "What contradicts this view", rows: 2 }, { key: "invalidates" as const, label: "What would change my mind", rows: 2 }, { key: "plan" as const, label: "My action plan", rows: 2 }];
  const risks = ["Low", "Medium", "High", "Stand aside"];
  return (
    <div className="bg-surface border hairline p-5 flex flex-col h-full">
      <div className="flex items-center justify-between hairline-b pb-3 mb-4"><div><div className="caps-sm text-faint">III</div><h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">User judgment</h2></div><span className="caps-sm text-amber-sand">You decide</span></div>
      {committed && <div className="bg-sage-10 border border-sage px-3 py-2 mb-3"><span className="caps-sm text-neutral-sage">{committed}</span></div>}
      {commitError && <div className="bg-extreme-10 border border-extreme px-3 py-2 mb-3"><span className="caps-sm text-alert-extreme">{commitError}</span></div>}
      <div className="flex flex-col gap-3 flex-1">
        {fields.map((f) => (<div key={f.key}><label className="caps-sm text-faint block mb-1.5">{f.label}</label><textarea rows={f.rows} value={state[f.key] || ""} onChange={(e) => { setState((s) => ({ ...s, [f.key]: e.target.value })); setCommitted(null); setCommitError(null); }} className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-sans-body resize-none" placeholder="..." /></div>))}
        <div><label className="caps-sm text-faint block mb-1.5">Risk level</label><div className="grid grid-cols-4 gap-1.5">{risks.map((r) => (<button key={r} onClick={() => setState((s) => ({ ...s, risk: r }))} className={`caps-sm py-2 border transition-colors ${state.risk === r ? "border-amber-sand bg-amber-sand-10 text-amber-sand" : "hairline text-muted hover:text-paper"}`}>{r}</button>))}</div></div>
      </div>
      <div className="mt-4 hairline-t pt-3 flex items-center justify-between">
        <span className="caps-sm text-faint">{committing ? "Saving…" : "Fill in your read before committing"}</span>
        <button onClick={handleCommit} disabled={committing} className={`caps-sm px-3 py-1.5 border transition-colors ${committing ? "border-faint text-faint cursor-not-allowed" : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"}`}>{committing ? "Saving…" : "Commit to log"}</button>
      </div>
    </div>
  );
};

const ManualOverridePanel = () => {
  const [input, setInput] = useState(""); const [status, setStatus] = useState<"idle" | "success" | "error">("idle"); const [message, setMessage] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const handleSubmit = async () => {
    if (!input.trim()) return; setSaving(true); setStatus("idle"); setMessage(null);
    try {
      const raw = JSON.parse(input.trim()); const entries = Array.isArray(raw) ? raw : [raw];
      const results = await Promise.all(entries.map((entry) => fetch(`${API}/manual-override`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) }).then((r) => r.json())));
      const failed = results.filter((r) => r.error);
      if (failed.length > 0) { setStatus("error"); setMessage(`${failed.length} entry failed: ${failed[0].error}`); }
      else { setStatus("success"); setMessage(`${results.length} metric${results.length > 1 ? "s" : ""} updated — ${results.map((r) => r.metric).join(", ")}`); setInput(""); setTimeout(() => window.location.reload(), 1200); }
    } catch (e) { setStatus("error"); setMessage("Invalid JSON — check Claude's output and try again."); }
    finally { setSaving(false); }
  };
  const handleClear = async (metric: string) => { await fetch(`${API}/manual-override/${metric}`, { method: "DELETE" }); window.location.reload(); };
  return (
    <div className="bg-surface border hairline">
      <div className="flex items-center justify-between px-5 py-4 hairline-b"><div><div className="caps-sm text-faint">Manual override</div><h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Screenshot → data</h2></div><div className="flex items-center gap-2"><Circle size={7} fill="#D9A84D" stroke="none" /><span className="caps-sm text-amber-sand">Paste Claude output</span></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x hairline">
        <div className="p-5">
          <div className="caps-sm text-faint mb-2">Paste JSON from Claude · single object or array</div>
          <textarea rows={12} value={input} onChange={(e) => { setInput(e.target.value); setStatus("idle"); setMessage(null); }} placeholder={`{\n  "metric": "exchange_netflow",\n  "current": "-3,400 BTC",\n  "d7": "-5,200 BTC",\n  "vs30d": "2.67x avg",\n  "percentile": 60,\n  "alert": "Strong outflow",\n  "pattern": "Sustained outflow structure",\n  "source": "CryptoQuant · tooltip exact",\n  "baseline_date": "2026-04-20"\n}`} className="w-full bg-surface-inset border hairline px-3 py-2.5 text-paper text-[11px] font-mono-data resize-none leading-relaxed" />
          {status === "success" && message && <div className="mt-3 bg-sage-10 border border-sage px-3 py-2"><span className="caps-sm text-neutral-sage">{message}</span></div>}
          {status === "error" && message && <div className="mt-3 bg-extreme-10 border border-extreme px-3 py-2"><span className="caps-sm text-alert-extreme">{message}</span></div>}
          <div className="mt-3 flex items-center justify-between"><span className="caps-sm text-faint">Supports single metric or array of multiple</span><button onClick={handleSubmit} disabled={saving || !input.trim()} className={`caps-sm px-4 py-2 border transition-colors ${saving || !input.trim() ? "border-faint text-faint cursor-not-allowed" : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"}`}>{saving ? "Updating…" : "Apply override"}</button></div>
        </div>
        <div className="p-5"><div className="caps-sm text-faint mb-4">Active overrides</div><ActiveOverrides onClear={handleClear} /></div>
      </div>
      <div className="px-5 py-3 hairline-t bg-surface-inset flex items-center justify-between"><div className="caps-sm text-faint">Overrides persist until cleared · amber dot on card indicates manual data</div><span className="caps-sm text-faint">When CoinGlass API is wired · overrides auto-disabled</span></div>
    </div>
  );
};

const ActiveOverrides = ({ onClear }: { onClear: (metric: string) => void }) => {
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  useEffect(() => { fetch(`${API}/manual-override`).then((res) => res.json()).then((json) => setOverrides(json)).catch((err) => console.error(err)); }, []);
  const entries = Object.entries(overrides);
  if (entries.length === 0) return (<div className="flex flex-col gap-3"><p className="caps-sm text-faint">No active overrides</p><p className="font-sans-body text-muted text-[11px] leading-relaxed">Paste Claude's JSON output on the left and click Apply override.</p></div>);
  return (
    <div className="flex flex-col gap-3">
      {entries.map(([key, val]) => {
        const updatedAt = val.updated_at ? new Date(val.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "—";
        return (
          <div key={key} className="bg-surface-inset border hairline p-3">
            <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Circle size={5} fill="#D9A84D" stroke="none" className="pulse-dot" /><span className="font-sans-body text-paper text-[12px] font-medium">{val.name}</span></div><button onClick={() => onClear(key)} className="caps-sm text-faint hover:text-alert-extreme transition-colors">Clear</button></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1"><div className="caps-sm text-faint">Current</div><div className="font-mono-data text-paper-2 text-[11px]">{val.current}</div><div className="caps-sm text-faint">Alert</div><div className="font-mono-data text-alert-notable text-[11px]">{val.alert}</div><div className="caps-sm text-faint">Source</div><div className="font-mono-data text-faint text-[10px]">{val.source}</div><div className="caps-sm text-faint">Updated</div><div className="font-mono-data text-faint text-[10px]">{updatedAt}</div></div>
          </div>
        );
      })}
    </div>
  );
};

const TradeExecutionPanel = ({ executions, onAdd }: { executions: any[]; onAdd: () => void }) => {
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
      const res = await fetch(`${API}/trade-execution`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planned_entry: parseFloat(form.planned_entry), actual_entry: parseFloat(form.actual_entry), size_btc: parseFloat(form.size_btc), max_drawdown_pct: parseFloat(form.max_drawdown_pct), current_volume: parseFloat(form.current_volume), market_state: form.market_state }) });
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
            <div><label className="caps-sm text-faint block mb-1.5">Slippage <span className="text-amber-sand">· calculated</span></label><div className={`w-full bg-surface-inset border hairline px-2.5 py-2 text-[12px] font-mono-data ${slippage === null ? "text-faint" : slippage > 0 ? "text-alert-extreme" : slippage < 0 ? "text-neutral-sage" : "text-muted"}`}>{slippage !== null ? `${slippage > 0 ? "+" : ""}$${slippage.toFixed(2)}` : "—"}</div></div>
            <div><label className="caps-sm text-faint block mb-1.5">Current size (BTC)</label><input type="number" value={form.size_btc} onChange={(e) => setForm((s) => ({ ...s, size_btc: e.target.value }))} placeholder="e.g. 0.5" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" /></div>
            <div><label className="caps-sm text-faint block mb-1.5">Max drawdown / stop loss (%)</label><input type="number" value={form.max_drawdown_pct} onChange={(e) => setForm((s) => ({ ...s, max_drawdown_pct: e.target.value }))} placeholder="e.g. 3" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" /></div>
            <div><label className="caps-sm text-faint block mb-1.5">Stop price <span className="text-amber-sand">· calculated</span></label><div className="w-full bg-surface-inset border hairline px-2.5 py-2 text-[12px] font-mono-data text-alert-extreme">{maxDrawdownPrice !== null ? `$${maxDrawdownPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</div></div>
            <div><label className="caps-sm text-faint block mb-1.5">Current volume (BTC)</label><input type="number" value={form.current_volume} onChange={(e) => setForm((s) => ({ ...s, current_volume: e.target.value }))} placeholder="e.g. 1200" className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-mono-data" /></div>
            <div><label className="caps-sm text-faint block mb-1.5">Market state</label><div className="flex gap-2">{marketStates.map((s) => (<button key={s} onClick={() => setForm((f) => ({ ...f, market_state: s }))} className={`caps-sm px-3 py-2 border flex-1 transition-colors ${form.market_state === s ? stateColors[s] : "hairline text-muted hover:text-paper"}`}>{s}</button>))}</div></div>
          </div>
          {volume > 0 && (<div className="hairline-t pt-4 mb-5"><div className="caps-sm text-faint mb-3">Volume benchmarks <span className="text-amber-sand">· calculated · use for TradingView alerts</span></div><div className="grid grid-cols-3 gap-3"><div className="bg-surface-inset border hairline p-3"><div className="caps-sm text-faint mb-1">0.5x — Slowdown</div><div className="font-mono-data text-paper-2 text-[14px]">{fmt(vol05x)} BTC</div></div><div className="bg-surface-inset border hairline p-3"><div className="caps-sm text-faint mb-1">1.5x — Interest</div><div className="font-mono-data text-amber-sand text-[14px]">{fmt(vol15x)} BTC</div></div><div className="bg-surface-inset border hairline p-3"><div className="caps-sm text-faint mb-1">2.0x — Significant</div><div className="font-mono-data text-alert-notable text-[14px]">{fmt(vol20x)} BTC</div></div></div></div>)}
          <div className="flex justify-end gap-3"><button onClick={() => setShowForm(false)} className="caps-sm px-3 py-1.5 border hairline text-muted hover:text-paper transition-colors">Cancel</button><button onClick={handleSave} disabled={saving} className={`caps-sm px-3 py-1.5 border transition-colors ${saving ? "border-faint text-faint cursor-not-allowed" : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"}`}>{saving ? "Saving…" : "Save execution"}</button></div>
        </div>
      )}
      <div className="grid grid-cols-12 caps-sm text-faint px-5 py-2.5 hairline-b bg-surface-inset"><div className="col-span-1">Date</div><div className="col-span-1">State</div><div className="col-span-2">Planned</div><div className="col-span-2">Actual</div><div className="col-span-1">Slip</div><div className="col-span-1">Size</div><div className="col-span-1">Stop%</div><div className="col-span-2">Stop $</div><div className="col-span-1">Vol BTC</div></div>
      {executions.length === 0 ? <div className="px-5 py-8 text-center"><span className="caps-sm text-faint">No execution entries yet — add your first trade above</span></div> : executions.map((e, i) => { const sc = e.market_state === "Green" ? "text-neutral-sage" : e.market_state === "Yellow" ? "text-alert-notable" : e.market_state === "Red" ? "text-alert-extreme" : "text-muted"; return (<div key={i} className={`grid grid-cols-12 px-5 py-3 text-[12px] font-sans-body items-center ${i < executions.length - 1 ? "hairline-b" : ""} hover:bg-surface-2 transition-colors`}><div className="col-span-1 font-mono-data text-paper-2">{e.date}</div><div className={`col-span-1 caps-sm ${sc}`}>{e.market_state}</div><div className="col-span-2 font-mono-data text-paper-2">${e.planned_entry?.toLocaleString()}</div><div className="col-span-2 font-mono-data text-paper">${e.actual_entry?.toLocaleString()}</div><div className={`col-span-1 font-mono-data ${e.slippage > 0 ? "text-alert-extreme" : e.slippage < 0 ? "text-neutral-sage" : "text-muted"}`}>{e.slippage > 0 ? "+" : ""}{e.slippage?.toFixed(2)}</div><div className="col-span-1 font-mono-data text-paper-2">{e.size_btc} BTC</div><div className="col-span-1 font-mono-data text-muted">{e.max_drawdown_pct}%</div><div className="col-span-2 font-mono-data text-alert-extreme">${e.max_drawdown_price?.toLocaleString()}</div><div className="col-span-1 font-mono-data text-paper-2">{e.current_volume}</div></div>); })}
      <div className="px-5 py-4 hairline-t bg-surface-inset flex items-center justify-between"><div className="flex items-center gap-2 text-faint"><Activity size={12} /><span className="caps-sm">Quantitative execution log · feeds SEM analytics system</span></div><span className="caps-sm text-faint">Vol benchmarks usable as TradingView alert levels</span></div>
    </div>
  );
};

type TradeLog = { date: string; structure: string; read: string; plan: string; result: string; bias: string };

const TradeLogReview = ({ logs, onAdd }: { logs: TradeLog[]; onAdd: () => void }) => {
  const [showForm, setShowForm] = useState(false); const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({ structure: "", capital: "", read: "", contradiction: "", plan: "", risk: "" });
  const handleSave = async () => {
    if (!form.read.trim() || !form.plan.trim()) { setSaveError("Read and plan are required."); return; }
    setSaving(true); setSaveError(null);
    try { const res = await fetch(`${API}/trade-log`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (!res.ok) throw new Error(`Server returned ${res.status}`); setShowForm(false); setForm({ structure: "", capital: "", read: "", contradiction: "", plan: "", risk: "" }); onAdd(); }
    catch (e) { setSaveError(e instanceof Error ? e.message : "Save failed"); } finally { setSaving(false); }
  };
  const formFields = [{ key: "structure" as const, label: "Market structure at entry", placeholder: "Range high test, bull flag, breakout retest…" }, { key: "capital" as const, label: "Capital & flow picture", placeholder: "ETF inflow strong, realized cap rising, OI elevated…" }, { key: "read" as const, label: "My read at the time", placeholder: "What I believed was happening when I made this decision…" }, { key: "contradiction" as const, label: "What I was ignoring", placeholder: "The signal that argued against my read…" }, { key: "plan" as const, label: "What I did", placeholder: "Entered long at $X, sized Y%, stop at Z…" }, { key: "risk" as const, label: "Risk taken", placeholder: "Low / Medium / High / Oversized" }];
  return (
    <div className="bg-surface border hairline">
      <div className="flex items-center justify-between px-5 py-4 hairline-b"><div><div className="caps-sm text-faint">IV</div><h2 className="font-display text-paper text-[22px] leading-tight mt-0.5">Review & notes</h2></div><div className="flex items-center gap-4"><span className="caps-sm text-faint">{logs.length} entries</span><button onClick={() => setShowForm(!showForm)} className={`caps-sm px-3 py-1.5 border transition-colors ${showForm ? "border-amber-sand bg-amber-sand-10 text-amber-sand" : "hairline text-muted hover:text-paper hover:border-amber-sand"}`}>{showForm ? "Cancel" : "New entry"}</button></div></div>
      {showForm && (<div className="px-5 py-4 hairline-b bg-surface-2"><div className="mb-4"><div className="caps-sm text-amber-sand mb-1">Log a trade decision</div><p className="font-sans-body text-muted text-[11px]">Record what the market looked like, what you decided, and why.</p></div>{saveError && <div className="bg-extreme-10 border border-extreme px-3 py-2 mb-3"><span className="caps-sm text-alert-extreme">{saveError}</span></div>}<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">{formFields.map((f) => (<div key={f.key}><label className="caps-sm text-faint block mb-1.5">{f.label}</label><textarea rows={2} value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-surface-inset border hairline px-2.5 py-2 text-paper text-[12px] font-sans-body resize-none" /></div>))}</div><div className="flex justify-end gap-3"><button onClick={() => setShowForm(false)} className="caps-sm px-3 py-1.5 hairline text-muted hover:text-paper border transition-colors">Cancel</button><button onClick={handleSave} disabled={saving} className={`caps-sm px-3 py-1.5 border transition-colors ${saving ? "border-faint text-faint cursor-not-allowed" : "border-amber-sand text-amber-sand hover:bg-amber-sand-10"}`}>{saving ? "Saving…" : "Log This Trade"}</button></div></div>)}
      <div className="grid grid-cols-12 caps-sm text-faint px-5 py-2.5 hairline-b bg-surface-inset"><div className="col-span-1">Date</div><div className="col-span-1">Price</div><div className="col-span-2">Structure</div><div className="col-span-3">Read</div><div className="col-span-2">Plan</div><div className="col-span-2">Result</div><div className="col-span-1">Bias</div></div>
      {logs.length === 0 ? <div className="px-5 py-8 text-center"><span className="caps-sm text-faint">No entries yet — add your first trade log above</span></div> : logs.map((log, i) => (<div key={i} className={`grid grid-cols-12 px-5 py-3 text-[12px] font-sans-body items-center ${i < logs.length - 1 ? "hairline-b" : ""} hover:bg-surface-2 transition-colors`}><div className="col-span-1 font-mono-data text-paper-2">{log.date}</div><div className="col-span-1 font-mono-data text-faint text-[10px]">{(log as any).btc_price ?? "—"}</div><div className="col-span-2 text-paper">{log.structure}</div><div className="col-span-3 text-paper-2 italic">{log.read}</div><div className="col-span-2 text-paper-2">{log.plan}</div><div className={`col-span-2 font-mono-data ${log.result?.startsWith("+") ? "text-neutral-sage" : log.result?.startsWith("-") ? "text-alert-extreme" : "text-muted"}`}>{log.result ?? "Open"}</div><div className="col-span-1 caps-sm text-faint">{log.bias ?? "—"}</div></div>))}
      <div className="px-5 py-4 hairline-t flex items-center justify-between bg-surface-inset"><div className="flex items-center gap-2 text-faint"><FileText size={12} /><span className="caps-sm">Post-trade SEM review · run weekly with Claude</span></div><button className="caps-sm text-amber-sand hover:underline flex items-center gap-1">Run review <ChevronRight size={11} /></button></div>
    </div>
  );
};

const Header = ({ price, change24h }: { price: string; change24h: string }) => (
  <header className="hairline-b">
    <div className="max-w-[1440px] mx-auto px-8 py-5 flex items-center justify-between">
      <div className="flex items-baseline gap-6">
        <h1 className="font-display text-paper text-[30px] leading-none tracking-tight">BTC<span className="font-display-italic text-amber-sand"> · </span><span className="font-display-italic">Decision</span> Desk</h1>
        <span className="caps-sm text-faint hidden md:inline">AI organizes · humans decide</span>
      </div>
      
      <div className="flex items-center gap-6">
        <Link href="/macro" className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300">
  Macro
</Link>
        <div className="text-right"><div className="caps-sm text-faint">Spot</div><div className="font-mono-data text-paper text-[15px]">{price} <span className={`text-[12px] ${change24h.startsWith("+") ? "text-neutral-sage" : "text-alert-extreme"}`}>{change24h}</span></div></div>
        <div className="text-right hidden sm:block"><div className="caps-sm text-faint">Snapshot</div><div className="font-mono-data text-paper-2 text-[12px]" suppressHydrationWarning>{new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })}</div></div>
        <div className="flex items-center gap-1.5 pl-4 border-l hairline"><Circle size={7} fill="#8DA078" stroke="none" className="pulse-dot" /><span className="caps-sm text-neutral-sage">Live</span></div>
      </div>
    </div>
  </header>
);

const SectionLabel = ({ numeral, title, subtitle }: { numeral: string; title: string; subtitle?: string }) => (
  <div className="flex items-end justify-between mb-5 hairline-b pb-3">
    <div className="flex items-baseline gap-4"><span className="font-display-italic text-amber-sand text-[28px] leading-none">{numeral}</span><h2 className="font-display text-paper text-[26px] leading-none">{title}</h2></div>
    {subtitle && <span className="caps-sm text-faint">{subtitle}</span>}
  </div>
);

export default function BTCDecisionDashboard() {
  const [judgment, setJudgment] = useState<JudgmentState>({ read: "", supports: "", contradicts: "", invalidates: "", plan: "", risk: null });
  const [logs, setLogs]         = useState<TradeLog[]>(INITIAL_TRADE_LOGS);
  const [now, setNow]           = useState(new Date());
  const [metrics, setMetrics]   = useState<Metric[]>([]);
  const [stablecoinData, setStablecoinData] = useState<StablecoinData | null>(null);
  const [dominanceData, setDominanceData]   = useState<DominanceData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [price, setPrice]       = useState<{ price: string; change_24h: string }>({ price: "—", change_24h: "—" });
  const [summary, setSummary]   = useState<{ structure: string; extreme_count: number; notable_count: number; active_alerts: Array<{ metric: string; alert: string; level: string; current: string }> } | null>(null);
  const [news, setNews]         = useState<Array<{ title: string; source: string; time: string; tag: string; url: string }>>([]);
  const [causal, setCausal]     = useState<{ chain: Array<{ label: string; state: string; weight: string }>; contradiction: string } | null>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [proxyStocks, setProxyStocks] = useState<ProxyStock[]>([]);
  const [fromCache, setFromCache] = useState(false);

// In the mount useEffect, after setLoading(false):


// In fetchAll, after the cache write, add:


  // ── Date picker state ──────────────────────────────────────────────────
  const [selectedDate, setSelectedDate]             = useState<string>("");
  const [historicalMetrics, setHistoricalMetrics]   = useState<Metric[] | null>(null);
  const [historicalLoading, setHistoricalLoading]   = useState(false);
  const [historicalError, setHistoricalError]       = useState<string | null>(null);
  const [historicalStablecoin, setHistoricalStablecoin] = useState<StablecoinData | null>(null);
  const [historicalDominance, setHistoricalDominance]   = useState<DominanceData | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Render cached data immediately on mount — no loading skeletons
useEffect(() => {
  try {
    const raw = localStorage.getItem(METRICS_CACHE_KEY);
    if (!raw) return;
    const cached = JSON.parse(raw);
    if (cached.metrics)    setMetrics(cached.metrics);
    if (cached.stablecoin) setStablecoinData(cached.stablecoin);
    if (cached.dominance)  setDominanceData(cached.dominance);
    if (cached.price)      setPrice(cached.price);
    if (cached.summary)    setSummary(cached.summary);
    if (cached.news)       setNews(cached.news);
    setLoading(false); // skip skeletons — show cached cards immediately
    setFromCache(true);
  } catch (e) {
    // ignore — cache miss or parse error, fetchAll will populate normally
  }
}, []); // runs once on mount only
 
  // ── Main data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true); setError(null);
        const metricsRes = await fetch(`${API}/metrics`);
        if (!metricsRes.ok) throw new Error(`Backend returned ${metricsRes.status}`);
        const data = await metricsRes.json();
        //await new Promise(r => setTimeout(r, 1000));
        const [priceRes, summaryRes] = await Promise.all([fetch(`${API}/price`), fetch(`${API}/summary`)]);
        const newsRes = await fetch(`${API}/news`); const newsData = await newsRes.json(); if (newsData.items) setNews(newsData.items);
        const causalRes = await fetch(`${API}/causal`); const causalData = await causalRes.json(); setCausal(causalData);
        const priceData = await priceRes.json(); const summaryData = await summaryRes.json();
        const tradeLogRes = await fetch(`${API}/trade-log`); const tradeLogData = await tradeLogRes.json(); if (Array.isArray(tradeLogData) && tradeLogData.length > 0) setLogs(tradeLogData);
        const execRes = await fetch(`${API}/trade-execution`); const execData = await execRes.json(); if (Array.isArray(execData)) setExecutions(execData);
        if (data["stablecoin_supply"]) setStablecoinData(data["stablecoin_supply"] as StablecoinData);
        if (data["btc_dominance"]) setDominanceData(data["btc_dominance"] as DominanceData);
        // Proxy stocks — intentionally not awaited (slow yFinance calls, 5-min backend cache)
        fetch(`${API}/crypto-proxies`).then(r => r.json()).then(d => { if (d.crypto_proxies) setProxyStocks(Object.values(d.crypto_proxies) as ProxyStock[]); }).catch(err => console.error("[proxy stocks]", err));
        const transformed: Metric[] = Object.entries(data)
          .filter(([id]) => id !== "stablecoin_supply" && id !== "btc_dominance")
          .map(([id, raw]) => { const m = raw as Record<string, unknown>; return { id, name: m.name as string, category: m.category as string, current: m.current as string, currentDir: m.current_dir as "up" | "down" | "flat", d7: m.d7 as string, vs30d: m.vs30d as string, percentile: m.percentile as number, alert: m.alert as string, alertLevel: m.alert_level as "extreme" | "notable" | "neutral" | "none", pattern: m.pattern as string, spark: (m.spark as number[]) ?? [], updated: "just now", _is_override: (m._is_override ?? false) as boolean }; });
        // Persist to localStorage for instant render on next load
try {
  localStorage.setItem(METRICS_CACHE_KEY, JSON.stringify({
    metrics:    transformed,
    stablecoin: data["stablecoin_supply"] ?? null,
    dominance:  data["btc_dominance"]     ?? null,
    price:      priceData,
    summary:    summaryData,
    news:       newsData.items ?? [],
    ts:         Date.now(),
  }));
} catch (e) {
  // ignore — storage full or disabled
}
setFromCache(false);
setMetrics(transformed);
setPrice(priceData);
setSummary(summaryData);
      } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); setMetrics([]); }
      finally { setLoading(false); }
    };
    fetchAll();
    const id = setInterval(fetchAll, 60000);
    return () => clearInterval(id);
  }, []);

  // ── Historical fetch — separate useEffect at component level ───────────
  // FIX: this was previously nested inside fetchAll causing React error #321
  useEffect(() => {
    if (!selectedDate) {
      setHistoricalMetrics(prev => prev !== null ? null : prev);
      setHistoricalStablecoin(prev => prev !== null ? null : prev);
      setHistoricalDominance(prev => prev !== null ? null : prev);
      setHistoricalError(prev => prev !== null ? null : prev);
      return;
    }
    const fetchHistorical = async () => {
      setHistoricalLoading(true); setHistoricalError(null);
      try {
        const res = await fetch(`${API}/metrics/history?date=${selectedDate}`);
        const json = await res.json();
        if (json.error || json.count === 0) { setHistoricalError(json.error ?? `No data found for ${selectedDate}`); setHistoricalMetrics([]); return; }
        const raw = json.metrics as Record<string, any>;
        if (raw["stablecoin_supply"]) setHistoricalStablecoin(raw["stablecoin_supply"] as StablecoinData);
        if (raw["btc_dominance"]) setHistoricalDominance(raw["btc_dominance"] as DominanceData);
        const transformed: Metric[] = Object.entries(raw)
          .filter(([id]) => id !== "stablecoin_supply" && id !== "btc_dominance")
          .map(([id, m]: [string, any]) => ({ id, name: m.name, category: m.category, current: m.current, currentDir: m.current_dir ?? "flat", d7: m.d7, vs30d: m.vs30d, percentile: m.percentile, alert: m.alert, alertLevel: m.alert_level, pattern: m.pattern, spark: m.spark ?? [], updated: m.source ?? "Historical", _is_override: false, _is_historical: true, _date: selectedDate }));
        setHistoricalMetrics(transformed);
      } catch (e) { setHistoricalError(e instanceof Error ? e.message : "Fetch failed"); }
      finally { setHistoricalLoading(false); }
    };
    fetchHistorical();
  }, [selectedDate]); // ← correct: only runs when selectedDate changes

  const alertCounts = useMemo(() => {
    const extreme = metrics.filter((m) => m.alertLevel === "extreme").length;
    const notable = metrics.filter((m) => m.alertLevel === "notable").length;
    return { extreme, notable };
  }, [metrics]);

  return (
    <>
      <style>{FONT_LINK}</style>
      <div className="min-h-screen bg-ink text-paper font-sans-body grid-bg">
        <Header price={price.price} change24h={price.change_24h} />
        <main className="max-w-[1440px] mx-auto px-8 py-8 space-y-10">

          {/* Market state bar */}
          <div className="flex flex-wrap items-center gap-6 bg-surface border hairline px-5 py-4">
            <div className="flex items-center gap-2"><Activity size={14} className="text-amber-sand" /><span className="caps-sm text-faint">Market state</span></div>
            <div className="flex items-baseline gap-2"><span className="font-display-italic text-paper text-[18px]">{summary?.structure ?? "Calculating…"}</span></div>
            <div className="ml-auto flex items-center gap-5">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#C4614A" }} /><span className="caps-sm text-alert-extreme">{summary?.extreme_count ?? alertCounts.extreme} Extreme</span></div>
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#C89A3F" }} /><span className="caps-sm text-alert-notable">{summary?.notable_count ?? alertCounts.notable} Notable</span></div>
              <div className="flex items-center gap-2 pl-5 border-l hairline"><Clock size={11} className="text-faint" /><span className="caps-sm text-faint" suppressHydrationWarning>{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span></div>
            </div>
          </div>

          {/* Spot chart */}
          <section><TradingViewEmbed /></section>

          {/* Section I — Market state snapshot */}
          <section>
            <div className="flex items-end justify-between mb-5 hairline-b pb-3">
              <div className="flex items-baseline gap-4">
                <span className="font-display-italic text-amber-sand text-[28px] leading-none">I</span>
                <h2 className="font-display text-paper text-[26px] leading-none">Market state snapshot</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="caps-sm text-faint">Snapshot date</span>
                  <input type="date" value={selectedDate} max={new Date().toISOString().split("T")[0]} onChange={e => setSelectedDate(e.target.value)} className="bg-surface-inset border hairline px-2.5 py-1.5 text-paper font-mono-data text-[11px] focus:border-amber-sand focus:outline-none cursor-pointer" style={{ colorScheme: "dark" }} />
                  {selectedDate && <button onClick={() => setSelectedDate("")} className="caps-sm text-faint hover:text-alert-extreme transition-colors px-2 py-1.5 border hairline">✕ Live</button>}
                </div>
                <span className="caps-sm text-faint">{selectedDate ? "Historical snapshot": loading ? "Fetching fresh data…" :fromCache ? "Cached · refreshing…" :"Benchmark · alert · pattern · no judgment"}</span>
              </div>
            </div>

            {selectedDate && (
              <div className="border border-[rgba(55,138,221,0.35)] bg-[rgba(55,138,221,0.08)] px-5 py-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: "#378ADD" }} />
                  <span className="font-sans-body text-[#378ADD] text-[12px]">
                    Viewing historical snapshot — <span className="font-mono-data">{new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                  </span>
                </div>
                <span className="caps-sm text-[#378ADD]">{historicalMetrics?.length ?? 0} metrics found</span>
              </div>
            )}

            {selectedDate && historicalError && (
              <div className="border border-extreme bg-extreme-10 p-5 mb-3">
                <div className="caps-sm text-alert-extreme mb-1 flex items-center gap-1.5"><AlertCircle size={10} /> No data for this date</div>
                <p className="font-sans-body text-paper-2 text-[12px]">{historicalError}</p>
              </div>
            )}

            {!selectedDate && error && (
              <div className="border border-extreme bg-extreme-10 p-5 mb-3">
                <div className="caps-sm text-alert-extreme mb-2 flex items-center gap-1.5"><AlertCircle size={10} /> Backend error</div>
                <p className="font-sans-body text-paper-2 text-[12px] leading-relaxed">Could not reach <span className="font-mono-data">{API}/metrics</span> — {error}.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {selectedDate ? (
                historicalLoading
                  ? Array.from({ length: 6 }).map((_, i) => (<div key={i} className="bg-surface border hairline p-4 h-[260px] fade-in" style={{ animationDelay: `${i * 40}ms` }}><div className="caps-sm text-faint">Loading historical data…</div></div>))
                  : (historicalMetrics ?? []).map((m, i) => <MetricCard key={m.id} metric={m} index={i} />)
              ) : (
                loading && metrics.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => (<div key={i} className="bg-surface border hairline p-4 h-[260px] fade-in" style={{ animationDelay: `${i * 40}ms` }}><div className="caps-sm text-faint">Loading…</div></div>))
                  : metrics.map((m, i) => <MetricCard key={m.id} metric={m} index={i} />)
              )}
            </div>
          </section>

          {/* Section X — Stablecoin Supply */}
          {(selectedDate ? historicalStablecoin : stablecoinData) && (
            <section>
              <SectionLabel numeral="X" title="Stablecoin Supply" subtitle={selectedDate ? `Snapshot · ${selectedDate}` : "USDT + USDC · liquidity proxy · CoinGecko"} />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <StablecoinCard data={(selectedDate ? historicalStablecoin : stablecoinData)!} />
                {!selectedDate && (
                  <div className="md:col-span-1 xl:col-span-2 bg-surface border hairline p-5 flex flex-col justify-between">
                    <div>
                      <div className="caps-sm text-faint mb-3">What this measures</div>
                      <p className="font-sans-body text-paper-2 text-[13px] leading-relaxed mb-4"><span className="text-paper font-medium">Stablecoin supply</span> tracks the total circulating supply of USDT and USDC — the two dominant dollar-pegged stablecoins. Combined, they represent the primary pool of dry powder available to deploy into crypto markets.</p>
                      <p className="font-sans-body text-muted text-[12px] leading-relaxed">Rising supply means new capital is being minted and staged — historically a bullish liquidity signal. Falling supply means capital is either deploying into risk assets or exiting crypto entirely. The direction matters as much as the magnitude.</p>
                    </div>
                    <div className="hairline-t pt-4 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[{ label: "7d expansion", value: "> +5%", color: "#C89A3F", note: "Notable" }, { label: "7d expansion", value: "> +10%", color: "#C4614A", note: "Extreme" }, { label: "7d contraction", value: "< -5%", color: "#C89A3F", note: "Notable" }, { label: "7d contraction", value: "< -10%", color: "#C4614A", note: "Extreme" }].map((r, i) => (
                        <div key={i}><div className="caps-sm text-faint mb-1">{r.note} · {r.label}</div><div className="font-mono-data text-[14px] font-medium" style={{ color: r.color }}>{r.value}</div></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section XI — BTC Dominance */}
          {(selectedDate ? historicalDominance : dominanceData) && (
            <section>
              <SectionLabel numeral="XI" title="BTC Dominance" subtitle={selectedDate ? `Snapshot · ${selectedDate}` : "BTC vs total crypto market cap · USD · CoinGecko"} />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <DominanceCard data={(selectedDate ? historicalDominance : dominanceData)!} />
                {!selectedDate && (
                  <div className="md:col-span-1 xl:col-span-2 bg-surface border hairline p-5 flex flex-col justify-between">
                    <div>
                      <div className="caps-sm text-faint mb-3">What this measures</div>
                      <p className="font-sans-body text-paper-2 text-[13px] leading-relaxed mb-4"><span className="text-paper font-medium">BTC Dominance</span> is Bitcoin's share of the total cryptocurrency market capitalization in USD. It measures whether capital is concentrating in Bitcoin or rotating into altcoins.</p>
                      <p className="font-sans-body text-muted text-[12px] leading-relaxed">Rising dominance typically signals risk-off rotation into BTC — capital seeking the relative safety of the largest asset. Falling dominance signals risk-on rotation into altcoins. Extreme readings in either direction have historically preceded reversals.</p>
                    </div>
                    <div className="hairline-t pt-4 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[{ label: "Alt season", value: "< 50%", color: "#C89A3F", note: "Notable" }, { label: "Alt season extreme", value: "< 40%", color: "#C4614A", note: "Extreme" }, { label: "BTC dominance", value: "> 60%", color: "#C89A3F", note: "Notable" }, { label: "BTC dominance extreme", value: "> 70%", color: "#C4614A", note: "Extreme" }].map((r, i) => (
                        <div key={i}><div className="caps-sm text-faint mb-1">{r.note} · {r.label}</div><div className="font-mono-data text-[14px] font-medium" style={{ color: r.color }}>{r.value}</div></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section XII — Crypto Proxy Stocks */}
          {proxyStocks.length > 0 && (
            <section>
              <SectionLabel numeral="XII" title="Crypto Proxy Stocks" subtitle="S&P 500 crypto-exposed · BTC correlation · lead/lag · yFinance" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
                {proxyStocks.sort((a, b) => b.corr_30d - a.corr_30d).map(s => <ProxyStockCard key={s.ticker} stock={s} />)}
              </div>
              <CorrelationMatrix stocks={proxyStocks} />
            </section>
          )}

          {/* Events · causal · judgment */}
          <section>
            <SectionLabel numeral="II–IV" title="Events · causal · judgment" subtitle="Read from left. Decide on the right." />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-3"><TopEvents items={news} /></div>
              <div className="lg:col-span-5"><CausalAnalysis data={causal} /></div>
              <div className="lg:col-span-4"><JudgmentPanel state={judgment} setState={setJudgment} /></div>
            </div>
          </section>

          {/* Screenshot override */}
          <section>
            <SectionLabel numeral="V" title="Screenshot override" subtitle="Paste Claude extraction · Exchange Netflow · LTH Supply" />
            <ManualOverridePanel />
          </section>

          {/* Trade execution */}
          <section>
            <SectionLabel numeral="VI" title="Trade execution" subtitle="Quantitative log · slippage · volume benchmarks · SEM feed" />
            <TradeExecutionPanel executions={executions} onAdd={() => { fetch(`${API}/trade-execution`).then(r => r.json()).then(data => { if (Array.isArray(data)) setExecutions(data); }); }} />
          </section>

          {/* Trade log */}
          <section>
            <SectionLabel numeral="VII" title="Trade Log, Review & notes" subtitle="Trade log · post-trade SEM review" />
            <TradeLogReview logs={logs} onAdd={() => { fetch(`${API}/trade-log`).then(r => r.json()).then(data => { if (Array.isArray(data)) setLogs(data); }); }} />
          </section>

          <footer className="pt-8 hairline-t flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-muted">
            <div className="caps-sm text-faint">Build · 0 → 1 · mock data · wire APIs in step 7</div>
            <div className="caps-sm text-faint">AI organizes reality. Humans make decisions. SEM improves how humans decide.</div>
          </footer>
        </main>
      </div>
    </>
  );
}
