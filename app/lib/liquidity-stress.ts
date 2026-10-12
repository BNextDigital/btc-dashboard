import type { PerpsPressureData, SpotDepthData } from "@/app/types/btc-dashboard";

export interface StressAssumptions {
  unwindPct: number;
  spotTransmissionPct: number;
  retainedDepthPct: number;
}

// Exploration defaults, not calibrated liquidation probabilities.
export const DEFAULT_STRESS_ASSUMPTIONS: StressAssumptions = {
  unwindPct: 0.5,
  spotTransmissionPct: 10,
  retainedDepthPct: 60,
};
const MAX_AGE_MS = 30 * 60_000;
const MAX_SKEW_MS = 15 * 60_000;

export function parseDepthUsd(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^\$([0-9]+(?:\.[0-9]+)?)([kmbt])?$/i.exec(value.replaceAll(",", ""));
  if (!match) return null;
  const multiplier: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
  const amount = Number(match[1]) * (multiplier[match[2]?.toLowerCase()] ?? 1);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function stressScenario(
  oiUsd: number,
  bidUsd: number,
  askUsd: number,
  assumptions: StressAssumptions,
) {
  const percentages = [assumptions.unwindPct, assumptions.spotTransmissionPct, assumptions.retainedDepthPct];
  if (![oiUsd, bidUsd, askUsd, ...percentages].every(Number.isFinite) ||
      oiUsd <= 0 || bidUsd < 0 || askUsd < 0 ||
      percentages.some((value) => value < 0 || value > 100)) return null;
  const unwindUsd = oiUsd * (assumptions.unwindPct / 100);
  const pressureUsd = unwindUsd * (assumptions.spotTransmissionPct / 100);
  const retainedBidUsd = bidUsd * (assumptions.retainedDepthPct / 100);
  const retainedAskUsd = askUsd * (assumptions.retainedDepthPct / 100);
  return {
    unwindUsd, pressureUsd, retainedBidUsd, retainedAskUsd,
    // A zero-pressure scenario needs no execution capacity; it has no ratio.
    bidCoverage: pressureUsd > 0 ? retainedBidUsd / pressureUsd : null,
    askCoverage: pressureUsd > 0 ? retainedAskUsd / pressureUsd : null,
  };
}

export function liquidityStressInputs(
  depth: SpotDepthData,
  pressure: PerpsPressureData | null,
  now: number | null,
) {
  const unavailable = (reason: string) => ({ ready: false as const, reason });
  if (now === null || !Number.isFinite(now)) return unavailable("Checking snapshot freshness…");
  const depthTime = Date.parse(depth.updated_at);
  const pressureTime = Date.parse(pressure?.updated_at ?? "");
  if (![depthTime, pressureTime].every(Number.isFinite))
    return unavailable("Waiting for dated depth and leverage snapshots.");
  const ages = [now - depthTime, now - pressureTime];
  if (ages.some((age) => age < -60_000 || age > MAX_AGE_MS))
    return unavailable("Snapshots are stale or future-dated. Refresh to model current conditions.");
  if (Math.abs(depthTime - pressureTime) > MAX_SKEW_MS)
    return unavailable("Depth and leverage snapshots are too far apart to combine.");
  const oiAge = depth.oi_age_seconds;
  if (oiAge != null && (!Number.isFinite(oiAge) || oiAge < 0 ||
      oiAge * 1000 + Math.max(0, now - depthTime) > MAX_AGE_MS))
    return unavailable("The underlying open-interest observation is stale.");
  const oiUsd = pressure?.positioning?.oi_usd;
  const bidUsd = parseDepthUsd(depth.visible_depth_usd);
  const askUsd = parseDepthUsd(depth.ask_depth_2_0pct_usd);
  if (oiUsd == null || !Number.isFinite(oiUsd) || oiUsd <= 0 ||
      bidUsd === null || askUsd === null || !depth.venues_online?.length)
    return unavailable("The scenario needs valid open interest and sampled bids and asks.");
  return { ready: true as const, oiUsd, bidUsd, askUsd,
    ageMinutes: Math.max(0, ...ages) / 60_000 };
}

export function pressureContext(pressure: PerpsPressureData | null) {
  // Borrow the existing inferred context; never derive direction from a chosen shock.
  const side = pressure?.state?.primary_side;
  const label = side === "longs" ? "Downside vulnerability context"
    : side === "shorts" ? "Upside vulnerability context"
    : pressure?.state?.code === "balanced" ? "No one-sided pressure confirmed"
    : "Direction unresolved";
  return { label, explanation: pressure?.state?.explanation ?? "Leverage context is unavailable." };
}
