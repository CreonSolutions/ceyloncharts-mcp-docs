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
| `from` | string (`YYYY-MM-DD`) | no | Optional date bound |
| `to` | string (`YYYY-MM-DD`) | no | Optional date bound |
| `interval` | `"daily"` \| `"weekly"` \| `"monthly"` | no | Defaults to `daily` |
| `adjust_splits` | boolean | no | Adjust for stock splits/scrip dividends. Default `true` |
| `adjust_rights` | boolean | no | Adjust for rights issues. Default `false` |
| `adjust_dividends` | boolean | no | Adjust for cash dividends (total-return series). Default `false` |
| `limit` | number | no | Max trading days returned, most recent first. Default 50, max 500 |
| `offset` | number | no | Skip this many of the most recent trading days — use to page further back |

Returns CSV: `date,open,high,low,close,volume`

A bare symbol/name for a company with multiple listed instruments (voting,
non-voting, rights, debentures, preferential — distinguished by ticker suffix)
defaults to the voting instrument; the response note lists the others. Give an
explicit suffix (e.g. `SAMP.X0000`) to pick a specific one.

Defaults to the most recent 50 trading days if no `from`/`to` is given. If
more history is available, the response note says so and how to page further
back with `offset`. The response note also lists any corporate actions
(splits/rights/dividends) that fall within the returned range, regardless of
whether the corresponding `adjust_*` flag was on — e.g. *"Prices are adjusted
for: splits. Corporate actions in this range: 2026-04-30 split (price
×0.1000, applied); 2026-06-03 dividend (price ×0.9900, not applied — raw
price shown)."*

### `get_financial_statement`

Full line-item detail for one financial statement (income statement, balance
sheet, or cash flow statement) — every quarter available, one row per line
item. Statements are entity-level (any instrument suffix is ignored).

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `symbol` | string | yes | Ticker or company name |
| `statement` | `"income"` \| `"balance"` \| `"cashflow"` | yes | Which statement to fetch |
| `company_type` | `"group"` \| `"company"` | no | Most companies only publish `group` (consolidated). Omit to try `group` then fall back to `company` automatically; pass explicitly to force one variant with no fallback |

Returns CSV: `label,canonical_key,<one column per fiscal period>` (most
recent period first).

**Cash-flow figures are cumulative (year-to-date), while income-statement
figures are per-quarter** — don't diff adjacent cash-flow columns as if they
were quarterly deltas.

> **Note**: `get_financials` (the compact multi-quarter revenue/income/EPS
> trend) is currently disabled on the hosted server in favor of this tool —
> if you need the older compact-trend shape, call
> `GET /v1/financials/:symbol` directly over REST instead (still live, just
> not exposed as an MCP tool right now). See
> [rest-api.md](rest-api.md#financial-statements).

### `get_announcements`

General CSE disclosures (board changes, AGM/EGM notices, listings, trading
suspensions/resumptions, name changes, etc.).

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `symbol` | string | yes | Ticker or company name |
| `from` | string (`YYYY-MM-DD`) | no | Defaults to 365 days before `to` |
| `to` | string (`YYYY-MM-DD`) | no | Defaults to today |

Returns CSV: `date,type,description,pdf_url`

**For dividends, rights issues, or share splits specifically, use
[`get_corporate_actions`](#get_corporate_actions) instead** — this tool's
`description` field is free text; `get_corporate_actions` has structured
amounts/ratios/ex-dates.

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

### `get_technicals`

Pre-computed daily technicals (moving averages, relative-strength rating,
52-week range, volume anomalies) for a CSE stock **or** a sector/headline
index — one tool for both.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `symbol` | string | yes | Ticker, company name, index symbol/name/abbreviation, or typo of any |
| `from` | string (`YYYY-MM-DD`) | no | Optional date bound |
| `to` | string (`YYYY-MM-DD`) | no | Optional date bound |
| `limit` | number | no | Max trading days returned, most recent first. Default 50, max 500 |
| `offset` | number | no | Skip this many of the most recent trading days — use to page further back |

Returns CSV, one row per trading day (most recent last):
`date,close,change_pct,volume,vol_sma10,vol_sma20,vol_sma50,vol_vs_sma50_pct,sma10,ema21,ema50,ema200,high_52w,low_52w,is_52w_high,is_52w_low,is_hve,is_hv1,is_hvytd,rs_line,rs_rating`

Defaults to the most recent 50 trading days; if more history is available,
the response note says so and how to page further back with `offset`.

### `screen_stocks`

Screen CSE stocks by pre-computed technical criteria. Every filter is
optional and AND-combined — omit a filter to not constrain on it.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `above_sma10` / `above_ema21` / `above_ema50` / `above_ema200` | boolean | no | Price above/below that moving average |
| `rs_rating_min` / `rs_rating_max` | number | no | Relative-strength rating, 1-99 |
| `change_pct_min` / `change_pct_max` | number | no | Today's percent change |
| `is_52w_high` / `is_52w_low` | boolean | no | At a 52-week high/low today |
| `is_hve` / `is_hv1` / `is_hvytd` | boolean | no | Highest volume ever / past 252 trading days / year-to-date |
| `vol_vs_sma50_pct_min` / `vol_vs_sma50_pct_max` | number | no | Volume vs. 50-day average, as a percent (`100` = 2x average) |
| `sector` | string | no | Substring filter against company sector |
| `date` | string (`YYYY-MM-DD`) | no | Defaults to the latest available trading date |
| `sort` | `"rs_rating"` \| `"change_pct"` \| `"vol_vs_sma50_pct"` \| `"close"` | no | Default `rs_rating` |
| `order` | `"asc"` \| `"desc"` | no | Default `desc` |
| `limit` | number | no | Default 20, max 100 |

Returns CSV, one row per matching stock. Example: `above_ema50=true,
above_ema200=true, rs_rating_min=80` finds market-leading uptrends;
`is_52w_high=true` finds stocks making new highs today;
`vol_vs_sma50_pct_min=100` finds stocks trading at 2x+ their average volume.

### `screen_indices`

Screen CSE sector/headline indices by the same trend criteria as
`screen_stocks` — moving-average position and relative-strength rating. No
52-week-range or volume filters (not tracked for indices). Use this to find
which sectors are in a sustained uptrend/downtrend, as distinct from
`get_indices`/`get_index_data`, which show a single day's performance.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `above_sma10` / `above_ema21` / `above_ema50` / `above_ema200` | boolean | no | Price above/below that moving average |
| `rs_rating_min` / `rs_rating_max` | number | no | Relative-strength rating, 1-99 |
| `change_pct_min` / `change_pct_max` | number | no | Today's percent change |
| `date` | string (`YYYY-MM-DD`) | no | Defaults to the latest available trading date |
| `sort` | `"rs_rating"` \| `"change_pct"` \| `"close"` | no | Default `rs_rating` |
| `order` | `"asc"` \| `"desc"` | no | Default `desc` |
| `limit` | number | no | Default 20, max 100 |

Returns CSV, one row per matching index.

### `get_market_summary`

Market-wide daily/weekly/monthly overview: top gainers/losers, top by
volume/turnover/crossings, ASI and S&P SL20 performance, and top/bottom
performing sectors.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `period` | `"daily"` \| `"weekly"` \| `"monthly"` | no | Default `daily` |
| `date` | string (`YYYY-MM-DD`) | no | Reference date, defaults to the latest trading date. For weekly/monthly, any date within the target period |
| `limit` | number | no | Max entries per list (gainers, losers, volume, turnover, crossings, top/bottom sectors). Default 5, max 20 |

Returns JSON, not CSV — the response is a bundle of several small named
lists, not one table.

A weekly or monthly summary requested mid-period covers what's happened
**so far** (e.g. Monday through today for a weekly summary requested on a
Wednesday) — not a wait for the period to finish, and not the prior complete
period. The response's `isPartialPeriod` field says which case applies.

### `get_corporate_actions`

Calendar of corporate actions (dividends, rights issues, share splits) —
announcement detail (amounts, ratios, ex-dates), not just a price-adjustment
factor. This is the tool for dividends/rights/splits specifically; for other
company disclosures, use `get_announcements` instead.

| Argument | Type | Required | Notes |
|----------|------|----------|-------|
| `symbol` | string | no | Ticker or company name — matches every share class of that company. Omit for a market-wide calendar |
| `kind` | `"split"` \| `"rights"` \| `"dividend"` | no | Restrict to one kind |
| `from` | string (`YYYY-MM-DD`) | no | No default lower bound — omit for the full dataset |
| `to` | string (`YYYY-MM-DD`) | no | No default upper bound |
| `limit` | number | no | Max entries returned, oldest first. Default 50, max 500 |
| `offset` | number | no | Skip this many of the earliest matching entries — use to page further in |

Returns CSV, one row per action. Omit all filters to browse everything past
and future, oldest first; pass `from=<today>` to jump straight to upcoming
ones, which is the most common need.

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
