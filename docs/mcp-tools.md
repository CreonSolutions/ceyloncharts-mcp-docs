# MCP Tools Reference

All tools are called via standard MCP `tools/call` requests.

## Response Format

Every tool returns a single `text` content block:

- **Normal results** are CSV (header row + data rows), optionally preceded by a
  short natural-language note when the input was resolved by name/typo, e.g.:

  ```
  Resolved "Sampeth Bnk" to SAMP.N0000 (Sampath Bank PLC). This company also has: SAMP.X0000 (non-voting).

  date,open,high,low,close,volume
  2025-01-02,100,105,99,103,10000
  ```

- **Ambiguous input** (e.g. a name matching more than one company) returns JSON
  candidates instead of data — ask the user to pick one, then call the tool again
  with the exact symbol:

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

## Symbol / Series / Index Resolution

Every tool that takes a `symbol`, `series_id`, or `index` argument accepts more
than an exact identifier — matching is tried in order:

1. **Exact match** (e.g. `SAMP`, `SAMP.N0000`, `ASPI`)
2. **Name substring match** (e.g. `Sampath`, `inflation`, `Energy`) — case-insensitive
3. **Fuzzy match** (e.g. `Sampeth Bnk`) — typo-tolerant, tried only if the first two find nothing

Indices additionally accept the common abbreviations `ASPI` and `SNP20` /
`SNP 20` / `SPSL20` for the two headline indices.

Typos are tolerated everywhere this applies — you don't need the exact ticker.

## Tools

### `get_symbols`

List/search CSE-listed companies.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `query` | string | no | Substring search against company name, e.g. `"bank"` |
| `sector` | string | no | Substring search against sector, e.g. `"materials"`. Combines with `query` (AND) |

Returns CSV: `symbol,name,sector,industry,is_active,last_updated`

### `get_ohlc_data`

Daily/weekly/monthly OHLCV price history.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `symbol` | string | yes | Ticker or company name — see [resolution](#symbol--series--index-resolution) |
| `from` | string (`YYYY-MM-DD`) | no | Defaults to 365 days before `to` |
| `to` | string (`YYYY-MM-DD`) | no | Defaults to today |
| `interval` | `"daily"` \| `"weekly"` \| `"monthly"` | no | Defaults to `daily` |

Returns CSV: `date,open,high,low,close,volume`

A bare symbol/name for a company with multiple listed instruments (voting,
non-voting, rights, debentures, preferential — distinguished by ticker suffix)
defaults to the voting instrument; the response note lists the others. Give an
explicit suffix (e.g. `SAMP.X0000`) to pick a specific one.

### `get_financials`

Quarterly financial statement data.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `symbol` | string | yes | Ticker or company name |
| `from` | string (`YYYY-MM-DD`) | no | Defaults to 365 days before `to` |
| `to` | string (`YYYY-MM-DD`) | no | Defaults to today |

Returns CSV: `period,revenue,net_income,eps,total_assets,total_equity`

### `get_announcements`

Corporate announcements (dividends, rights, board changes, etc.).

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `symbol` | string | yes | Ticker or company name |
| `from` | string (`YYYY-MM-DD`) | no | Defaults to 365 days before `to` |
| `to` | string (`YYYY-MM-DD`) | no | Defaults to today |

Returns CSV: `date,type,description,pdf_url`

### `get_macro_series`

List available macroeconomic series definitions.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `query` | string | no | Substring search against series name, e.g. `"inflation"` |

Returns CSV: `id,name,description,frequency,unit,source`

### `get_macro_data`

Data for a specific macroeconomic series.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `series_id` | string | yes | Series ID or name — see [resolution](#symbol--series--index-resolution) |
| `from` | string (`YYYY-MM-DD`) | no | Defaults to 365 days before `to` |
| `to` | string (`YYYY-MM-DD`) | no | Defaults to today |

Returns CSV: `date,value`

### `get_indices`

List CSE market/sector indices (ASPI, S&P SL20, and industry sub-indices).

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `query` | string | no | Substring search against index name, e.g. `"energy"` |

Returns CSV: `symbol,name,index_code,index_name,is_main_index`

### `get_index_data`

Historical data for a CSE market/sector index.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `index` | string | yes | Index symbol, name, or abbreviation (`ASPI`, `SNP20`) — see [resolution](#symbol--series--index-resolution) |
| `from` | string (`YYYY-MM-DD`) | no | Defaults to 365 days before `to` |
| `to` | string (`YYYY-MM-DD`) | no | Defaults to today |

Returns CSV: `date,open,high,low,close,change,change_pct,sector_turnover,sector_volume,sector_trades,price_index,per,pbv,dy,companies_traded,companies_listed`

Headline indices (ASPI, S&P SL20) populate `open`/`high`/`low`/`close`; industry
sub-indices instead populate `sector_turnover`/`sector_volume`/`sector_trades` and
leave `high`/`low` empty.

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
