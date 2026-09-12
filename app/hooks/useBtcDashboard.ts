"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clearDashboardCache,
  readDashboardCache,
  updateDashboardCache,
} from "@/app/lib/dashboard-cache";
import { fetchJson, getApiUrl } from "@/app/lib/dashboard-api";
import {
  getDedicatedMetrics,
  transformHistoricalMetricsPayload,
  transformLiveMetricsPayload,
} from "@/app/lib/metric-transformers";
import type {
  BtcDashboardBundle,
  CausalData,
  DominanceData,
  EtfAumData,
  JudgmentState,
  Metric,
  NewsItem,
  PerpsPressureData,
  PremiumData,
  PriceData,
  ProxyStock,
  SpotDepthData,
  StablecoinData,
  SummaryData,
  TradeExecution,
  TradeLog,
} from "@/app/types/btc-dashboard";

const DASHBOARD_REFRESH_MS = 15 * 60_000;

const EMPTY_JUDGMENT: JudgmentState = {
  read: "",
  supports: "",
  contradicts: "",
  invalidates: "",
  plan: "",
  risk: null,
};

interface HistoricalMetricsResponse {
  error?: string;
  count?: number;
  metrics?: Record<string, unknown>;
}

async function fetchLegacyBtcBundle(): Promise<BtcDashboardBundle> {
  const optional = async <T,>(path: string): Promise<T | undefined> => {
    try {
      return await fetchJson<T>(path);
    } catch (error) {
      console.warn(`[legacy dashboard] ${path}`, error);
      return undefined;
    }
  };

  const [
    price,
    metrics,
    summary,
    causal,
    premium,
    spotDepth,
    perpsPressure,
    proxyStocks,
    news,
    etfAum,
  ] = await Promise.all([
    optional<PriceData>("/price"),
    optional<Record<string, unknown>>("/metrics"),
    optional<SummaryData>("/summary"),
    optional<CausalData>("/causal"),
    optional<PremiumData>("/btc-premium"),
    optional<SpotDepthData & { error?: string }>("/liquidity/depth"),
    optional<PerpsPressureData>("/derivatives/pressure"),
    optional<{ crypto_proxies?: Record<string, ProxyStock> }>(
      "/crypto-proxies",
    ),
    optional<{ items?: NewsItem[] }>("/news"),
    optional<EtfAumData>("/etf-aum/metrics"),
  ]);

  if (!metrics) {
    throw new Error("Metrics refresh failed");
  }

  return {
    asset: "btc",
    revision: "legacy",
    price,
    metrics,
    summary,
    causal,
    premium,
    spotDepth,
    perpsPressure,
    proxyStocks,
    news,
    etfAum,
  };
}

async function fetchBtcBundle(): Promise<BtcDashboardBundle> {
  try {
    return await fetchJson<BtcDashboardBundle>("/dashboard/btc", {
      cache: "no-cache",
    });
  } catch (error) {
    console.warn("[dashboard bundle] using compatibility routes", error);
    return fetchLegacyBtcBundle();
  }
}

export function useBtcDashboard() {
  const [judgment, setJudgment] = useState<JudgmentState>(EMPTY_JUDGMENT);
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [stablecoinData, setStablecoinData] =
    useState<StablecoinData | null>(null);
  const [dominanceData, setDominanceData] =
    useState<DominanceData | null>(null);
  const [premiumData, setPremiumData] = useState<PremiumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState<PriceData>({
    price: "–",
    change_24h: "+",
  });
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [causal, setCausal] = useState<CausalData | null>(null);
  const [executions, setExecutions] = useState<TradeExecution[]>([]);
  const [proxyStocks, setProxyStocks] = useState<ProxyStock[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [etfAum, setEtfAum] = useState<EtfAumData | null>(null);
  const [spotDepth, setSpotDepth] = useState<SpotDepthData | null>(null);
  const [perpsPressure, setPerpsPressure] =
    useState<PerpsPressureData | null>(null);

  const [selectedDateValue, setSelectedDateValue] = useState("");
  const [historicalMetrics, setHistoricalMetrics] =
    useState<Metric[] | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const [historicalStablecoin, setHistoricalStablecoin] =
    useState<StablecoinData | null>(null);
  const [historicalDominance, setHistoricalDominance] =
    useState<DominanceData | null>(null);

  const inFlightRef = useRef({
    dashboard: false,
    user: false,
  });

  const lastRefreshRef = useRef({
    dashboard: 0,
  });

  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateValue(date);

    if (!date) {
      setHistoricalMetrics(null);
      setHistoricalStablecoin(null);
      setHistoricalDominance(null);
      setHistoricalError(null);
    }
  }, []);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const cached = readDashboardCache();
      if (!cached) return;

      let restored = false;

      if (cached.metrics) {
        setMetrics(cached.metrics);
        restored = true;
      }
      if (cached.stablecoin) {
        setStablecoinData(cached.stablecoin);
        restored = true;
      }
      if (cached.dominance) {
        setDominanceData(cached.dominance);
        restored = true;
      }
      if (cached.price) {
        setPrice(cached.price);
        restored = true;
      }
      if (cached.summary) {
        setSummary(cached.summary);
        restored = true;
      }
      if (cached.news) {
        setNews(cached.news);
        restored = true;
      }
      if (cached.causal) {
        setCausal(cached.causal);
        restored = true;
      }
      if (cached.premium) {
        setPremiumData(cached.premium);
        restored = true;
      }
      if (cached.spotDepth) {
        setSpotDepth(cached.spotDepth);
        restored = true;
      }
      if (cached.perpsPressure) {
        setPerpsPressure(cached.perpsPressure);
        restored = true;
      }
      if (cached.proxyStocks) {
        setProxyStocks(cached.proxyStocks);
        restored = true;
      }
      if (cached.etfAum) {
        setEtfAum(cached.etfAum);
        restored = true;
      }

      if (restored) {
        setLoading(false);
        setFromCache(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (inFlightRef.current.dashboard) return;
    inFlightRef.current.dashboard = true;

    try {
      const bundle = await fetchBtcBundle();
      const cachePatch: Parameters<typeof updateDashboardCache>[0] = {};

      if (!bundle.metrics) {
        throw new Error("Dashboard bundle did not include metrics");
      }

      const transformed = transformLiveMetricsPayload(bundle.metrics);
      const dedicated = getDedicatedMetrics(bundle.metrics);
      setMetrics(transformed);
      cachePatch.metrics = transformed;

      if (dedicated.stablecoin) {
        setStablecoinData(dedicated.stablecoin);
        cachePatch.stablecoin = dedicated.stablecoin;
      }
      if (dedicated.dominance) {
        setDominanceData(dedicated.dominance);
        cachePatch.dominance = dedicated.dominance;
      }
      if (bundle.price) {
        setPrice(bundle.price);
        cachePatch.price = bundle.price;
      }
      if (bundle.summary) {
        setSummary(bundle.summary);
        cachePatch.summary = bundle.summary;
      }
      if (bundle.causal) {
        setCausal(bundle.causal);
        cachePatch.causal = bundle.causal;
      }
      if (bundle.premium) {
        setPremiumData(bundle.premium);
        cachePatch.premium = bundle.premium;
      }
      if (bundle.spotDepth && !bundle.spotDepth.error) {
        setSpotDepth(bundle.spotDepth);
        cachePatch.spotDepth = bundle.spotDepth;
      }
      if (bundle.perpsPressure) {
        setPerpsPressure(bundle.perpsPressure);
        cachePatch.perpsPressure = bundle.perpsPressure;
      }
      if (bundle.proxyStocks?.crypto_proxies) {
        const stocks = Object.values(bundle.proxyStocks.crypto_proxies);
        setProxyStocks(stocks);
        cachePatch.proxyStocks = stocks;
      }
      if (Array.isArray(bundle.news?.items)) {
        setNews(bundle.news.items);
        cachePatch.news = bundle.news.items;
      }
      if (bundle.etfAum) {
        setEtfAum(bundle.etfAum);
        cachePatch.etfAum = bundle.etfAum;
      }

      updateDashboardCache(cachePatch);
      setError(null);
      setFromCache(false);
      lastRefreshRef.current.dashboard = Date.now();
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Dashboard refresh failed",
      );
    } finally {
      inFlightRef.current.dashboard = false;
      setLoading(false);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (inFlightRef.current.user) return;
    inFlightRef.current.user = true;

    try {
      const [tradeLogResult, executionResult] = await Promise.allSettled([
        fetchJson<TradeLog[]>("/trade-log"),
        fetchJson<TradeExecution[]>("/trade-execution"),
      ]);

      if (tradeLogResult.status === "fulfilled") {
        setLogs(Array.isArray(tradeLogResult.value) ? tradeLogResult.value : []);
      } else {
        console.warn("[trade log refresh]", tradeLogResult.reason);
      }

      if (executionResult.status === "fulfilled") {
        setExecutions(
          Array.isArray(executionResult.value) ? executionResult.value : [],
        );
      } else {
        console.warn("[trade execution refresh]", executionResult.reason);
      }
    } finally {
      inFlightRef.current.user = false;
    }
  }, []);

  const refreshNow = useCallback(async () => {
    setRefreshing(true);

    try {
      clearDashboardCache();
      await Promise.all([refreshDashboard(), refreshUserData()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshDashboard, refreshUserData]);

  useEffect(() => {
    const initialRefreshTimer = window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        void refreshDashboard();
        void refreshUserData();
      }
    }, 0);

    const runVisible = (refresh: () => Promise<void>) => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    const dashboardTimer = window.setInterval(
      () => runVisible(refreshDashboard),
      DASHBOARD_REFRESH_MS,
    );

    const refreshStaleGroups = () => {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();

      if (
        now - lastRefreshRef.current.dashboard >= DASHBOARD_REFRESH_MS
      ) {
        void refreshDashboard();
      }
    };

    document.addEventListener("visibilitychange", refreshStaleGroups);
    window.addEventListener("focus", refreshStaleGroups);

    return () => {
      window.clearTimeout(initialRefreshTimer);
      window.clearInterval(dashboardTimer);
      document.removeEventListener("visibilitychange", refreshStaleGroups);
      window.removeEventListener("focus", refreshStaleGroups);
    };
  }, [refreshDashboard, refreshUserData]);

  useEffect(() => {
    if (!selectedDateValue) return;

    const fetchHistorical = async () => {
      setHistoricalLoading(true);
      setHistoricalError(null);

      try {
        const response = await fetch(
          getApiUrl(`/metrics/history?date=${selectedDateValue}`),
          { cache: "no-store" },
        );
        const payload = (await response.json()) as HistoricalMetricsResponse;

        if (payload.error || payload.count === 0 || !payload.metrics) {
          setHistoricalError(
            payload.error ?? `No data found for ${selectedDateValue}`,
          );
          setHistoricalMetrics([]);
          return;
        }

        const dedicated = getDedicatedMetrics(payload.metrics);
        setHistoricalStablecoin(dedicated.stablecoin);
        setHistoricalDominance(dedicated.dominance);
        setHistoricalMetrics(
          transformHistoricalMetricsPayload(
            payload.metrics,
            selectedDateValue,
          ),
        );
      } catch (historicalFetchError) {
        setHistoricalError(
          historicalFetchError instanceof Error
            ? historicalFetchError.message
            : "Fetch failed",
        );
      } finally {
        setHistoricalLoading(false);
      }
    };

    const historicalTimer = window.setTimeout(() => {
      void fetchHistorical();
    }, 0);

    return () => window.clearTimeout(historicalTimer);
  }, [selectedDateValue]);

  const alertCounts = useMemo(
    () => ({
      extreme: metrics.filter((metric) => metric.alertLevel === "extreme")
        .length,
      notable: metrics.filter((metric) => metric.alertLevel === "notable")
        .length,
    }),
    [metrics],
  );

  const sortedProxyStocks = useMemo(
    () => [...proxyStocks].sort((a, b) => b.corr_30d - a.corr_30d),
    [proxyStocks],
  );

  return {
    alertCounts,
    causal,
    dominanceData,
    error,
    etfAum,
    executions,
    fromCache,
    historicalDominance,
    historicalError,
    historicalLoading,
    historicalMetrics,
    historicalStablecoin,
    judgment,
    loading,
    logs,
    metrics,
    news,
    perpsPressure,
    premiumData,
    price,
    proxyStocks: sortedProxyStocks,
    refreshing,
    refreshNow,
    refreshUserData,
    selectedDate: selectedDateValue,
    setJudgment,
    setSelectedDate,
    spotDepth,
    stablecoinData,
    summary,
  };
}
