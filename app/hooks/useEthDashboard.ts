"use client";

import { useAssetDashboard } from "@/app/hooks/useAssetDashboard";
import type {
  EthMetrics,
  EthPrice,
  EthStructural,
  EthTvlResponse,
} from "@/app/types/eth-dashboard";

export function useEthDashboard() {
  const dashboard = useAssetDashboard<
    EthMetrics,
    EthPrice,
    EthTvlResponse,
    EthStructural
  >({
    basePath: "/eth",
    signaturePath: "structural",
  });

  return {
    ...dashboard,
    structural: dashboard.signature,
  };
}
