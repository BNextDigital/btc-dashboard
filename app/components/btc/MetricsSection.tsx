"use client";

import { AlertCircle } from "lucide-react";
import EtfAumCard from "@/app/components/btc/EtfAumCard";
import FundingCard from "@/app/components/btc/FundingCard";
import MetricCard from "@/app/components/btc/MetricCard";
import type {
  EtfAumData,
  Metric,
} from "@/app/types/btc-dashboard";

interface MetricsSectionProps {
  apiBaseUrl?: string;
  error: string | null;
  etfAum: EtfAumData | null;
  fromCache: boolean;
  historicalError: string | null;
  historicalLoading: boolean;
  historicalMetrics: Metric[] | null;
  loading: boolean;
  metrics: Metric[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

function LoadingCards({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  return Array.from({ length: count }).map((_, index) => (
    <div
      key={index}
      className="bg-surface border hairline p-4 h-[260px] fade-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="caps-sm text-faint">{label}</div>
    </div>
  ));
}

function MetricCards({ metrics }: { metrics: Metric[] }) {
  return metrics.map((metric, index) =>
    metric.id === "funding" ? (
      <FundingCard key={metric.id} metric={metric} />
    ) : (
      <MetricCard key={metric.id} metric={metric} index={index} />
    ),
  );
}

export default function MetricsSection({
  apiBaseUrl,
  error,
  etfAum,
  fromCache,
  historicalError,
  historicalLoading,
  historicalMetrics,
  loading,
  metrics,
  selectedDate,
  setSelectedDate,
}: MetricsSectionProps) {
  return (
    <section>
      <div className="flex items-end justify-between mb-5 hairline-b pb-3">
        <div className="flex items-baseline gap-4">
          <span className="font-display-italic text-amber-sand text-[28px] leading-none">
            I
          </span>
          <h2 className="font-display text-paper text-[26px] leading-none">
            Market state snapshot
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="caps-sm text-faint">Snapshot date</span>
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="bg-surface-inset border hairline px-2.5 py-1.5 text-paper font-mono-data text-[11px] focus:border-amber-sand focus:outline-none cursor-pointer"
              style={{ colorScheme: "dark" }}
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="caps-sm text-faint hover:text-alert-extreme transition-colors px-2 py-1.5 border hairline"
              >
                ✕ Live
              </button>
            )}
          </div>
          <span className="caps-sm text-faint">
            {selectedDate
              ? "Historical snapshot"
              : loading
                ? "Fetching fresh data…"
                : fromCache
                  ? "Cached · refreshing…"
                  : "Benchmark · alert · pattern · no judgment"}
          </span>
        </div>
      </div>

      {selectedDate && (
        <div className="border border-[rgba(55,138,221,0.35)] bg-[rgba(55,138,221,0.08)] px-5 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-[6px] h-[6px] rounded-full"
              style={{ backgroundColor: "#378ADD" }}
            />
            <span className="font-sans-body text-[#378ADD] text-[12px]">
              Viewing historical snapshot —{" "}
              <span className="font-mono-data">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </span>
            </span>
          </div>
          <span className="caps-sm text-[#378ADD]">
            {historicalMetrics?.length ?? 0} metrics found
          </span>
        </div>
      )}

      {selectedDate && historicalError && (
        <div className="border border-extreme bg-extreme-10 p-5 mb-3">
          <div className="caps-sm text-alert-extreme mb-1 flex items-center gap-1.5">
            <AlertCircle size={10} /> No data for this date
          </div>
          <p className="font-sans-body text-paper-2 text-[12px]">
            {historicalError}
          </p>
        </div>
      )}

      {!selectedDate && error && (
        <div className="border border-extreme bg-extreme-10 p-5 mb-3">
          <div className="caps-sm text-alert-extreme mb-2 flex items-center gap-1.5">
            <AlertCircle size={10} /> Backend error
          </div>
          <p className="font-sans-body text-paper-2 text-[12px] leading-relaxed">
            Could not reach{" "}
            <span className="font-mono-data">{apiBaseUrl}/metrics</span> —{" "}
            {error}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {selectedDate ? (
          historicalLoading ? (
            <LoadingCards count={6} label="Loading historical data…" />
          ) : (
            <MetricCards metrics={historicalMetrics ?? []} />
          )
        ) : loading && metrics.length === 0 ? (
          <LoadingCards count={8} label="Loading…" />
        ) : (
          <MetricCards metrics={metrics} />
        )}
        {!selectedDate && etfAum && <EtfAumCard data={etfAum} />}
      </div>
    </section>
  );
}
