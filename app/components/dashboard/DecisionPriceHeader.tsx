import { formatPercent, formatPrice } from "@/app/lib/decision-dashboard";
import type { DecisionPrice } from "@/app/types/asset-dashboard";

interface DecisionPriceHeaderProps {
  price: DecisionPrice | null;
  secondary?: { label: string; value: string } | null;
}

export default function DecisionPriceHeader({
  price,
  secondary,
}: DecisionPriceHeaderProps) {
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-4xl text-slate-100">
          {formatPrice(price?.price ?? null)}
        </span>
        <span
          className={`font-mono text-lg font-medium ${
            (price?.change_24h ?? 0) >= 0 ? "text-green-500" : "text-red-400"
          }`}
        >
          {formatPercent(price?.change_24h ?? null)}
        </span>
        <span className="text-sm text-slate-600 font-mono">24h</span>
      </div>
      <div className="text-sm text-slate-600 font-mono">
        7d{" "}
        <span
          className={
            (price?.change_7d ?? 0) >= 0 ? "text-green-500" : "text-red-400"
          }
        >
          {formatPercent(price?.change_7d ?? null)}
        </span>
      </div>
      {secondary && (
        <div className="text-sm text-slate-600 font-mono">
          {secondary.label}{" "}
          <span className="text-slate-400">{secondary.value}</span>
        </div>
      )}
    </div>
  );
}
