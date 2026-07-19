// CeylonCharts REST API — minimal Node client example (Node >= 18, built-in fetch)

const BASE_URL = "https://mcp.ceyloncharts.com/api";

function headers() {
  return {
    "X-User-Id": process.env.CEYLONCHARTS_USER_ID,
    "X-Api-Key": process.env.CEYLONCHARTS_API_KEY,
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
