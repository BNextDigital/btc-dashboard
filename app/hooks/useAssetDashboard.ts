"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DECISION_DASHBOARD_API,
  DECISION_REFRESH_MS,
} from "@/app/lib/decision-dashboard";
import type {
  DecisionPrice,
  DecisionSummary,
} from "@/app/types/asset-dashboard";

interface AssetDashboardOptions {
  basePath: string;
  signaturePath: string;
  refreshMs?: number;
}

interface AssetDashboardBundle<TMetrics, TPrice, TTvl, TSignature> {
  metrics?: TMetrics;
  price?: TPrice;
  summary?: DecisionSummary;
  tvl?: TTvl;
  signature?: TSignature;
}

async function readIfOk<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export function useAssetDashboard<
  TMetrics,
  TPrice extends DecisionPrice,
  TTvl,
  TSignature,
>({
  basePath,
  signaturePath,
  refreshMs = DECISION_REFRESH_MS,
}: AssetDashboardOptions) {
  const [metrics, setMetrics] = useState<TMetrics | null>(null);
  const [price, setPrice] = useState<TPrice | null>(null);
  const [summary, setSummary] = useState<DecisionSummary | null>(null);
  const [tvl, setTvl] = useState<TTvl | null>(null);
  const [signature, setSignature] = useState<TSignature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const asset = basePath.replace(/^\//, "");
      const bundleResponse = await fetch(
        `${DECISION_DASHBOARD_API}/dashboard/${asset}`,
        { cache: "no-cache" },
      );

      let bundle: AssetDashboardBundle<TMetrics, TPrice, TTvl, TSignature>;

      if (bundleResponse.ok) {
        bundle = (await bundleResponse.json()) as AssetDashboardBundle<
          TMetrics,
          TPrice,
          TTvl,
          TSignature
        >;
      } else {
        // Deployment-safe fallback while the new backend bundle rolls out.
        const responses = await Promise.all([
          fetch(`${DECISION_DASHBOARD_API}${basePath}/metrics`),
          fetch(`${DECISION_DASHBOARD_API}${basePath}/price`),
          fetch(`${DECISION_DASHBOARD_API}${basePath}/summary`),
          fetch(`${DECISION_DASHBOARD_API}${basePath}/tvl`),
          fetch(`${DECISION_DASHBOARD_API}${basePath}/${signaturePath}`),
        ]);
        const [legacyMetrics, legacyPrice, legacySummary, legacyTvl, legacySignature] =
          await Promise.all([
            readIfOk<TMetrics>(responses[0]),
            readIfOk<TPrice>(responses[1]),
            readIfOk<DecisionSummary>(responses[2]),
            readIfOk<TTvl>(responses[3]),
            readIfOk<TSignature>(responses[4]),
          ]);
        bundle = {
          metrics: legacyMetrics ?? undefined,
          price: legacyPrice ?? undefined,
          summary: legacySummary ?? undefined,
          tvl: legacyTvl ?? undefined,
          signature: legacySignature ?? undefined,
        };
      }

      const nextMetrics = bundle.metrics ?? null;
      const nextPrice = bundle.price ?? null;
      const nextSummary = bundle.summary ?? null;
      const nextTvl = bundle.tvl ?? null;
      const nextSignature = bundle.signature ?? null;

      if (nextMetrics) setMetrics(nextMetrics);
      if (nextPrice) setPrice(nextPrice);
      if (nextSummary) setSummary(nextSummary);
      if (nextTvl) setTvl(nextTvl);
      if (nextSignature) setSignature(nextSignature);

      setLastUpdated(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
      setError(null);
    } catch (fetchError: unknown) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Fetch failed — check backend",
      );
    } finally {
      setLoading(false);
    }
  }, [basePath, signaturePath]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void fetchAll();
    }, 0);
    const refreshTimer = window.setInterval(() => {
      void fetchAll();
    }, refreshMs);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(refreshTimer);
    };
  }, [fetchAll, refreshMs]);

  return {
    error,
    lastUpdated,
    loading,
    metrics,
    price,
    refresh: fetchAll,
    signature,
    summary,
    tvl,
  };
}
