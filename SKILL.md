---
name: ceyloncharts-mcp
description: Reference for calling the CeylonCharts CSE market-data API (REST or MCP) — symbols, OHLC/technicals, live quotes, chart images, financial statements, foreign holdings, shareholders, announcements, corporate actions, indices, screener, market summary. Use when writing code that calls mcp.ceyloncharts.com, debugging a failed call to it, or wiring up its MCP tools.
---

# CeylonCharts MCP Server

Colombo Stock Exchange (CSE) market data — symbols, OHLC price history, live
price quotes, candlestick chart images, financial statements,
foreign-shareholding percentage, top-20 shareholders, general announcements,
a corporate-actions calendar (dividends/rights/splits), market/sector
indices, pre-computed technicals, a screener, and a market summary — as a
REST API and an MCP server. Both are Cloudflare Workers behind the same
custom domain. This skill is docs/examples only — no server source code
here; see [docs/](docs/) for full detail behind every summary below.

- REST API base: `https://mcp.ceyloncharts.com/api`
- MCP endpoint: `https://mcp.ceyloncharts.com/mcp/`

## Auth

Two independent schemes — see [docs/authentication.md](docs/authentication.md):

- **REST API** (`/v1/...`): headers `X-User-Id` (account UUID) + `X-Api-Key`
  (64-char hex). Get both from `ceyloncharts.com` → profile menu → **Profile
  Settings** → **Developer** tab → **Generate API Key** (shown once — there's
  no separate signup form, you need a ceyloncharts.com account first).
- **MCP endpoint** (`/mcp/`): OAuth 2.1 bearer token via browser login.
  MCP clients (Claude, ChatGPT, etc.) handle this automatically — see
  [docs/getting-started.md](docs/getting-started.md).

## Before writing any code against this API, know these

1. **Set a real `User-Agent`.** Cloudflare's bot protection on this domain
   blocks some HTTP clients' default UA outright (`1010` error) — e.g.
   Python's `urllib` sends `Python-urllib/3.x` and gets blocked before the
   request reaches the API, regardless of API-key validity. curl's default
   UA passes; anything else, set your own. See
   [docs/rest-api.md](docs/rest-api.md#set-a-real-user-agent).
2. **Ambiguous input is a `200`, not an error.** Symbol/series/index lookups
   try exact match → name substring → fuzzy typo match. More than one match
   returns `200 OK` with `{ meta: { resolved: false, reason: "ambiguous" },
   candidates: [...] }` instead of data — check for this shape before
   assuming `data`/CSV rows are present. See
   [docs/rest-api.md](docs/rest-api.md#symbol--series-resolution).
3. **`?format=csv` is opt-in and token-cheaper**, on every list/range
   endpoint except `/v1/market-summary` (no CSV mode at all) and `/v1/chart`
   (always a PNG image, never JSON or CSV) — one header row instead of
   repeating field names per row. Meta moves to `X-Resolved-*`/`X-Has-More`
   response headers instead of a JSON `meta` object. See
   [docs/rest-api.md](docs/rest-api.md#csv-response-format).
4. **OHLC, technicals, corporate actions, and foreign holdings default to a
   capped page**, not full history — OHLC/technicals/foreign-holdings
   default to the last 50 days; corporate actions has no date default but is
   still `limit`/`offset` paginated (default 50). `limit` (max 500) /
   `offset` page further back; `hasMore`/`nextOffset` say if there's more. A
   wide `from`/`to` range does not guarantee you got everything. See
   [docs/rest-api.md](docs/rest-api.md#pagination-ohlc-technicals-corporate-actions-and-foreign-holdings).
5. **Every cached endpoint's cache is shared across all callers**, not
   scoped per user — the content is public market data that doesn't vary by
   caller, only by query params. `get_market_summary` additionally has no
   CSV mode at all (JSON only — several small lists, not one table). See
   [docs/rest-api.md](docs/rest-api.md#caching) and
   [docs/rest-api.md](docs/rest-api.md#market-summary).
6. **`get_financials` (compact multi-quarter trend) is currently disabled**
   as an MCP tool in favor of `get_financial_statement` (full line-item
   detail for one statement type — income/balance/cashflow). The REST
   endpoint (`GET /v1/financials/:symbol`) is still live if you need the
   compact trend, just not exposed as an MCP tool right now. Don't confuse
   it with `get_financial_statement`'s
   `GET /v1/financials/:symbol/statement`. See
   [docs/rest-api.md](docs/rest-api.md#financial-statements).
7. **Three endpoints look similar but aren't**: `get_corporate_actions`
   (structured dividends/rights/splits calendar) vs. OHLC's adjustment
   events (minimal, just explains a price move) vs. `get_announcements`
   (general disclosures — board changes, AGM/EGM, suspensions — free-text
   only). Pick based on what you actually need. See
   [docs/rest-api.md](docs/rest-api.md#corporate-actions).
8. **Google Antigravity's MCP OAuth support is currently unreliable** here
   (some users get `401` even after authenticating), and there's no
   static-token fallback since `/mcp/` only accepts OAuth bearer tokens. Use
   Claude Web, Claude Desktop, or ChatGPT instead if this comes up. See
   [docs/getting-started.md](docs/getting-started.md).
9. **`get_quotes`' ambiguous handling is per-row, not whole-response**,
   unlike every other tool here. A `symbols` batch with one bad entry still
   returns `200` with data for the symbols that resolved — the bad one gets
   its own row with `status: "ambiguous"`/`"not_found"` and null price
   fields, rather than replacing the entire response with the candidates
   shape. Check `status` per row instead of assuming one ambiguous input
   fails the batch. See [docs/rest-api.md](docs/rest-api.md#live-quotes).
10. **`get_chart` returns an image, not text** — the only tool here where
    the MCP response is an `image` content block (`image/png`) instead of a
    CSV/text block, and the only REST endpoint that returns raw PNG bytes
    instead of JSON/CSV. It still falls back to the usual JSON candidates
    shape for an ambiguous symbol. EOD data only for now — no intraday/live
    bars yet, even during market hours. See
    [docs/rest-api.md](docs/rest-api.md#chart-images).

## Endpoints / tools at a glance

| REST endpoint | MCP tool | Notes |
|---|---|---|
| `GET /v1/symbols` | `get_symbols` | `q`/`sector` substring filters |
| `GET /v1/ohlc/:symbol` | `get_ohlc_data` | adjustments + pagination, see gotcha 4 |
| `GET /v1/financials/:symbol` | *(none — see gotcha 6)* | compact multi-quarter trend |
| `GET /v1/financials/:symbol/statement` | `get_financial_statement` | full statement detail, see gotcha 6 |
| `GET /v1/announcements/:symbol` | `get_announcements` | general disclosures, 365-day default window |
| `GET /v1/corporate-actions` | `get_corporate_actions` | dividends/rights/splits, see gotcha 7 |
| `GET /v1/foreign-holdings/:symbol` | `get_foreign_holdings` | per-instrument, resolves and paginates like OHLC |
| `GET /v1/shareholders/:symbol` | `get_top20_shareholders` | entity-level like statements, latest quarter by default |
| `GET /v1/macro/series` | `get_macro_series` | |
| `GET /v1/macro/data` | `get_macro_data` | |
| `GET /v1/indices` | `get_indices` | ASPI, S&P SL20, sub-indices |
| `GET /v1/indices/:index/data` | `get_index_data` | |
| `GET /v1/technicals/:symbol` | `get_technicals` | shares pagination with OHLC |
| `GET /v1/screener/stocks` | `screen_stocks` | cross-sectional snapshot, not time series |
| `GET /v1/screener/indices` | `screen_indices` | |
| `GET /v1/market-summary` | `get_market_summary` | see gotcha 5 |
| `GET /v1/quotes` | `get_quotes` | live price snapshot, `symbols` or `all=true`, see gotcha 9 |
| `GET /v1/chart/:symbol` | `get_chart` | candlestick PNG image, see gotcha 10 |

Full param/response shapes: [docs/rest-api.md](docs/rest-api.md) (REST),
[docs/mcp-tools.md](docs/mcp-tools.md) (MCP). Rate limits (basic 20/hr, pro
100/hr, business 10000/hr): [docs/rate-limits.md](docs/rate-limits.md).
Runnable curl/Python/Node snippets: [examples/](examples/).
