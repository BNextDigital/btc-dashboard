"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const PAGE_SIZE = 75;

// ─── Types ────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

interface DbConfig {
  id: string;
  label: string;
  fetchFn: () => Promise<Row[]>;
}

// ─── Database configs ─────────────────────────────────────────────────────────

const DATABASES: DbConfig[] = [
  {
    id: "manual_history",
    label: "manual_history",
    fetchFn: async () => {
      const metrics = [
        "exchange_netflow", "lth_supply", "etf_flow",
        "realized_cap", "funding", "open_interest", "cme_basis",
      ];
      const all: Row[] = [];
      for (const m of metrics) {
        try {
          const res = await fetch(`${API}/history/${m}?days=365`);
          if (!res.ok) continue;
          const d = await res.json();
          if (d?.entries) d.entries.forEach((e: Row) => all.push({ metric: m, ...e }));
        } catch {}
      }
      return all;
    },
  },
  {
    id: "basis_history",
    label: "basis_history",
    fetchFn: async () => {
      const res = await fetch(`${API}/db/basis/query/cme_basis?limit=1000`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      return Array.isArray(d) ? d : d.rows ?? d.entries ?? [];
    },
  },
  {
    id: "stablecoin_history",
    label: "stablecoin_history",
    fetchFn: async () => {
      const res = await fetch(`${API}/db/stablecoin/query/stablecoin_supply?limit=1000`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      return Array.isArray(d) ? d : d.rows ?? d.entries ?? [];
    },
  },
  {
    id: "btc_dominance",
    label: "btc_dominance_history",
    fetchFn: async () => {
      const res = await fetch(`${API}/db/dominance/query/btc_dominance?limit=1000`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      return Array.isArray(d) ? d : d.rows ?? d.entries ?? [];
    },
  },
  {
    id: "oi_history",
    label: "oi_history",
    fetchFn: async () => {
      const res = await fetch(`${API}/db/oi/query/oi_snapshots?limit=500`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      return Array.isArray(d) ? d : d.rows ?? d.entries ?? [];
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCell(col: string, v: unknown): { text: string; cls: string } {
  if (v === null || v === undefined || v === "") return { text: "—", cls: "text-[#55534B]" };
  if (col === "date" || col === "stored_at" || col === "baseline_date")
    return { text: String(v), cls: "font-mono-data text-[#55534B]" };
  if (typeof v === "number") {
    const text = Number.isInteger(v) ? v.toLocaleString() : v.toFixed(4);
    return { text, cls: "font-mono-data text-[#D9A84D] text-right" };
  }
  return { text: String(v), cls: "text-[#B8B5AA]" };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DbBrowserPage() {
  const [activeDb, setActiveDb] = useState<DbConfig>(DATABASES[0]);
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const loadTable = useCallback(async () => {
    setLoading(true);
    setError("");
    setAllRows([]);
    setPage(0);
    setSortCol(null);
    try {
      const rows = await activeDb.fetchFn();
      if (!rows.length) setError("No rows returned — table may be empty.");
      setAllRows(rows);
    } catch (e: unknown) {
      setError(`Fetch failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [activeDb]);

  // Auto-load when tab changes
  useEffect(() => {
    setAllRows([]);
    setFilter("");
    setError("");
    setPage(0);
    setSortCol(null);
  }, [activeDb]);

  const sorted = useMemo(() => {
    if (!sortCol) return allRows;
    return [...allRows].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });
  }, [allRows, sortCol, sortDir]);

  const filtered = useMemo(() => {
    if (!filter) return sorted;
    const q = filter.toLowerCase();
    return sorted.filter(r => Object.values(r).some(v => String(v ?? "").toLowerCase().includes(q)));
  }, [sorted, filter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const cols = filtered.length ? Object.keys(filtered[0]) : [];

  const dates = filtered.map(r => r.date as string).filter(Boolean).sort();
  const dateRange = dates.length >= 2 ? `${dates[0]} → ${dates[dates.length - 1]}` : dates[0] ?? "";

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortCol(col); setSortDir(1); }
    setPage(0);
  }

  function exportCSV() {
    if (!filtered.length) return;
    const c = Object.keys(filtered[0]);
    const csv = [
      c.join(","),
      ...filtered.map(r =>
        c.map(k => {
          const v = String(r[k] ?? "");
          return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${activeDb.id}.csv`;
    a.click();
  }

  return (
    <main className="min-h-screen bg-ink font-sans-body" style={{ background: "#0B0B0C" }}>
      {/* Nav bar */}
      <div className="hairline-b px-6 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #22231F" }}>
        <div className="flex items-center gap-6">
          <span className="font-display-italic text-amber-sand text-[18px]" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", color: "#D9A84D" }}>
            ⬡
          </span>
          <span className="caps-sm text-faint" style={{ color: "#55534B", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 10 }}>
            BTC Dashboard
          </span>
          <a href="/" className="caps-sm" style={{ color: "#55534B", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", textDecoration: "none" }}>
            ← back to dashboard
          </a>
        </div>
        <span className="caps-sm" style={{ color: "#55534B", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Database Browser
        </span>
      </div>

      <div className="px-6 py-6" style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Page title */}
        <div className="mb-6">
          <h1 className="font-display text-paper text-[22px]" style={{ fontFamily: "'Instrument Serif', serif", color: "#E8E4D9" }}>
            SQLite Database Browser
          </h1>
          <p className="font-sans-body text-faint text-[13px] mt-1" style={{ color: "#55534B" }}>
            View all collected data across your Railway-hosted SQLite stores.
          </p>
        </div>

        {/* DB tabs */}
        <div className="flex gap-2 flex-wrap mb-5">
          {DATABASES.map(db => (
            <button
              key={db.id}
              onClick={() => setActiveDb(db)}
              style={{
                padding: "4px 14px",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                borderRadius: 99,
                border: activeDb.id === db.id
                  ? "1px solid rgba(217,168,77,0.35)"
                  : "1px solid #22231F",
                background: activeDb.id === db.id
                  ? "rgba(217,168,77,0.08)"
                  : "#131315",
                color: activeDb.id === db.id ? "#D9A84D" : "#55534B",
                cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {db.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 flex-wrap items-center mb-4">
          <input
            type="text"
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(0); }}
            placeholder="Filter rows…"
            style={{
              flex: 1, minWidth: 180, height: 34, padding: "0 10px",
              fontSize: 13, background: "#131315",
              border: "1px solid #22231F", borderRadius: 6,
              color: "#E8E4D9", outline: "none",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          />
          <button
            onClick={loadTable}
            disabled={loading}
            style={{
              height: 34, padding: "0 16px", fontSize: 12, fontWeight: 500,
              background: "rgba(217,168,77,0.10)", color: "#D9A84D",
              border: "1px solid rgba(217,168,77,0.3)", borderRadius: 6, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em",
            }}
          >
            {loading ? "Loading…" : "Load data"}
          </button>
          <button
            onClick={exportCSV}
            disabled={!filtered.length}
            style={{
              height: 34, padding: "0 14px", fontSize: 12,
              background: "#131315", color: "#8A8780",
              border: "1px solid #22231F", borderRadius: 6, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            ↓ CSV
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 14px", marginBottom: 12,
            background: "rgba(196,97,74,0.08)", border: "1px solid rgba(196,97,74,0.2)",
            color: "#C4614A", borderRadius: 6, fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {error}
          </div>
        )}

        {/* Meta bar */}
        {filtered.length > 0 && (
          <div className="flex gap-3 items-center flex-wrap mb-3">
            <span style={{
              fontSize: 11, padding: "2px 9px", borderRadius: 99,
              background: "rgba(217,168,77,0.10)", color: "#D9A84D",
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {filtered.length.toLocaleString()} rows
            </span>
            {dateRange && (
              <span style={{
                fontSize: 11, padding: "2px 9px", borderRadius: 99,
                background: "rgba(255,255,255,0.04)", color: "#55534B",
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {dateRange}
              </span>
            )}
            <span style={{ fontSize: 11, color: "#55534B", fontFamily: "'IBM Plex Mono', monospace" }}>
              {cols.length} columns
            </span>
            {filtered.length < allRows.length && (
              <span style={{ fontSize: 11, color: "#55534B" }}>
                (filtered from {allRows.length.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: "auto", border: "1px solid #1A1A1C", borderRadius: 8, background: "#0E0E10" }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#55534B", fontSize: 13 }}>
              Fetching from Railway backend…
            </div>
          ) : !allRows.length ? (
            <div style={{ padding: 48, textAlign: "center", color: "#55534B", fontSize: 13 }}>
              {error ? "Could not load data." : "Select a database tab and click Load data."}
            </div>
          ) : pageRows.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#55534B", fontSize: 13 }}>
              No rows match filter.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1A1A1C" }}>
                  {cols.map(col => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      style={{
                        padding: "8px 12px", textAlign: "left",
                        fontSize: 10, fontWeight: 500, color: "#55534B",
                        whiteSpace: "nowrap", textTransform: "uppercase",
                        letterSpacing: "0.1em", background: "#0E0E10",
                        cursor: "pointer", userSelect: "none",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {col}
                      {sortCol === col && (
                        <span style={{ marginLeft: 4, color: "#D9A84D" }}>
                          {sortDir === 1 ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid #161618" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#131315")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {cols.map(col => {
                      const { text, cls } = fmtCell(col, row[col]);
                      return (
                        <td
                          key={col}
                          title={text !== "—" ? text : undefined}
                          style={{
                            padding: "6px 12px",
                            whiteSpace: "nowrap",
                            maxWidth: 260,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontFamily: cls.includes("mono") ? "'IBM Plex Mono', monospace" : "'IBM Plex Sans', sans-serif",
                            color: cls.includes("D9A84D") ? "#D9A84D"
                              : cls.includes("55534B") ? "#55534B"
                              : cls.includes("B8B5AA") ? "#B8B5AA"
                              : "#8A8780",
                            textAlign: cls.includes("right") ? "right" : "left",
                          }}
                        >
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                height: 30, padding: "0 12px", fontSize: 12,
                background: "#131315", color: page === 0 ? "#2a2a2b" : "#8A8780",
                border: "1px solid #22231F", borderRadius: 6,
                cursor: page === 0 ? "default" : "pointer",
              }}
            >
              ‹ Prev
            </button>
            <span style={{ flex: 1, textAlign: "center", fontSize: 12, color: "#55534B", fontFamily: "'IBM Plex Mono', monospace" }}>
              Page {page + 1} of {totalPages} · rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                height: 30, padding: "0 12px", fontSize: 12,
                background: "#131315", color: page >= totalPages - 1 ? "#2a2a2b" : "#8A8780",
                border: "1px solid #22231F", borderRadius: 6,
                cursor: page >= totalPages - 1 ? "default" : "pointer",
              }}
            >
              Next ›
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
