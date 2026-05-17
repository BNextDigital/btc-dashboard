"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type StablecoinData = {
  name:        string;
  category:    string;
  current:     string;
  current_dir: "up" | "down" | "flat";
  d7:          string;
  vs30d:       string;
  percentile:  number;
  alert:       string;
  alert_level: "extreme" | "notable" | "neutral" | "none";
  pattern:     string;
  spark:       number[];
  usdt:        string;
  usdc:        string;
  usdt_raw:    number;
  usdc_raw:    number;
  usdt_share:  number;
  usdc_share:  number;
  usdt_7d:     string;
  usdc_7d:     string;
  _is_override?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const alertStyle = (level: string) => {
  switch (level) {
    case "extreme": return { badge: "border-[rgba(196,97,74,0.35)] bg-[rgba(196,97,74,0.10)] text-[#C4614A]", bar: "#C4614A", strip: "bg-[#FCEBEB] border-[#F09595] text-[#C4614A]" };
    case "notable": return { badge: "border-[rgba(200,154,63,0.35)] bg-[rgba(200,154,63,0.10)] text-[#C89A3F]", bar: "#C89A3F", strip: "bg-[#FAEEDA] border-[#FAC775] text-[#854F0B]" };
    case "neutral": return { badge: "border-[rgba(141,160,120,0.35)] bg-[rgba(141,160,120,0.10)] text-[#8DA078]", bar: "#8DA078", strip: "bg-[#EAF3DE] border-[#97C459] text-[#3B6D11]" };
    default:        return { badge: "border-[#22231F] bg-[#17171A] text-[#8A8780]", bar: "#8A8780", strip: "bg-[#17171A] border-[#22231F] text-[#8A8780]" };
  }
};

const Sparkline = ({ data, level }: { data: number[]; level: string }) => {
  if (!data || data.length < 2) return null;
  const w = 80; const h = 24;
  const max = Math.max(...data); const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const stroke = level === "extreme" ? "#C4614A" : level === "notable" ? "#C89A3F" : "#D9A84D";
  return (
    <svg width={w} height={h} className="overflow-visible opacity-80">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
};

const PercentileBar = ({ value, color }: { value: number; color: string }) => (
  <div className="w-full">
    <div className="h-[3px] w-full bg-[#0E0E10] relative overflow-hidden rounded-sm">
      <div className="absolute top-0 left-0 h-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: color }} />
      {[10, 75, 90].map(p => (
        <div key={p} className="absolute top-0 h-full w-px bg-[#2F2F2F]"
          style={{ left: `${p}%` }} />
      ))}
    </div>
    <div className="flex justify-between mt-[3px]">
      <span className="text-[8px] tracking-widest uppercase text-[#55534B]">p0</span>
      <span className="text-[8px] tracking-widest uppercase text-[#55534B]">p100</span>
    </div>
  </div>
);

// ─── Breakdown Bar ────────────────────────────────────────────────────────────

const BreakdownBar = ({
  usdt, usdc, usdt_share, usdc_share, usdt_7d, usdc_7d
}: {
  usdt: string; usdc: string;
  usdt_share: number; usdc_share: number;
  usdt_7d: string; usdc_7d: string;
}) => (
  <div className="flex flex-col gap-2">
    {/* Stacked bar */}
    <div className="flex h-[8px] w-full overflow-hidden rounded-sm gap-[2px]">
      <div
        className="h-full transition-all duration-700"
        style={{ width: `${usdt_share}%`, backgroundColor: "#26A17B" }}
        title={`USDT ${usdt_share}%`}
      />
      <div
        className="h-full transition-all duration-700"
        style={{ width: `${usdc_share}%`, backgroundColor: "#2775CA" }}
        title={`USDC ${usdc_share}%`}
      />
    </div>

    {/* Labels row */}
    <div className="grid grid-cols-2 gap-3">
      {/* USDT */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-[8px] h-[8px] rounded-sm flex-shrink-0" style={{ backgroundColor: "#26A17B" }} />
          <span className="text-[9px] tracking-[0.18em] uppercase text-[#55534B]">USDT · {usdt_share}%</span>
        </div>
        <div className="font-mono text-[#E8E4D9] text-[13px] font-medium">{usdt}</div>
        <div className="font-mono text-[11px]" style={{ color: usdt_7d.startsWith("+") ? "#8DA078" : usdt_7d.startsWith("-") ? "#C4614A" : "#8A8780" }}>
          {usdt_7d} 7d
        </div>
      </div>

      {/* USDC */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-[8px] h-[8px] rounded-sm flex-shrink-0" style={{ backgroundColor: "#2775CA" }} />
          <span className="text-[9px] tracking-[0.18em] uppercase text-[#55534B]">USDC · {usdc_share}%</span>
        </div>
        <div className="font-mono text-[#E8E4D9] text-[13px] font-medium">{usdc}</div>
        <div className="font-mono text-[11px]" style={{ color: usdc_7d.startsWith("+") ? "#8DA078" : usdc_7d.startsWith("-") ? "#C4614A" : "#8A8780" }}>
          {usdc_7d} 7d
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Card ────────────────────────────────────────────────────────────────

const StablecoinCard = ({ data }: { data: StablecoinData }) => {
  const styles  = alertStyle(data.alert_level);
  const DirIcon = data.current_dir === "up" ? TrendingUp
                : data.current_dir === "down" ? TrendingDown : Minus;
  const dirColor = data.current_dir === "up" ? "#8DA078"
                 : data.current_dir === "down" ? "#C4614A" : "#8A8780";

  return (
    <div className="bg-[#131315] border border-[#22231F] p-4 flex flex-col gap-3
                    hover:bg-[#17171A] transition-colors duration-300">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] tracking-[0.22em] uppercase font-medium text-[#55534B] mb-1">
            {data.category}
          </div>
          <h3 className="text-[#E8E4D9] text-[14px] font-medium leading-tight">
            {data.name}
          </h3>
        </div>
        <span className={`text-[9px] tracking-[0.22em] uppercase font-medium px-2 py-[3px]
                         border whitespace-nowrap flex-shrink-0 ${styles.badge}`}>
          {data.alert === "—" ? "No alert" : data.alert.split("—")[0].trim()}
        </span>
      </div>

      {/* Hero value + sparkline */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[#E8E4D9] text-[28px] leading-none tracking-tight">
              {data.current}
            </span>
            <DirIcon size={13} style={{ color: dirColor }} />
          </div>
          <div className="text-[10px] tracking-[0.18em] uppercase text-[#55534B] mt-1">
            Combined USDT + USDC
          </div>
        </div>
        <Sparkline data={data.spark} level={data.alert_level} />
      </div>

      {/* Breakdown bar */}
      <div className="border-t border-[#22231F] pt-3">
        <BreakdownBar
          usdt={data.usdt}
          usdc={data.usdc}
          usdt_share={data.usdt_share}
          usdc_share={data.usdc_share}
          usdt_7d={data.usdt_7d}
          usdc_7d={data.usdc_7d}
        />
      </div>

      {/* 7d / vs30d / percentile */}
      <div className="grid grid-cols-3 gap-2 border-t border-[#22231F] pt-3">
        <div>
          <div className="text-[9px] tracking-[0.22em] uppercase text-[#55534B] mb-1">7d</div>
          <div className="font-mono text-[#B8B5AA] text-[11px] leading-tight">{data.d7}</div>
        </div>
        <div>
          <div className="text-[9px] tracking-[0.22em] uppercase text-[#55534B] mb-1">vs 30d</div>
          <div className="font-mono text-[#B8B5AA] text-[11px] leading-tight">{data.vs30d}</div>
        </div>
        <div>
          <div className="text-[9px] tracking-[0.22em] uppercase text-[#55534B] mb-1">Pctl</div>
          <div className="font-mono text-[#B8B5AA] text-[11px]">{data.percentile}</div>
        </div>
      </div>

      <PercentileBar value={data.percentile} color={styles.bar} />

      {/* Pattern */}
      <div className="flex items-start justify-between border-t border-[#22231F] pt-2 gap-2">
        <span className="text-[9px] tracking-[0.22em] uppercase text-[#55534B] flex-shrink-0 pt-0.5">Pattern</span>
        <span className="font-sans text-[11px] text-[#B8B5AA] italic text-right leading-tight">
          {data.pattern}
        </span>
      </div>

      {/* Alert strip */}
      {data.alert_level !== "none" && (
        <div className={`border rounded-sm px-3 py-2 text-[11px] leading-relaxed ${styles.strip}`}>
          {data.alert}
        </div>
      )}

      {/* Source dot */}
      <div className="flex items-center gap-1.5 text-[#55534B]">
        <div className="w-[5px] h-[5px] rounded-full"
          style={{
            backgroundColor: data._is_override ? "#D9A84D" : "#8DA078",
            animation: "pulse-soft 2.4s ease-in-out infinite",
          }} />
        <span className="text-[9px] tracking-[0.22em] uppercase">
          {data._is_override ? "Manual · screenshot" : "Live · CoinGecko · market cap"}
        </span>
      </div>
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

export default function StablecoinSection() {
  const [data, setData]       = useState<StablecoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/metrics`);
        const json = await res.json();
        const raw  = json["stablecoin_supply"];
        if (!raw) throw new Error("stablecoin_supply not in /metrics response");
        setData(raw as StablecoinData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "fetch error");
      } finally {
        setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section>
      <div className="flex items-end justify-between mb-5 border-b border-[#22231F] pb-3">
        <div className="flex items-baseline gap-4">
          <span className="font-['Instrument_Serif'] italic text-[#D9A84D] text-[28px] leading-none">
            X
          </span>
          <h2 className="font-['Instrument_Serif'] text-[#E8E4D9] text-[26px] leading-none">
            Stablecoin Supply
          </h2>
        </div>
        <span className="text-[9px] tracking-[0.22em] uppercase text-[#55534B]">
          USDT + USDC · liquidity proxy · CoinGecko
        </span>
      </div>

      {loading && (
        <div className="bg-[#131315] border border-[#22231F] p-4 h-[320px]">
          <div className="text-[9px] tracking-[0.22em] uppercase text-[#55534B]">Loading…</div>
        </div>
      )}

      {error && (
        <div className="border border-[rgba(196,97,74,0.35)] bg-[rgba(196,97,74,0.10)] p-4
                        text-[#C4614A] text-[12px] font-mono">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <StablecoinCard data={data} />

          {/* Context panel */}
          <div className="md:col-span-1 xl:col-span-2 bg-[#131315] border border-[#22231F] p-5
                          flex flex-col justify-between">
            <div>
              <div className="text-[9px] tracking-[0.22em] uppercase text-[#55534B] mb-3">
                What this measures
              </div>
              <p className="text-[#B8B5AA] text-[13px] leading-relaxed mb-4">
                <span className="text-[#E8E4D9] font-medium">Stablecoin supply</span> tracks
                the total circulating supply of USDT and USDC — the two dominant dollar-pegged
                stablecoins. Combined, they represent the primary pool of dry powder available
                to deploy into crypto markets.
              </p>
              <p className="text-[#8A8780] text-[12px] leading-relaxed">
                Rising supply means new capital is being minted and staged — historically a
                bullish liquidity signal. Falling supply means capital is either deploying into
                risk assets (bullish deployment) or exiting crypto entirely (bearish outflow).
                The direction matters as much as the magnitude.
              </p>
            </div>

            <div className="border-t border-[#22231F] pt-4 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "7d expansion",   value: "> +5%",   color: "#C89A3F", note: "Notable" },
                { label: "7d expansion",   value: "> +10%",  color: "#C4614A", note: "Extreme" },
                { label: "7d contraction", value: "< -5%",   color: "#C89A3F", note: "Notable" },
                { label: "7d contraction", value: "< -10%",  color: "#C4614A", note: "Extreme" },
              ].map((r, i) => (
                <div key={i}>
                  <div className="text-[9px] tracking-[0.22em] uppercase text-[#55534B] mb-1">
                    {r.note} · {r.label}
                  </div>
                  <div className="font-mono text-[14px] font-medium" style={{ color: r.color }}>
                    {r.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
