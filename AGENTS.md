# Agent Reference: CeylonCharts MCP Server

Condensed reference for coding agents integrating with the CeylonCharts API.
Full human-readable docs are in [docs/](docs/) and linked below — read those
for exact request/response shapes; this file is for orientation and gotchas.

## What this is

Colombo Stock Exchange (CSE) market data — symbols, OHLC price history, live
price quotes, candlestick chart images, financial statements,
foreign-shareholding percentage, top-20 shareholders, general announcements,
a corporate-actions calendar (dividends/rights/splits), market/sector
indices, pre-computed technicals, a screener, and a market summary — as a
REST API and an MCP server. Both are Cloudflare Workers behind the same
custom domain.

- REST API base: `https://mcp.ceyloncharts.com/api`
- MCP endpoint: `https://mcp.ceyloncharts.com/mcp/`

This repo is docs/examples only — no server source code here.

## Auth

Two independent auth schemes, pick one per how you're connecting — see
[docs/authentication.md](docs/authentication.md):

- **REST API** (`/v1/...`): headers `X-User-Id` (account UUID) + `X-Api-Key`
  (64-char hex). Get both from `ceyloncharts.com` → profile menu → **Profile
  Settings** → **Developer** tab → **Generate API Key** (shown once, no
  self-service signup form — you need a ceyloncharts.com account first).
- **MCP endpoint** (`/mcp/`): OAuth 2.1 bearer token, obtained via a browser
  login flow. Only relevant if you're driving the MCP transport directly
  instead of calling REST; MCP clients (Claude, ChatGPT, etc.) handle this
  for you — see [docs/getting-started.md](docs/getting-started.md).

## Gotchas (read before integrating)

1. **Set a real `User-Agent`.** Cloudflare's bot protection on this domain
   blocks some HTTP clients' default UA outright (`1010` error) — e.g.
   Python's `urllib` sends `Python-urllib/3.x` and gets blocked before your
   request reaches the API, independent of whether your API key is valid.
   curl's default UA is fine; anything else, set your own explicitly. See
   [docs/rest-api.md](docs/rest-api.md#set-a-real-user-agent).
2. **Ambiguous input is a `200`, not an error.** Symbol/series/index lookups
   try exact match → name substring → fuzzy typo match. If more than one
   candidate matches, the response is `200 OK` with
   `{ meta: { resolved: false, reason: "ambiguous" }, candidates: [...] }`
   instead of data — check for this shape, don't assume `data`/CSV rows are
   always present. See [docs/rest-api.md](docs/rest-api.md#symbol--series-resolution).
3. **`?format=csv` is opt-in and token-cheaper.** Every list/range endpoint
   except `/v1/market-summary` (no CSV mode at all) and `/v1/chart` (always a
   PNG image, never JSON or CSV) accepts `?format=csv` — one header row
   instead of repeating field names per row, ~3x smaller for typical OHLCV
   data. Meta fields move to `X-Resolved-*`/`X-Has-More`/etc. response
   headers instead of a JSON `meta` object. See
   [docs/rest-api.md](docs/rest-api.md#csv-response-format).
4. **OHLC, technicals, corporate actions, and foreign holdings default to a
   capped page**, not full history — OHLC/technicals/foreign-holdings default
   to the last 50 days; corporate actions has no date default at all but is
   still `limit`/`offset` paginated (default 50). `limit` (max 500) /
   `offset` control paging, and the response says `hasMore`/`nextOffset`
   when there's more. Don't assume you got everything back from a wide
   `from`/`to` range. See
   [docs/rest-api.md](docs/rest-api.md#pagination-ohlc-technicals-corporate-actions-and-foreign-holdings).
5. **Every cached endpoint's cache is shared across all callers**, not scoped
   per user — the content is public market data that doesn't vary by caller,
   only by query params. `get_market_summary` additionally has no CSV mode at
   all (JSON only — it's a bundle of several small lists, not one table). See
   [docs/rest-api.md](docs/rest-api.md#caching) and
   [docs/rest-api.md](docs/rest-api.md#market-summary).
6. **`get_financials` (compact multi-quarter trend) is currently disabled**
   as an MCP tool in favor of `get_financial_statement` (full line-item
   detail for one statement type). The REST endpoint
   (`GET /v1/financials/:symbol`) is still live if you need the compact
   trend — just not exposed as an MCP tool right now. Don't confuse it with
   `get_financial_statement`'s `GET /v1/financials/:symbol/statement` — see
   [docs/rest-api.md](docs/rest-api.md#financial-statements).
7. **Three endpoints look similar but aren't**: `get_corporate_actions`
   (structured dividends/rights/splits calendar) vs. OHLC's adjustment
   events (minimal, just explains a price move) vs. `get_announcements`
   (general disclosures — board changes, AGM/EGM, suspensions — free-text
   only). Pick based on what you actually need. See
   [docs/rest-api.md](docs/rest-api.md#corporate-actions).
8. **Google Antigravity's MCP OAuth support is currently unreliable** for
   this server (some users hit `401` even after authenticating) — there's no
   static-token fallback, since `/mcp/` only accepts OAuth bearer tokens. Use
   Claude Web, Claude Desktop, or ChatGPT instead if you hit this. See
   [docs/getting-started.md](docs/getting-started.md).
9. **`get_quotes`' ambiguous handling is per-row, not whole-response**, unlike
   every other tool here. A `symbols` batch with one bad entry still returns
   `200` with CSV rows for the symbols that resolved — the bad one just comes
   back with empty `price`/`prevClose`/`change`/`changePct`/`asOf` fields in
   its row, rather than replacing the entire response with the candidates
   shape. A trailing note after the table (not the usual note prepended
   before it) says which symbols were not found or ambiguous, with
   candidates listed for the ambiguous ones — read that note rather than
   trying to infer status from the empty row alone. See
   [docs/rest-api.md](docs/rest-api.md#live-quotes).
10. **`get_chart` returns an image, not text** — the only tool on this server
    where the MCP response is an `image` content block (`image/png`) instead
    of a CSV/text block, and the only REST endpoint that returns raw PNG
    bytes instead of JSON/CSV. It still falls back to the usual JSON
    candidates shape for an ambiguous symbol. EOD data only for now — no
    intraday/live bars yet, even during market hours. See
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
[docs/mcp-tools.md](docs/mcp-tools.md) (MCP).

## Rate limits

Per-user, per-hour: basic 20, pro 100, business 10000. See
[docs/rate-limits.md](docs/rate-limits.md).

## Runnable examples

[examples/](examples/) has working curl, Python, and Node snippets for every
endpoint category above, including the `User-Agent` workaround from gotcha 1.
