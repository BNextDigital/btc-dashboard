<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BTC DB Browser</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'IBM Plex Sans', 'Inter', system-ui, sans-serif;
    background: #0B0B0C;
    color: #E8E3D9;
    min-height: 100vh;
    padding: 24px;
  }
  h1 { font-size: 15px; font-weight: 500; color: #D9A84D; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 20px; }
  .tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .tab {
    padding: 5px 14px; font-size: 12px; border: 1px solid #2a2a2b;
    border-radius: 99px; cursor: pointer; background: #141415;
    color: #888; white-space: nowrap; transition: all 0.15s;
  }
  .tab:hover { color: #E8E3D9; border-color: #444; }
  .tab.active { background: rgba(217,168,77,0.12); color: #D9A84D; border-color: rgba(217,168,77,0.35); }
  .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
  select, input[type=text] {
    height: 34px; padding: 0 10px; font-size: 13px;
    background: #141415; border: 1px solid #2a2a2b;
    border-radius: 6px; color: #E8E3D9; outline: none;
  }
  select:focus, input:focus { border-color: #D9A84D; }
  input[type=text] { flex: 1; min-width: 160px; }
  button {
    height: 34px; padding: 0 14px; font-size: 12px; font-weight: 500;
    border: 1px solid #2a2a2b; border-radius: 6px;
    background: #141415; color: #E8E3D9; cursor: pointer;
    white-space: nowrap; transition: all 0.15s;
  }
  button:hover { border-color: #444; background: #1c1c1e; }
  button.primary { background: rgba(217,168,77,0.15); color: #D9A84D; border-color: rgba(217,168,77,0.35); }
  button.primary:hover { background: rgba(217,168,77,0.22); }
  button:disabled { opacity: 0.35; cursor: default; }
  .meta-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; min-height: 24px; }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 99px; font-weight: 500; }
  .badge.count { background: rgba(217,168,77,0.12); color: #D9A84D; }
  .badge.dates { background: rgba(255,255,255,0.05); color: #888; }
  .meta-txt { font-size: 11px; color: #666; }
  .tbl-wrap {
    overflow-x: auto; border: 1px solid #1e1e20;
    border-radius: 8px; background: #0f0f10;
  }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead { border-bottom: 1px solid #1e1e20; }
  th {
    padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 500;
    color: #555; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.06em;
    background: #0f0f10; cursor: pointer; user-select: none;
  }
  th:hover { color: #888; }
  td {
    padding: 6px 12px; border-bottom: 1px solid #161618;
    font-family: 'IBM Plex Mono', 'Fira Code', monospace;
    font-size: 11.5px; white-space: nowrap;
    max-width: 240px; overflow: hidden; text-overflow: ellipsis;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #141415; }
  td.date-col { color: #666; }
  td.num-col { text-align: right; color: #D9A84D; }
  td.str-col { color: #C8C2B8; }
  td.null-col { color: #3a3a3c; font-style: italic; }
  .pagination { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
  .page-info { flex: 1; text-align: center; font-size: 12px; color: #555; }
  .status { padding: 40px; text-align: center; color: #444; font-size: 13px; }
  .error { padding: 12px 14px; background: rgba(220,50,50,0.08); border: 1px solid rgba(220,50,50,0.2); color: #e05c5c; border-radius: 6px; font-size: 12px; margin-bottom: 12px; display: none; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #2a2a2b; border-top-color: #D9A84D; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: -3px; margin-right: 6px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .thinking { color: #666; font-size: 12px; padding: 30px; text-align: center; }
</style>
</head>
<body>

<h1>⬡ BTC Dashboard — Database Browser</h1>

<div class="tabs" id="dbTabs"></div>

<div class="toolbar">
  <select id="tableSelect"><option value="">— select table —</option></select>
  <input type="text" id="filterInput" placeholder="Filter rows…" />
  <button class="primary" onclick="loadTable()">Load data</button>
  <button onclick="exportCSV()">↓ CSV</button>
</div>

<div class="error" id="errorBox"></div>
<div class="meta-bar" id="metaBar"></div>

<div class="tbl-wrap" id="tblWrap">
  <div class="status">Select a database tab, then a table, then click Load data.</div>
</div>

<div class="pagination" id="paginator" style="display:none">
  <button id="prevBtn" onclick="changePage(-1)">‹ Prev</button>
  <span class="page-info" id="pageInfo"></span>
  <button id="nextBtn" onclick="changePage(1)">Next ›</button>
</div>

<script>
const API_URL = "https://btc-dashboard-api-production.up.railway.app";
const PAGE_SIZE = 75;

// Each database has a known endpoint to fetch its data
const DATABASES = [
  {
    id: "manual_history",
    label: "manual_history",
    tables: {
      "metric_history": () => fetchJson("/history/exchange_netflow?days=365")
        .then(() => null) // will use dedicated endpoint below
    },
    fetchFn: async () => {
      // Fetch all metrics from manual history
      const metrics = ["exchange_netflow","lth_supply","etf_flow","realized_cap","funding","open_interest","cme_basis"];
      const all = [];
      for (const m of metrics) {
        try {
          const d = await fetchJson(`/history/${m}?days=365`);
          if (d && d.entries) d.entries.forEach(e => all.push({metric: m, ...e}));
        } catch {}
      }
      return all;
    },
    tableNames: ["metric_history (all metrics)"],
  },
  {
    id: "basis_history",
    label: "basis_history",
    tableNames: ["cme_basis"],
    fetchFn: async () => {
      const d = await fetchJson("/db/summary");
      // Use dedicated basis endpoint
      const rows = await fetchJson("/db/basis/query/cme_basis?limit=1000").catch(() => null);
      if (rows) return Array.isArray(rows) ? rows : rows.rows || rows.entries || [];
      return [];
    },
  },
  {
    id: "stablecoin_history",
    label: "stablecoin_history",
    tableNames: ["stablecoin_supply"],
    fetchFn: async () => {
      const rows = await fetchJson("/db/stablecoin/query/stablecoin_supply?limit=1000").catch(() => null);
      if (rows) return Array.isArray(rows) ? rows : rows.rows || rows.entries || [];
      return [];
    },
  },
  {
    id: "btc_dominance",
    label: "btc_dominance_history",
    tableNames: ["btc_dominance"],
    fetchFn: async () => {
      const rows = await fetchJson("/db/dominance/query/btc_dominance?limit=1000").catch(() => null);
      if (rows) return Array.isArray(rows) ? rows : rows.rows || rows.entries || [];
      return [];
    },
  },
  {
    id: "oi_history",
    label: "oi_history",
    tableNames: ["oi_snapshots"],
    fetchFn: async () => {
      const d = await fetchJson("/oi-history").catch(() => ({}));
      // Try direct db query
      const rows = await fetchJson("/db/oi/query/oi_snapshots?limit=500").catch(() => null);
      if (rows) return Array.isArray(rows) ? rows : rows.rows || rows.entries || [];
      // Fallback: return summary
      return d ? [d] : [];
    },
  },
];

let allRows = [];
let filteredRows = [];
let currentPage = 0;
let sortCol = null;
let sortDir = 1;
let activeDb = DATABASES[0];

async function fetchJson(path) {
  const res = await fetch(API_URL + path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function showError(msg) {
  const b = document.getElementById("errorBox");
  if (msg) { b.textContent = msg; b.style.display = "block"; }
  else { b.style.display = "none"; }
}

function renderTabs() {
  document.getElementById("dbTabs").innerHTML = DATABASES.map(db =>
    `<div class="tab${db.id === activeDb.id ? " active" : ""}" onclick="selectDb('${db.id}')">${db.label}</div>`
  ).join("");
}

function selectDb(id) {
  activeDb = DATABASES.find(d => d.id === id);
  allRows = []; filteredRows = [];
  renderTabs();
  const sel = document.getElementById("tableSelect");
  sel.innerHTML = activeDb.tableNames.map(t => `<option value="${t}">${t}</option>`).join("");
  document.getElementById("tblWrap").innerHTML = '<div class="status">Click "Load data" to fetch this table.</div>';
  document.getElementById("paginator").style.display = "none";
  document.getElementById("metaBar").innerHTML = "";
  showError("");
}

async function loadTable() {
  showError("");
  document.getElementById("tblWrap").innerHTML = '<div class="thinking"><span class="spinner"></span>Fetching from Railway backend…</div>';
  document.getElementById("paginator").style.display = "none";
  document.getElementById("metaBar").innerHTML = "";

  try {
    allRows = await activeDb.fetchFn();
    if (!Array.isArray(allRows) || allRows.length === 0) {
      document.getElementById("tblWrap").innerHTML = '<div class="status">No rows returned — table may be empty or endpoint path differs.</div>';
      return;
    }
    currentPage = 0; sortCol = null;
    applyFilter();
  } catch (e) {
    showError("Fetch failed: " + e.message + ". Check CORS — you may need to add claude.ai to your backend CORS allow_origins list.");
    document.getElementById("tblWrap").innerHTML = '<div class="status">Could not load data.</div>';
  }
}

function applyFilter() {
  const q = document.getElementById("filterInput").value.toLowerCase();
  filteredRows = q
    ? allRows.filter(r => Object.values(r).some(v => String(v ?? "").toLowerCase().includes(q)))
    : [...allRows];
  currentPage = 0;
  renderTable();
}

document.getElementById("filterInput").addEventListener("input", applyFilter);

function sortBy(col) {
  if (sortCol === col) sortDir *= -1;
  else { sortCol = col; sortDir = 1; }
  filteredRows.sort((a, b) => {
    const av = a[col] ?? ""; const bv = b[col] ?? "";
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });
  renderTable();
}

function renderTable() {
  if (!filteredRows.length) {
    document.getElementById("tblWrap").innerHTML = '<div class="status">No matching rows.</div>';
    document.getElementById("paginator").style.display = "none";
    return;
  }
  const cols = Object.keys(filteredRows[0]);
  const start = currentPage * PAGE_SIZE;
  const pageRows = filteredRows.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);

  const heads = cols.map(c => {
    const arrow = sortCol === c ? (sortDir > 0 ? " ↑" : " ↓") : "";
    return `<th onclick="sortBy('${c}')">${c}${arrow}</th>`;
  }).join("");

  const rows = pageRows.map(row => {
    const cells = cols.map(c => {
      const v = row[c];
      if (v === null || v === undefined || v === "") return `<td class="null-col">—</td>`;
      if (c === "date" || c === "stored_at" || c === "baseline_date") return `<td class="date-col">${v}</td>`;
      if (typeof v === "number") {
        const fmt = Number.isInteger(v) ? v.toLocaleString() : v.toFixed(4);
        return `<td class="num-col">${fmt}</td>`;
      }
      return `<td class="str-col" title="${String(v)}">${String(v)}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  document.getElementById("tblWrap").innerHTML = `
    <table>
      <thead><tr>${heads}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  // Meta bar
  const dates = filteredRows.map(r => r.date).filter(Boolean).sort();
  const dateRange = dates.length >= 2 ? `${dates[0]} → ${dates[dates.length-1]}` : (dates[0] || "");
  document.getElementById("metaBar").innerHTML = `
    <span class="badge count">${filteredRows.length.toLocaleString()} rows</span>
    ${dateRange ? `<span class="badge dates">${dateRange}</span>` : ""}
    <span class="meta-txt">${cols.length} columns</span>
    ${filteredRows.length < allRows.length ? `<span class="meta-txt">(filtered from ${allRows.length})</span>` : ""}
  `;

  // Pagination
  const pag = document.getElementById("paginator");
  if (totalPages > 1) {
    pag.style.display = "flex";
    document.getElementById("prevBtn").disabled = currentPage === 0;
    document.getElementById("nextBtn").disabled = currentPage >= totalPages - 1;
    document.getElementById("pageInfo").textContent = `Page ${currentPage + 1} of ${totalPages}  (rows ${start + 1}–${Math.min(start + PAGE_SIZE, filteredRows.length)})`;
  } else {
    pag.style.display = "none";
  }
}

function changePage(delta) {
  const total = Math.ceil(filteredRows.length / PAGE_SIZE);
  currentPage = Math.max(0, Math.min(currentPage + delta, total - 1));
  renderTable();
}

function exportCSV() {
  if (!filteredRows.length) return;
  const cols = Object.keys(filteredRows[0]);
  const csv = [cols.join(","), ...filteredRows.map(r =>
    cols.map(c => {
      const v = r[c] ?? "";
      return typeof v === "string" && (v.includes(",") || v.includes('"')) ? `"${v.replace(/"/g,'""')}"` : v;
    }).join(",")
  )].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
  a.download = `${activeDb.id}.csv`;
  a.click();
}

// Init
renderTabs();
selectDb(DATABASES[0].id);
</script>
</body>
</html>
