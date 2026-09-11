import type { DashboardCache } from "@/app/types/btc-dashboard";

const METRICS_CACHE_KEY = "btc_dashboard_v2";

export function readDashboardCache(): DashboardCache | null {
  try {
    const raw = window.localStorage.getItem(METRICS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as DashboardCache) : null;
  } catch {
    return null;
  }
}

export function updateDashboardCache(patch: Partial<DashboardCache>): void {
  try {
    const current = readDashboardCache() ?? {};

    window.localStorage.setItem(
      METRICS_CACHE_KEY,
      JSON.stringify({ ...current, ...patch, ts: Date.now() }),
    );
  } catch {
    // Browser storage can be unavailable or full. Live data still works.
  }
}

export function clearDashboardCache(): void {
  try {
    window.localStorage.removeItem(METRICS_CACHE_KEY);
  } catch {
    // Refreshing live data does not depend on browser storage being available.
  }
}
