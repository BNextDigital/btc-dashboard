"use client";

/**
 * app/components/DashboardNav.tsx — Shared Dashboard Navigation
 *
 * Usage in any page:
 *   import DashboardNav from "@/components/DashboardNav";
 *   <DashboardNav current="macro" lastUpdated={lastUpdated} onFlush={flushCache} />
 *
 * Props:
 *   current     — key matching NAV_ITEMS[n].key — highlights that item as active
 *   title       — page title shown left of the live dot (optional, uses nav label if omitted)
 *   lastUpdated — "HH:MM" string from the page, shown as "Updated HH:MM UTC"
 *   onFlush     — flush cache handler (optional — hides button if not provided)
 *
 * To add a new page:
 *   1. Add one entry to NAV_ITEMS below
 *   2. That's it — every page using this component gets the new link automatically
 */

// ─── Nav registry ─────────────────────────────────────────────────────────────
// Add new pages here. Order determines display order in the nav bar.
const NAV_ITEMS = [
  { key: "btc",          href: "/",            label: "BTC" },
  { key: "macro",        href: "/macro",        label: "Macro" },
  { key: "liquidity",    href: "/liquidity",    label: "Liquidity" },
  { key: "forex",        href: "/forex",        label: "Forex" },
  { key: "growth",       href: "/growth",       label: "Growth" },
  { key: "equity",       href: "/equity",       label: "Equity" },
  { key: "commodities",  href: "/commodities",  label: "Commodities" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardNavProps {
  /** Which nav item to highlight as active. */
  current: NavKey;
  /** Page title shown in the header left side. Defaults to the nav label. */
  title?: string;
  /** "HH:MM" from the page's lastUpdated state — shown as "Updated HH:MM UTC". */
  lastUpdated?: string | null;
  /** Flush cache handler. If omitted, the flush button is hidden. */
  onFlush?: () => void | Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardNav({
  current,
  title,
  lastUpdated,
  onFlush,
}: DashboardNavProps) {
  const activeItem = NAV_ITEMS.find((n) => n.key === current);
  const displayTitle = title ?? activeItem?.label ?? current;

  return (
    <header className="flex items-center justify-between pb-4 border-b border-slate-900 flex-wrap gap-4">
      {/* ── Left: title + live indicator ── */}
      <div className="flex items-baseline gap-4">
        <h1
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 24,
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

      {/* ── Right: nav links + flush ── */}
      <nav className="flex gap-1 flex-wrap">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === current;
          if (isActive) {
            return (
              <span
                key={item.key}
                className="text-xs px-3 py-1.5 rounded-md border font-mono"
                style={{
                  background: "#1C1C1E",
                  color: "#D9A84D",
                  borderColor: "#3A3228",
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

        {onFlush && (
          <button
            onClick={onFlush}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-800 text-slate-600 hover:text-slate-300 hover:border-slate-600 transition-colors font-mono"
          >
            ↺ flush
          </button>
        )}
      </nav>
    </header>
  );
}
