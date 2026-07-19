# Agent Reference: CeylonCharts MCP Server

Condensed reference for coding agents integrating with the CeylonCharts API.
Full human-readable docs are in [docs/](docs/) and linked below — read those
for exact request/response shapes; this file is for orientation and gotchas.

## What this is

Colombo Stock Exchange (CSE) market data — symbols, OHLC price history,
financials, announcements, market/sector indices, pre-computed technicals, a
screener, and a market summary — as a REST API and an MCP server. Both are
Cloudflare Workers behind the same custom domain.

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
   except `/v1/market-summary` accepts `?format=csv` — one header row instead
   of repeating field names per row, ~3x smaller for typical OHLCV data. Meta
   fields move to `X-Resolved-*`/`X-Has-More`/etc. response headers instead
   of a JSON `meta` object. See [docs/rest-api.md](docs/rest-api.md#csv-response-format).
4. **OHLC and technicals default to the last 50 trading days**, not full
   history — `limit` (max 500) / `offset` control paging, and the response
   says `hasMore`/`nextOffset` when there's more. Don't assume you got
   everything back from a wide `from`/`to` range. See
   [docs/rest-api.md](docs/rest-api.md#pagination-ohlc-and-technicals).
5. **`get_market_summary` / `GET /v1/market-summary` is the one exception**
   to several rules above: JSON only (no CSV — it's a bundle of several
   small lists, not one table), and its cache is shared across all callers
   rather than scoped per user. See
   [docs/rest-api.md](docs/rest-api.md#market-summary).
6. **Google Antigravity's MCP OAuth support is currently unreliable** for
   this server (some users hit `401` even after authenticating) — there's no
   static-token fallback, since `/mcp/` only accepts OAuth bearer tokens. Use
   Claude Web, Claude Desktop, or ChatGPT instead if you hit this. See
   [docs/getting-started.md](docs/getting-started.md).

## Endpoints / tools at a glance

| REST endpoint | MCP tool | Notes |
|---|---|---|
| `GET /v1/symbols` | `get_symbols` | `q`/`sector` substring filters |
| `GET /v1/ohlc/:symbol` | `get_ohlc_data` | adjustments + pagination, see gotcha 4 |
| `GET /v1/financials/:symbol` | `get_financials` | quarterly, 365-day default window |
| `GET /v1/announcements/:symbol` | `get_announcements` | 365-day default window |
| `GET /v1/macro/series` | `get_macro_series` | |
| `GET /v1/macro/data` | `get_macro_data` | |
| `GET /v1/indices` | `get_indices` | ASPI, S&P SL20, sub-indices |
| `GET /v1/indices/:index/data` | `get_index_data` | |
| `GET /v1/technicals/:symbol` | `get_technicals` | shares pagination with OHLC |
| `GET /v1/screener/stocks` | `screen_stocks` | cross-sectional snapshot, not time series |
| `GET /v1/screener/indices` | `screen_indices` | |
| `GET /v1/market-summary` | `get_market_summary` | see gotcha 5 |

Full param/response shapes: [docs/rest-api.md](docs/rest-api.md) (REST),
[docs/mcp-tools.md](docs/mcp-tools.md) (MCP).

## Rate limits

Per-user, per-hour: free 100, pro 1000, business 10000. See
[docs/rate-limits.md](docs/rate-limits.md).

## Runnable examples

[examples/](examples/) has working curl, Python, and Node snippets for every
endpoint category above, including the `User-Agent` workaround from gotcha 1.
