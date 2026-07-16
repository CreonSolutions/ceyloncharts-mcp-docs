# REST API Reference

## Base URL

```
https://mcp.ceyloncharts.com/api
```

## Authentication

All endpoints below except `/health` require:

- `X-User-Id`: your account UUID
- `X-Api-Key`: your 64-character hex API key

Missing or invalid credentials return `401 Unauthorized`. See
[authentication.md](authentication.md) for how to obtain these.

## Rate Limiting

Enforced per user, per hour, based on your plan — see [rate-limits.md](rate-limits.md).
Every response includes:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header.

## Response Envelope

List/range endpoints return:

```json
{
  "meta": { "...": "endpoint-specific" },
  "data": [ ]
}
```

Errors follow:

```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "...", "details": {} }
}
```

## Symbol & Series Resolution

The `:symbol` path parameter (`/v1/symbols/:symbol`, `/v1/ohlc/:symbol`,
`/v1/financials/:symbol`, `/v1/announcements/:symbol`), the `series_id` query
parameter (`/v1/macro/data`), and the `:index` path parameter
(`/v1/indices/:index`, `/v1/indices/:index/data`) all accept more than an exact
identifier. Each is resolved in order:

1. **Exact match** — the identifier as given (e.g. `SAMP`, `SAMP.N0000`, an exact
   `series_id`, or an index symbol/code like `EGY`/`1010`).
2. **Name substring match** — a case-insensitive substring of the
   company/series/index name (e.g. `Sampath`, `inflation`, `Energy`).
3. **Fuzzy match** — a typo-tolerant match against the name (e.g. `Sampeth Bnk`),
   used only when the exact and substring tiers find nothing.

Indices additionally accept the common abbreviations `ASPI` and
`SNP20`/`SNP 20`/`SPSL20` as aliases for the two headline indices, since their
stored symbol (`ASI`) and full name (`ALL SHARE PRICE INDEX`) don't otherwise
match those tokens.

If resolution lands on exactly one result, the request proceeds normally and the
response's `meta` includes a `resolvedFrom` field with the original input
whenever it differs from the resolved symbol/`seriesId`.

If resolution finds **more than one** plausible match, the endpoint returns
`200 OK` (not an error — retrying won't resolve genuine ambiguity) with this
shape instead of data:

```json
{
  "meta": { "query": "Bank", "resolved": false, "reason": "ambiguous" },
  "candidates": [
    { "symbol": "COMB", "name": "Commercial Bank of Ceylon PLC" },
    { "symbol": "SAMP", "name": "Sampath Bank PLC" }
  ],
  "data": []
}
```

If nothing matches at all, the endpoint returns the usual `404 Not Found`.

### Multi-instrument companies (OHLC only)

A company can have more than one tradable instrument (share class),
distinguished by ticker suffix:

| Suffix | Type |
|--------|------|
| `N` | voting (ordinary voting shares) |
| `X` | non-voting |
| `R` | rights |
| `D` | debentures |
| `P` | preferential |

`GET /v1/ohlc/:symbol` is the only endpoint where this matters (financials and
announcements are company-level, not per-instrument). Given a bare symbol or
name with no suffix:

- If the company has exactly one instrument, it resolves automatically.
- If it has several and one is the voting (`N`) instrument, that one is used by
  default, and the response's `meta.otherInstruments` lists the rest.
- If it has several and none is a voting instrument, the request returns the
  ambiguous-response shape (with `{ "symbol": "...", "type": "..." }` candidates)
  instead of guessing.

An explicit instrument suffix (e.g. `NTB.X0000`) is always honored exactly as
given — the default only applies when the caller doesn't specify one.

### Indices

CSE market/sector indices come in two shapes, distinguished by `is_main_index`:

- **Headline indices** (`is_main_index: true` — ASPI, S&P SL20) — intraday
  `open`/`high`/`low`/`close` populated; `sector_turnover`/`sector_volume`/`sector_trades` null.
- **Industry sub-indices** (`is_main_index: false` — e.g. Energy, Materials,
  Banks) — `open`/`close` populated but `high`/`low` null;
  `sector_turnover`/`sector_volume`/`sector_trades` populated instead.

`price_index`, `per`, `pbv`, `dy`, `companies_traded`, `companies_listed` are
carried through as-is from the source data and may be null on either shape.

## CSV Response Format

Every array-returning endpoint (`/v1/symbols`, `/v1/ohlc/:symbol`,
`/v1/financials/:symbol`, `/v1/announcements/:symbol`, `/v1/macro/series`,
`/v1/macro/data`, `/v1/indices`, `/v1/indices/:index/data`) accepts
`?format=csv` as an alternative to the default JSON envelope. JSON stays the
default.

```
Content-Type: text/csv; charset=utf-8

date,open,high,low,close,volume
2024-01-02,100,105,99,103,10000
2024-01-03,103,108,102,107,15000
```

Everything that would live in the JSON `meta` object moves to response headers
instead:

| Header | Present when |
|--------|--------------|
| `X-Resolved-Symbol` | Always (ticker/company endpoints) |
| `X-Resolved-Series-Id` | Always (`/v1/macro/data` only) |
| `X-Resolved-From` | Resolution used name/fuzzy matching (differs from the resolved identifier) |
| `X-Resolved-Name` | Endpoint returns company/series-level data (financials, announcements, macro data) |
| `X-Other-Instruments` | OHLC only — sibling instruments of the same company, `symbol:type` pairs joined by `;`, e.g. `SAMP.X0000:non-voting` |
| `X-Result-Count` | Always |

**Ambiguous and not-found responses always stay JSON** regardless of
`?format=csv` — check `Content-Type` to decide how to parse the body:
`text/csv` means real data with `X-Resolved-*` headers, `application/json`
means either the ambiguous-candidates shape (`200`) or the standard error
envelope (`404`, etc.).

## Endpoints

### `GET /health`

No auth required.

```json
{ "status": "ok" }
```

### `GET /v1/symbols`

Returns a sorted array of symbol metadata.

Query params: `q` (optional) — substring search against company name, e.g.
`?q=bank`. `sector` (optional) — substring search against sector, e.g.
`?sector=bank` (combines with `q` as AND). `format` (optional) — `csv`, see
[CSV Response Format](#csv-response-format).

```json
[
  { "symbol": "COMB", "name": "Commercial Bank of Ceylon PLC", "sector": "Banking" },
  { "symbol": "SAMP", "name": "Sampath Bank PLC", "sector": "Banking" }
]
```

### `GET /v1/symbols/:symbol`

Metadata for a single symbol. Accepts a ticker, company name, or typo of either
— see [Symbol & Series Resolution](#symbol--series-resolution). Returns the
ambiguous-response shape if more than one company matches, `404` if none do.

### `GET /v1/ohlc/:symbol`

Accepts a ticker (exact instrument or bare company symbol), company name, or
typo of either, including the multi-instrument default/disambiguation behavior.

Query params: `from` (`YYYY-MM-DD`), `to` (`YYYY-MM-DD`), `interval` (`daily` |
`weekly` | `monthly`), `format` (optional, `csv`).

```json
{
  "meta": {
    "symbol": "SAMP.N0000",
    "interval": "daily",
    "from": "2024-01-01",
    "to": "2024-01-02",
    "count": 2,
    "resolvedFrom": "SAMP",
    "otherInstruments": [{ "symbol": "SAMP.X0000", "type": "non-voting" }]
  },
  "data": [
    { "date": "2024-01-01", "open": 100, "high": 105, "low": 99, "close": 103, "volume": 10000 },
    { "date": "2024-01-02", "open": 103, "high": 108, "low": 102, "close": 107, "volume": 15000 }
  ]
}
```

`resolvedFrom` and `otherInstruments` are only present when relevant.

### `GET /v1/financials/:symbol`

Quarterly financial statement data. Accepts a ticker, base symbol, company
name, or typo of either. Query params: `from`, `to` (both `YYYY-MM-DD`,
optional — default to a trailing 365-day window), `format` (optional, `csv`).

Response `meta` additionally includes `name` and `resolvedFrom` when resolved
by name/fuzzy match. Row fields: `period`, `revenue`, `net_income`, `eps`,
`total_assets`, `total_equity`.

### `GET /v1/announcements/:symbol`

Corporate announcements. Accepts a ticker, base symbol, company name, or typo
of either — `AAF`, `AAF.N0000`, and `Asia Asset Finance` all return the same
data. Query params: `from`, `to` (optional, same default window), `format`
(optional, `csv`).

Response `meta` additionally includes `name` and `resolvedFrom`. Row fields:
`date`, `type`, `description`, `pdf_url`.

### `GET /v1/macro/series`

List of macroeconomic series definitions. Query params: `q` (optional) —
substring search against series name, e.g. `?q=inflation`. `format` (optional,
`csv`).

### `GET /v1/macro/data?series_id=...&from=...&to=...`

Macroeconomic data for a series. `series_id` accepts the exact identifier, a
series name, or a typo of either. `format` (optional, `csv`). Response `meta`
additionally includes `name` and `resolvedFrom` when resolved by name/fuzzy
match.

### `GET /v1/indices`

Array of CSE market/sector index definitions (headline + industry sub-indices
— see [Indices](#indices)). Query params: `q` (optional) — substring search
against index name, e.g. `?q=energy`. `format` (optional, `csv`).

```json
[
  { "symbol": "ASI", "name": "ALL SHARE PRICE INDEX", "index_name": "ALL SHARE PRICE INDEX", "is_main_index": true },
  { "symbol": "EGY", "name": "Energy", "index_code": "1010", "index_name": "S&P/CSE Energy Industry Group Index", "is_main_index": false }
]
```

### `GET /v1/indices/:index`

Metadata for a single index. Accepts an index symbol, name, common
abbreviation (`ASPI`, `SNP20`), or typo of any. Returns the ambiguous-response
shape if more than one index matches, `404` if none do.

### `GET /v1/indices/:index/data`

Historical index data. Accepts an index symbol, name, abbreviation, or typo of
any — see [Indices](#indices) for the headline-vs-sub-index column shape.
Query params: `from`, `to` (`YYYY-MM-DD`), `format` (optional, `csv`).

Response `meta` additionally includes `name` and `resolvedFrom`. Row fields:
`date`, `open`, `high`, `low`, `close`, `change`, `change_pct`,
`sector_turnover`, `sector_volume`, `sector_trades`, `price_index`, `per`,
`pbv`, `dy`, `companies_traded`, `companies_listed`.

## Caching

`GET` responses under `/v1/symbols`, `/v1/ohlc`, `/v1/financials`,
`/v1/announcements`, and `/v1/indices` are cached for up to 5 minutes.
