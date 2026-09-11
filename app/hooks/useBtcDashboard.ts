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

const PRICE_REFRESH_MS = 60_000;
const FAST_REFRESH_MS = 15 * 60_000;
const MARKET_REFRESH_MS = 30 * 60_000;
const HOURLY_REFRESH_MS = 60 * 60_000;

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
    price: false,
    fast: false,
    market: false,
    hourly: false,
    user: false,
  });

  const lastRefreshRef = useRef({
    price: 0,
    fast: 0,
    market: 0,
    hourly: 0,
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

  const refreshPrice = useCallback(async () => {
    if (inFlightRef.current.price) return;
    inFlightRef.current.price = true;

    try {
      const priceData = await fetchJson<PriceData>("/price");
      setPrice(priceData);
      updateDashboardCache({ price: priceData });
      lastRefreshRef.current.price = Date.now();
    } catch (refreshError) {
      console.warn("[price refresh]", refreshError);
    } finally {
      inFlightRef.current.price = false;
    }
  }, []);

  const refreshFast = useCallback(async () => {
    if (inFlightRef.current.fast) return;
    inFlightRef.current.fast = true;

    try {
      const [
        metricsResult,
        summaryResult,
        causalResult,
        premiumResult,
        depthResult,
        perpsResult,
      ] = await Promise.allSettled([
        fetchJson<Record<string, unknown>>("/metrics"),
        fetchJson<SummaryData>("/summary"),
        fetchJson<CausalData>("/causal"),
        fetchJson<PremiumData>("/btc-premium"),
        fetchJson<SpotDepthData & { error?: string }>("/liquidity/depth"),
        fetchJson<PerpsPressureData>("/derivatives/pressure"),
      ]);

      const cachePatch: Parameters<typeof updateDashboardCache>[0] = {};

      if (metricsResult.status === "fulfilled") {
        const data = metricsResult.value;
        const transformed = transformLiveMetricsPayload(data);
        const dedicated = getDedicatedMetrics(data);

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

        setError(null);
        setFromCache(false);
      } else {
        setError(
          metricsResult.reason instanceof Error
            ? metricsResult.reason.message
            : "Metrics refresh failed",
        );
      }

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
        cachePatch.summary = summaryResult.value;
      } else {
        console.warn("[summary refresh]", summaryResult.reason);
      }

      if (causalResult.status === "fulfilled") {
        setCausal(causalResult.value);
        cachePatch.causal = causalResult.value;
      } else {
        console.warn("[causal refresh]", causalResult.reason);
      }

      if (premiumResult.status === "fulfilled") {
        setPremiumData(premiumResult.value);
        cachePatch.premium = premiumResult.value;
      } else {
        console.warn("[premium refresh]", premiumResult.reason);
      }

      if (
        depthResult.status === "fulfilled" &&
        depthResult.value &&
        !depthResult.value.error
      ) {
        setSpotDepth(depthResult.value);
        cachePatch.spotDepth = depthResult.value;
      } else if (depthResult.status === "rejected") {
        console.warn("[depth refresh]", depthResult.reason);
      }

      if (perpsResult.status === "fulfilled" && perpsResult.value) {
        setPerpsPressure(perpsResult.value);
        cachePatch.perpsPressure = perpsResult.value;
      } else if (perpsResult.status === "rejected") {
        console.warn("[perps pressure refresh]", perpsResult.reason);
      }

      if (Object.keys(cachePatch).length > 0) {
        updateDashboardCache(cachePatch);
      }

      lastRefreshRef.current.fast = Date.now();
    } finally {
      inFlightRef.current.fast = false;
      setLoading(false);
    }
  }, []);

  const refreshMarket = useCallback(async () => {
    if (inFlightRef.current.market) return;
    inFlightRef.current.market = true;

    try {
      const data = await fetchJson<{
        crypto_proxies?: Record<string, ProxyStock>;
      }>("/crypto-proxies");

      if (data.crypto_proxies) {
        const stocks = Object.values(data.crypto_proxies);
        setProxyStocks(stocks);
        updateDashboardCache({ proxyStocks: stocks });
      }

      lastRefreshRef.current.market = Date.now();
    } catch (refreshError) {
      console.warn("[proxy stocks refresh]", refreshError);
    } finally {
      inFlightRef.current.market = false;
    }
  }, []);

  const refreshHourly = useCallback(async () => {
    if (inFlightRef.current.hourly) return;
    inFlightRef.current.hourly = true;

    try {
      const [newsResult, etfResult] = await Promise.allSettled([
        fetchJson<{ items?: NewsItem[] }>("/news"),
        fetchJson<EtfAumData>("/etf-aum/metrics"),
      ]);

      const cachePatch: Parameters<typeof updateDashboardCache>[0] = {};

      if (
        newsResult.status === "fulfilled" &&
        Array.isArray(newsResult.value.items)
      ) {
        setNews(newsResult.value.items);
        cachePatch.news = newsResult.value.items;
      } else if (newsResult.status === "rejected") {
        console.warn("[news refresh]", newsResult.reason);
      }

      if (etfResult.status === "fulfilled") {
        setEtfAum(etfResult.value);
        cachePatch.etfAum = etfResult.value;
      } else {
        console.warn("[ETF AUM refresh]", etfResult.reason);
      }

      if (Object.keys(cachePatch).length > 0) {
        updateDashboardCache(cachePatch);
      }

      lastRefreshRef.current.hourly = Date.now();
    } finally {
      inFlightRef.current.hourly = false;
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
      await Promise.all([
        refreshPrice(),
        refreshFast(),
        refreshMarket(),
        refreshHourly(),
        refreshUserData(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    refreshFast,
    refreshHourly,
    refreshMarket,
    refreshPrice,
    refreshUserData,
  ]);

  useEffect(() => {
    const initialRefreshTimer = window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        void refreshPrice();
        void refreshFast();
        void refreshMarket();
        void refreshHourly();
        void refreshUserData();
      }
    }, 0);

    const runVisible = (refresh: () => Promise<void>) => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    const priceTimer = window.setInterval(
      () => runVisible(refreshPrice),
      PRICE_REFRESH_MS,
    );
    const fastTimer = window.setInterval(
      () => runVisible(refreshFast),
      FAST_REFRESH_MS,
    );
    const marketTimer = window.setInterval(
      () => runVisible(refreshMarket),
      MARKET_REFRESH_MS,
    );
    const hourlyTimer = window.setInterval(
      () => runVisible(refreshHourly),
      HOURLY_REFRESH_MS,
    );

    const refreshStaleGroups = () => {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();

      if (now - lastRefreshRef.current.price >= PRICE_REFRESH_MS) {
        void refreshPrice();
      }
      if (now - lastRefreshRef.current.fast >= FAST_REFRESH_MS) {
        void refreshFast();
      }
      if (now - lastRefreshRef.current.market >= MARKET_REFRESH_MS) {
        void refreshMarket();
      }
      if (now - lastRefreshRef.current.hourly >= HOURLY_REFRESH_MS) {
        void refreshHourly();
      }
    };

    document.addEventListener("visibilitychange", refreshStaleGroups);
    window.addEventListener("focus", refreshStaleGroups);

    return () => {
      window.clearTimeout(initialRefreshTimer);
      window.clearInterval(priceTimer);
      window.clearInterval(fastTimer);
      window.clearInterval(marketTimer);
      window.clearInterval(hourlyTimer);
      document.removeEventListener("visibilitychange", refreshStaleGroups);
      window.removeEventListener("focus", refreshStaleGroups);
    };
  }, [
    refreshFast,
    refreshHourly,
    refreshMarket,
    refreshPrice,
    refreshUserData,
  ]);

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
