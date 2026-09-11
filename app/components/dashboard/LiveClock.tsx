"use client";

import { useEffect, useState } from "react";

interface LiveClockProps {
  utc?: boolean;
  includeDate?: boolean;
}

export default function LiveClock({
  utc = false,
  includeDate = false,
}: LiveClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const options: Intl.DateTimeFormatOptions = includeDate
    ? {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        ...(utc ? { timeZone: "UTC", timeZoneName: "short" } : {}),
      }
    : {
        hour: "2-digit",
        minute: "2-digit",
        ...(utc ? { timeZone: "UTC" } : {}),
      };

  return (
    <span className="caps-sm text-faint" suppressHydrationWarning>
      {now.toLocaleString("en-US", options)}
    </span>
  );
}
