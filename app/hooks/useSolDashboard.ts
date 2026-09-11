"use client";

import { useAssetDashboard } from "@/app/hooks/useAssetDashboard";
import type {
  OusdStatus,
  SolMetrics,
  SolPrice,
  SolTvlResponse,
} from "@/app/types/sol-dashboard";

export function useSolDashboard() {
  const dashboard = useAssetDashboard<
    SolMetrics,
    SolPrice,
    SolTvlResponse,
    OusdStatus
  >({
    basePath: "/sol",
    signaturePath: "ousd-status",
  });

  return {
    ...dashboard,
    ousd: dashboard.signature,
  };
}
