# MCP Tools Reference

All tools are called via standard MCP `tools/call` requests. Responses use the same
compact envelope as the REST API (`{ meta, data }`) unless noted otherwise.

## `get_symbols`

List or look up CSE-listed companies.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `symbol` | string | no | If omitted, returns all symbols |

## `get_ohlc_data`

Daily/weekly/monthly OHLC price history for a symbol.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `symbol` | string | yes | Suffix (e.g. `.N0000`) is optional — `AAF` and `AAF.N0000` resolve the same |
| `from` | string (`YYYY-MM-DD`) | no | Defaults to 365 days before `to` |
| `to` | string (`YYYY-MM-DD`) | no | Defaults to today |
| `interval` | `"daily"` \| `"weekly"` \| `"monthly"` | no | Defaults to `daily` |

## `get_financials`

Quarterly financial statement data.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `symbol` | string | yes | |
| `from` | string (`YYYY-MM-DD`) | no | Defaults to 365 days before `to` |
| `to` | string (`YYYY-MM-DD`) | no | Defaults to today |

Row fields: `period`, `revenue`, `net_income`, `eps`, `total_assets`, `total_equity`.

## `get_announcements`

Corporate announcements/filings.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `symbol` | string | yes | |
| `from` | string (`YYYY-MM-DD`) | no | Defaults to 365 days before `to` |
| `to` | string (`YYYY-MM-DD`) | no | Defaults to today |

Row fields: `date`, `type`, `description`, `pdf_url`.

## `get_macro_series`

List available macroeconomic series definitions. No arguments.

## `get_macro_data`

Data for a specific macroeconomic series.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `series_id` | string | yes | From `get_macro_series` |
| `from` | string (`YYYY-MM-DD`) | no | Defaults to 365 days before `to` |
| `to` | string (`YYYY-MM-DD`) | no | Defaults to today |

## Example Call

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_ohlc_data",
    "arguments": { "symbol": "SAMP", "from": "2025-01-01", "to": "2025-01-31" }
  }
}
```
