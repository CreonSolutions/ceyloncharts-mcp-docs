// CeylonCharts REST API — minimal Node client example (Node >= 18, built-in fetch)

const BASE_URL = "https://mcp.ceyloncharts.com/api";

function headers() {
  return {
    "X-User-Id": process.env.CEYLONCHARTS_USER_ID,
    "X-Api-Key": process.env.CEYLONCHARTS_API_KEY,
    // Cloudflare's bot protection in front of this domain blocks some HTTP
    // clients' default User-Agent outright before the request reaches the
    // API — see rest-api.md. Set your own to be safe.
    "User-Agent": "CeylonChartsExampleClient/1.0",
  };
}

async function getSymbols({ query, sector } = {}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (sector) params.set("sector", sector);
  const res = await fetch(`${BASE_URL}/v1/symbols?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function getOhlc(symbol, { from, to, interval = "daily" } = {}) {
  const params = new URLSearchParams({ interval });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`${BASE_URL}/v1/ohlc/${symbol}?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function getIndexData(index, { from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`${BASE_URL}/v1/indices/${index}/data?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function getTechnicals(symbol, { limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  const res = await fetch(`${BASE_URL}/v1/technicals/${symbol}?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function screenStocks(filters = {}) {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${BASE_URL}/v1/screener/stocks?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function getMarketSummary({ period = "daily", date, limit = 5 } = {}) {
  const params = new URLSearchParams({ period, limit });
  if (date) params.set("date", date);
  const res = await fetch(`${BASE_URL}/v1/market-summary?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

// statement: "income" | "balance" | "cashflow". Requests CSV for readability
// (one column per fiscal period); omit format=csv for the JSON envelope.
async function getFinancialStatement(symbol, statement, { companyType } = {}) {
  const params = new URLSearchParams({ statement, format: "csv" });
  if (companyType) params.set("company_type", companyType);
  const res = await fetch(`${BASE_URL}/v1/financials/${symbol}/statement?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.text();
}

// kind: "split" | "rights" | "dividend". Omit symbol for a market-wide
// calendar; omit from/to for the full dataset (no default window).
async function getCorporateActions({ symbol, kind, from, to, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (symbol) params.set("symbol", symbol);
  if (kind) params.set("kind", kind);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`${BASE_URL}/v1/corporate-actions?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const symbols = await getSymbols();
  console.log(symbols.slice(0, 5));

  const ohlc = await getOhlc("SAMP", { from: "2025-01-01", to: "2025-01-31" });
  console.log(ohlc);

  const indexData = await getIndexData("ASPI", { from: "2025-01-01", to: "2025-01-31" });
  console.log(indexData);

  const technicals = await getTechnicals("SAMP", { limit: 20 });
  console.log(technicals);

  const leaders = await screenStocks({ above_ema50: "true", above_ema200: "true", rs_rating_min: "80" });
  console.log(leaders);

  const summary = await getMarketSummary({ period: "weekly" });
  console.log(summary);

  const statement = await getFinancialStatement("SAMP", "income");
  console.log(statement.slice(0, 500));

  const actions = await getCorporateActions({ from: "2026-01-01", kind: "dividend" });
  console.log(actions);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
