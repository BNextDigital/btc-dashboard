import SectionLabel from "@/app/components/dashboard/SectionLabel";
import DominanceCard from "@/app/components/btc/DominanceCard";
import type { DominanceData } from "@/app/types/btc-dashboard";

interface DominanceSectionProps {
  data: DominanceData | null;
  selectedDate: string;
}

const THRESHOLDS = [
  { label: "Alt season", value: "< 50%", color: "#C89A3F", note: "Notable" },
  { label: "Alt season extreme", value: "< 40%", color: "#C4614A", note: "Extreme" },
  { label: "BTC dominance", value: "> 60%", color: "#C89A3F", note: "Notable" },
  { label: "BTC dominance extreme", value: "> 70%", color: "#C4614A", note: "Extreme" },
];

export default function DominanceSection({
  data,
  selectedDate,
}: DominanceSectionProps) {
  if (!data) return null;

  return (
    <section>
      <SectionLabel
        numeral="XI"
        title="BTC Dominance"
        subtitle={
          selectedDate
            ? `Snapshot · ${selectedDate}`
            : "BTC vs total crypto market cap · USD · CoinGecko"
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <DominanceCard data={data} />
        {!selectedDate && (
          <div className="md:col-span-1 xl:col-span-2 bg-surface border hairline p-5 flex flex-col justify-between">
            <div>
              <div className="caps-sm text-faint mb-3">What this measures</div>
              <p className="font-sans-body text-paper-2 text-[13px] leading-relaxed mb-4">
                <span className="text-paper font-medium">BTC Dominance</span> is
                Bitcoin&apos;s share of the total cryptocurrency market
                capitalization in USD. It measures whether capital is
                concentrating in Bitcoin or rotating into altcoins.
              </p>
              <p className="font-sans-body text-muted text-[12px] leading-relaxed">
                Rising dominance typically signals risk-off rotation into BTC —
                capital seeking the relative safety of the largest asset.
                Falling dominance signals risk-on rotation into altcoins.
                Extreme readings in either direction have historically preceded
                reversals.
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
