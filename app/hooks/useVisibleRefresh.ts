"use client";

import { useEffect, useRef } from "react";

/** Run once on mount, on cadence while visible, and on return when stale. */
export function useVisibleRefresh(
  refresh: () => void | Promise<void>,
  intervalMs: number,
) {
  const refreshRef = useRef(refresh);
  const lastRunRef = useRef(0);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      lastRunRef.current = Date.now();
      void refreshRef.current();
    };

    const refreshIfVisible = () => {
      if (!document.hidden) run();
    };

    const refreshIfStale = () => {
      if (
        !document.hidden
        && Date.now() - lastRunRef.current >= intervalMs
      ) {
        run();
      }
    };

    run();
    const timer = window.setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfStale);
    window.addEventListener("focus", refreshIfStale);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfStale);
      window.removeEventListener("focus", refreshIfStale);
    };
  }, [intervalMs]);
}
