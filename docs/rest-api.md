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

## Endpoints

### `GET /health`

No auth required.

```json
{ "status": "ok" }
```

### `GET /v1/symbols`

All CSE-listed symbols.

```json
[
  { "symbol": "COMB", "name": "Commercial Bank of Ceylon PLC", "sector": "Banking" },
  { "symbol": "SAMP", "name": "Sampath Bank PLC", "sector": "Banking" }
]
```

### `GET /v1/symbols/:symbol`

Metadata for a single symbol. `404` if unknown.

### `GET /v1/ohlc/:symbol`

Query params: `from` (`YYYY-MM-DD`), `to` (`YYYY-MM-DD`), `interval` (`daily` | `weekly` | `monthly`).

```json
{
  "meta": { "symbol": "SAMP", "interval": "daily", "from": "2024-01-01", "to": "2024-01-02", "count": 2 },
  "data": [
    { "date": "2024-01-01", "open": 100, "high": 105, "low": 99, "close": 103, "volume": 10000 },
    { "date": "2024-01-02", "open": 103, "high": 108, "low": 102, "close": 107, "volume": 15000 }
  ]
}
```

### `GET /v1/financials/:symbol`

Quarterly financial statement data. Query params: `from`, `to` (both `YYYY-MM-DD`,
optional — default to a trailing 365-day window).

Row fields: `period`, `revenue`, `net_income`, `eps`, `total_assets`, `total_equity`.

### `GET /v1/announcements/:symbol`

Corporate announcements. Query params: `from`, `to` (optional, same default window).
The `.N0000`-style suffix is optional — `AAF` and `AAF.N0000` return the same data.

Row fields: `date`, `type`, `description`, `pdf_url`.

### `GET /v1/macro/series`

List of macroeconomic series definitions.

### `GET /v1/macro/data?series_id=...&from=...&to=...`

Macroeconomic data for a series, in the compact envelope.

## Caching

`GET` responses under `/v1/symbols`, `/v1/ohlc`, `/v1/financials`, and
`/v1/announcements` are cached for up to 5 minutes.
