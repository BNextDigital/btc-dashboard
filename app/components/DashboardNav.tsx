"use client";

/**
 * app/components/DashboardNav.tsx — Shared Dashboard Navigation
 *
 * TWO EXPORTS:
 *
 * 1. Default export: <DashboardNav>
 *    Full self-contained header — title, live dot, nav pills, flush button.
 *    Use on all the new dashboard pages (macro, liquidity, forex, growth,
 *    equity, commodities, sector-flows).
 *
 *    <DashboardNav
 *      current="macro"
 *      title="Macro Dashboard"
 *      lastUpdated={lastUpdated}
 *      onFlush={flushCache}
 *    />
 *
 * 2. Named export: <NavLinks>
 *    Just the row of nav pills — no wrapper, no title, no lastUpdated.
 *    Drop into an EXISTING custom header (like the BTC page's bespoke
 *    <Header> component) to replace a hardcoded list of nav links.
 *
 *    import { NavLinks } from "@/components/DashboardNav";
 *    <NavLinks current="btc" />
 *
 * ─────────────────────────────────────────────────────────────────────
 * TO ADD A NEW PAGE:
 *   1. Add one entry to NAV_ITEMS below.
 *   2. Every page using DashboardNav or NavLinks gets it automatically.
 * ─────────────────────────────────────────────────────────────────────
 */

// ─── Nav registry ─────────────────────────────────────────────────────────────

export const NAV_ITEMS = [
  { key: "btc",          href: "/",            label: "BTC" },
  { key: "macro",        href: "/macro",        label: "Macro" },
  { key: "liquidity",    href: "/liquidity",    label: "Liquidity" },
  { key: "forex",        href: "/forex",        label: "Forex" },
  { key: "growth",       href: "/growth",       label: "Growth" },
  { key: "equity",       href: "/equity",       label: "Equity" },
  { key: "commodities",  href: "/commodities",  label: "Commodities" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

// ─── NavLinks — bare pills only, for embedding in a custom header ──────────────

interface NavLinksProps {
  current: NavKey;
  className?: string;
}

export function NavLinks({ current, className }: NavLinksProps) {
  return (
    <nav className={`flex gap-1 flex-wrap ${className ?? ""}`}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === current;
        if (isActive) {
          return (
            <span
              key={item.key}
              className="text-xs px-3 py-1.5 rounded-md border font-mono"
              style={{
                background:   "#1C1C1E",
                color:        "#D9A84D",
                borderColor:  "#3A3228",
              }}
            >
              {item.label}
            </span>
          );
        }
        return (
          <a
            key={item.key}
            href={item.href}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

// ─── DashboardNav — full header for simple pages ──────────────────────────────

interface DashboardNavProps {
  current: NavKey;
  title?: string;
  lastUpdated?: string | null;
  onFlush?: () => void | Promise<void>;
}

export default function DashboardNav({
  current,
  title,
  lastUpdated,
  onFlush,
}: DashboardNavProps) {
  const activeItem   = NAV_ITEMS.find((n) => n.key === current);
  const displayTitle = title ?? activeItem?.label ?? current;

  return (
    <header className="flex items-center justify-between pb-4 border-b border-slate-900 flex-wrap gap-4">
      {/* Left: title + live indicator */}
      <div className="flex items-baseline gap-4">
        <h1
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize:   24,
            fontWeight: 400,
          }}
        >
          {displayTitle}
        </h1>
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          {lastUpdated ? `Updated ${lastUpdated} UTC` : "Loading…"}
        </div>
      </div>

      {/* Right: nav links + flush button */}
      <div className="flex gap-1 flex-wrap items-center">
        <NavLinks current={current} />
        {onFlush && (
          <button
            onClick={onFlush}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-600 hover:text-slate-300 hover:border-slate-600 transition-colors font-mono"
          >
            ↺ flush
          </button>
        )}
      </div>
    </header>
  );
}
