import DecisionMetricCard from "@/app/components/dashboard/DecisionMetricCard";
import SectionLabel from "@/app/components/dashboard/SectionLabel";
import { BLANK_DECISION_METRIC } from "@/app/lib/decision-dashboard";
import type { DecisionMetric } from "@/app/types/asset-dashboard";

interface DecisionMetricsSectionProps<TKey extends string> {
  keys: readonly TKey[];
  labels: Record<TKey, string>;
  metrics: Partial<Record<TKey, DecisionMetric>> | null;
  numeral: string;
  seeds: Record<TKey, number[]>;
  subtitle: string;
  title: string;
  sparklinePadding?: number;
}

export default function DecisionMetricsSection<TKey extends string>({
  keys,
  labels,
  metrics,
  numeral,
  seeds,
  subtitle,
  title,
  sparklinePadding,
}: DecisionMetricsSectionProps<TKey>) {
  return (
    <section>
      <SectionLabel
        numeral={numeral}
        title={title}
        subtitle={subtitle}
        variant="compact"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {keys.map((key) => (
          <DecisionMetricCard
            key={key}
            label={labels[key]}
            metric={metrics?.[key] ?? BLANK_DECISION_METRIC}
            sparkline={seeds[key] ?? []}
            sparklinePadding={sparklinePadding}
          />
        ))}
      </div>
    </section>
  );
}
