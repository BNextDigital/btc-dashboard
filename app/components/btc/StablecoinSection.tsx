import SectionLabel from "@/app/components/dashboard/SectionLabel";
import StablecoinCard from "@/app/components/btc/StablecoinCard";
import type { StablecoinData } from "@/app/types/btc-dashboard";

interface StablecoinSectionProps {
  data: StablecoinData | null;
  selectedDate: string;
}

const THRESHOLDS = [
  { label: "7d expansion", value: "> +5%", color: "#C89A3F", note: "Notable" },
  { label: "7d expansion", value: "> +10%", color: "#C4614A", note: "Extreme" },
  { label: "7d contraction", value: "< -5%", color: "#C89A3F", note: "Notable" },
  { label: "7d contraction", value: "< -10%", color: "#C4614A", note: "Extreme" },
];

export default function StablecoinSection({
  data,
  selectedDate,
}: StablecoinSectionProps) {
  if (!data) return null;

  return (
    <section>
      <SectionLabel
        numeral="X"
        title="Stablecoin Supply"
        subtitle={
          selectedDate
            ? `Snapshot · ${selectedDate}`
            : "USDT + USDC · liquidity proxy · CoinGecko"
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <StablecoinCard data={data} />
        {!selectedDate && (
          <div className="md:col-span-1 xl:col-span-2 bg-surface border hairline p-5 flex flex-col justify-between">
            <div>
              <div className="caps-sm text-faint mb-3">What this measures</div>
              <p className="font-sans-body text-paper-2 text-[13px] leading-relaxed mb-4">
                <span className="text-paper font-medium">
                  Stablecoin supply
                </span>{" "}
                tracks the total circulating supply of USDT and USDC — the two
                dominant dollar-pegged stablecoins. Combined, they represent the
                primary pool of dry powder available to deploy into crypto
                markets.
              </p>
              <p className="font-sans-body text-muted text-[12px] leading-relaxed">
                Rising supply means new capital is being minted and staged —
                historically a bullish liquidity signal. Falling supply means
                capital is either deploying into risk assets or exiting crypto
                entirely. The direction matters as much as the magnitude.
              </p>
            </div>
            <div className="hairline-t pt-4 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {THRESHOLDS.map((threshold) => (
                <div key={`${threshold.note}-${threshold.value}`}>
                  <div className="caps-sm text-faint mb-1">
                    {threshold.note} · {threshold.label}
                  </div>
                  <div
                    className="font-mono-data text-[14px] font-medium"
                    style={{ color: threshold.color }}
                  >
                    {threshold.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
