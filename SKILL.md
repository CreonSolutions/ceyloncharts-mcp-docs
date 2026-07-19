---
name: ceyloncharts-mcp
description: Reference for calling the CeylonCharts CSE market-data API (REST or MCP) — symbols, OHLC/technicals, financials, announcements, indices, screener, market summary. Use when writing code that calls mcp.ceyloncharts.com, debugging a failed call to it, or wiring up its MCP tools.
---

# CeylonCharts MCP Server

Colombo Stock Exchange (CSE) market data — symbols, OHLC price history,
financials, announcements, market/sector indices, pre-computed technicals, a
screener, and a market summary — as a REST API and an MCP server. Both are
Cloudflare Workers behind the same custom domain. This skill is docs/examples
only — no server source code here; see [docs/](docs/) for full detail behind
every summary below.

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
   endpoint except `/v1/market-summary` — one header row instead of
   repeating field names per row. Meta moves to `X-Resolved-*`/`X-Has-More`
   response headers instead of a JSON `meta` object. See
   [docs/rest-api.md](docs/rest-api.md#csv-response-format).
4. **OHLC and technicals default to the last 50 trading days**, not full
   history — `limit` (max 500) / `offset` page further back;
   `hasMore`/`nextOffset` say if there's more. A wide `from`/`to` range does
   not guarantee you got everything. See
   [docs/rest-api.md](docs/rest-api.md#pagination-ohlc-and-technicals).
5. **`get_market_summary` / `GET /v1/market-summary` breaks two rules
   above**: JSON only (no CSV — it's several small lists, not one table),
   and its cache is shared across all callers, not scoped per user. See
   [docs/rest-api.md](docs/rest-api.md#market-summary).
6. **Google Antigravity's MCP OAuth support is currently unreliable** here
   (some users get `401` even after authenticating), and there's no
   static-token fallback since `/mcp/` only accepts OAuth bearer tokens. Use
   Claude Web, Claude Desktop, or ChatGPT instead if this comes up. See
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
[docs/mcp-tools.md](docs/mcp-tools.md) (MCP). Rate limits (free 100/hr, pro
1000/hr, business 10000/hr): [docs/rate-limits.md](docs/rate-limits.md).
Runnable curl/Python/Node snippets: [examples/](examples/).
