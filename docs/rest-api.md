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

### Set a real `User-Agent`

Independently of API-key auth, Cloudflare's bot protection in front of this
domain blocks some HTTP clients' **default** `User-Agent` string outright
(e.g. Python's `urllib` sends `Python-urllib/3.x`, which gets a `1010` error)
— this happens before your request ever reaches the API, so a valid
`X-User-Id`/`X-Api-Key` won't help. curl's default UA is not blocked, but
don't rely on that; set an explicit, descriptive `User-Agent` header from
whatever client you use, e.g.:

```
User-Agent: MyApp/1.0 (contact@example.com)
```

If you get a blocked/challenge response instead of JSON, this is the first
thing to check.

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
`/v1/financials/:symbol`, `/v1/announcements/:symbol`,
`/v1/foreign-holdings/:symbol`, `/v1/shareholders/:symbol`,
`/v1/chart/:symbol`), the `series_id` query parameter (`/v1/macro/data`), and
the `:index` path parameter (`/v1/indices/:index`, `/v1/indices/:index/data`)
all accept more than an exact identifier. `/v1/quotes`'s `symbols` query
param resolves each comma-separated entry independently through this same
process. Each is resolved in order:

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

### Multi-instrument companies (OHLC, Foreign Holdings, Quotes, and Chart)

A company can have more than one tradable instrument (share class),
distinguished by ticker suffix:

| Suffix | Type |
|--------|------|
| `N` | voting (ordinary voting shares) |
| `X` | non-voting |
| `R` | rights |
| `D` | debentures |
| `P` | preferential |

`GET /v1/ohlc/:symbol`, `GET /v1/foreign-holdings/:symbol`,
`GET /v1/quotes` (`symbols` mode), and `GET /v1/chart/:symbol` are the only
endpoints where this matters (financials, announcements, and shareholders
are company-level, not per-instrument). Given a bare symbol or name with no
suffix:

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

## Financial Statements

`GET /v1/financials/:symbol` (compact multi-quarter trend) and
`GET /v1/financials/:symbol/statement` (full line-item detail for one
statement) serve different purposes — the same relationship as
`/v1/announcements/:symbol` vs. `/v1/corporate-actions` below:

| | `/v1/financials/:symbol` | `/v1/financials/:symbol/statement` |
|---|---|---|
| Purpose | Compact revenue/income/EPS trend across quarters | Full detail for one statement type |
| Shape | One row per quarter, fixed columns | One row per line item, one column per fiscal period |
| Statement types | N/A (summary fields only) | `income`, `balance`, or `cashflow` — pick one via `statement` |

`/statement` is entity-level, not per-share-class — it always resolves to the
voting-shares (`.N0000`) instrument regardless of which instrument the input
named. Most companies only publish a `group` (consolidated) statement, so
`company_type` defaults to trying `group` first and falling back to `company`
(standalone) automatically; pass it explicitly to force one variant with no
fallback. The response says which variant was actually served (`companyType`
in JSON, `X-Company-Type` header in CSV) since it may differ from what was
requested.

**Cash-flow figures are cumulative (year-to-date), while income-statement
figures are per-quarter** — don't diff adjacent cash-flow columns as if they
were quarterly deltas.

If the symbol is known but the statement hasn't been extracted yet, the
response is `404` with `"Financial data extraction under progress"` —
distinct from the standard "symbol not found" 404 for an unknown symbol.

## Corporate Action Adjustments (OHLC only)

`GET /v1/ohlc/:symbol` can adjust historical prices for corporate actions so
the series is continuous through splits, rights issues, and (optionally)
dividends. Three independent boolean query params control this:

| Param | Default | Adjusts for |
|-------|---------|-------------|
| `adjust_splits` | `true` | Stock splits and scrip/bonus share dividends — structural share-count changes where no payment changes hands |
| `adjust_rights` | `false` | Dilution from a rights issue (theoretical-ex-rights-price formula) |
| `adjust_dividends` | `false` | Cash dividends — turn on for a total-return series instead of raw price action |

Splits default **on** (clean, continuous price action is the common case);
rights and dividends default **off** (opt in explicitly).

The response always reports which flags were active and lists every corporate
action that fell within the requested `from`/`to` range — **regardless of
whether its flag was on** — so a caller with `adjust_dividends=false` (the
default) still learns that a real ex-dividend date is why the raw price
dipped, rather than mistaking it for noise:

- JSON: `meta.adjustments: { splits, rights, dividends }` (booleans) and
  `meta.events: [{ date, kind, factor, detail, adjusted }]`.
- CSV: `X-Adjustments` header (comma-joined active flags, e.g. `splits,rights`)
  and `X-Adjustment-Events` header (`date:kind:factor:adjusted` quads joined by
  `;`).

## Pagination (OHLC, Technicals, Corporate Actions, and Foreign Holdings)

`GET /v1/ohlc/:symbol`, `GET /v1/technicals/:symbol`,
`GET /v1/corporate-actions`, and `GET /v1/foreign-holdings/:symbol` share the
same pagination model. Three params control the window:

| Param | Default | Meaning |
|-------|---------|---------|
| `from` / `to` | none | Optional date bounds |
| `limit` | 50 | Max trading days returned, capped at 500 |
| `offset` | 0 | Skip this many of the most recent trading days before taking `limit` |

The query always runs most-recent-first, then reverses to chronological order
for the response. `limit` always caps the result, even with an explicit
`from`/`to` range — a 3-year date range still only returns the most recent
`limit` rows within it. For `GET /v1/ohlc/:symbol`, `meta.from`/`meta.to`
reflect the *actual* returned row bounds, not the raw query params.

If more history is available beyond the current page:

- JSON: `meta.hasMore: boolean`, plus `meta.nextOffset` (present only when
  `hasMore` is true — pass it as `offset` to get the next page).
- CSV: `X-Has-More` / `X-Next-Offset` headers.

## Screener

`GET /v1/screener/stocks` and `GET /v1/screener/indices` filter the whole
market (or the whole set of sector/headline indices) by pre-computed daily
technicals — moving-average position, relative-strength rating, 52-week range,
and volume anomalies. This is a cross-sectional *snapshot* for one trading
day, distinct from [`GET /v1/technicals/:symbol`](#get-v1technicalssymbol),
which is a time series for one symbol.

Every filter param is optional and combined with `AND`; omitting a filter
means "don't constrain on that dimension." Both endpoints share:

| Param | Meaning |
|-------|---------|
| `above_sma10` / `above_ema21` / `above_ema50` / `above_ema200` | Price above (`true`) or below (`false`) that moving average |
| `rs_rating_min` / `rs_rating_max` | Relative-strength rating, 1-99 percentile rank vs. the whole market |
| `change_pct_min` / `change_pct_max` | Today's percent change |
| `date` | Defaults to the latest available trading date |
| `sort` / `order` | Sort column and direction (default `rs_rating` desc) |
| `limit` | Default 20, capped at 100 |
| `format` | `csv` for the [CSV Response Format](#csv-response-format), default JSON |

`/screener/stocks` additionally supports:

| Param | Meaning |
|-------|---------|
| `is_52w_high` / `is_52w_low` | At a 52-week high/low today |
| `is_hve` / `is_hv1` / `is_hvytd` | Highest volume ever / in the past 252 trading days / year-to-date |
| `vol_vs_sma50_pct_min` / `vol_vs_sma50_pct_max` | Today's volume vs. its 50-day average, as a percent (e.g. `100` = 2x average) |
| `sector` | Substring match against the company's sector |
| `sort` | Also accepts `vol_vs_sma50_pct` |

These don't exist on `/screener/indices` — 52-week range and volume-anomaly
detection aren't computed for indices.

Note the screener's own moving averages/prices are **split-adjusted only** —
not necessarily on the same adjustment basis as `GET /v1/ohlc/:symbol`'s
`adjust_rights`/`adjust_dividends` output. Don't assume the two are
numerically comparable close-for-close.

There's no ambiguous/not-found case for the screener — an empty `data` array
(or empty CSV body) just means nothing matched the filters.

## Technicals

`GET /v1/technicals/:symbol` returns the same pre-computed daily technicals as
the screener, but as a time series for a **single** symbol — a stock ticker
or an index (`ASPI`, `SNP20`, `Energy`, ...), one endpoint serves both.

Row fields omit `above_sma10`/`above_ema21`/`above_ema50`/`above_ema200`
(derivable from `close` vs. the corresponding moving average, both of which
are in the row) but keep `is_52w_high`/`is_52w_low`/`is_hve`/`is_hv1`/`is_hvytd`
(not derivable from anything else in the row).

Shares the [pagination model](#pagination-ohlc-technicals-corporate-actions-and-foreign-holdings) with OHLC.

## Market Summary

`GET /v1/market-summary` is a market-wide daily/weekly/monthly overview: top
gainers/losers, top by volume/turnover/crossings, ASI and S&P SL20
performance, and top/bottom performing sectors — everything you'd want for
"what happened in the market today/this week/this month" in one call.

A weekly or monthly summary requested mid-period covers what's happened **so
far** (e.g. Monday through today for a weekly summary requested on a
Wednesday) — not a wait for the period to finish, and not the prior complete
period. The response's `meta.isPartialPeriod` says which case applies.

Unlike other endpoints, this one doesn't support `?format=csv` — the response
is a bundle of several small named lists (movers, activity leaders, indices,
sectors), not one homogeneous table, so there's no single CSV shape that
fits.

It's also one of two cached endpoints whose cache isn't scoped per user (the
other is [Corporate Actions](#corporate-actions) below) — the content doesn't
vary by caller, so every caller shares the same cached response for a given
set of query params.

## Corporate Actions

`GET /v1/corporate-actions` is a browse/calendar view of dividends, rights
issues, and share splits — full announcement detail (amounts, ratios,
ex-dates), not a price-adjustment factor. It's a different surface from two
other endpoints, each serving a distinct purpose:

| | `/v1/corporate-actions` | OHLC adjustment events | `/v1/announcements/:symbol` |
|---|---|---|---|
| Purpose | Browse what's been announced / what's coming up | Explain why a price series moved | General disclosures (board changes, AGM/EGM, suspensions, etc.) |
| Scope | Any range, or unfiltered, market-wide or one company | Whatever range you asked `get_ohlc_data` for | Company-specific |
| Detail | Full type-specific fields | Minimal: `{date, kind, factor, detail, adjusted}` | Free-text `description` |

**No default date restriction** — omit `from`/`to` entirely and you get every
corporate action in the dataset, past and future, oldest first (same
convention as `/v1/macro/data`/`/v1/indices/:index/data`). To see upcoming
ones specifically, pass `from=<today>`.

`symbol` (optional) resolves to the base company, not one instrument — a
corporate action can apply to any/all of a company's share classes, so the
filter matches every instrument of the resolved company. Omit it for a
market-wide calendar. `kind` (optional: `split`\|`rights`\|`dividend`)
narrows to one type.

Uses the same `limit`/`offset`/`hasMore`/`nextOffset` pagination as
`ohlc`/`technicals` — see [Pagination](#pagination-ohlc-technicals-corporate-actions-and-foreign-holdings).

## Foreign Holdings

`GET /v1/foreign-holdings/:symbol` is a daily foreign-shareholding
percentage series. Unlike financials/announcements/corporate-actions, this
data is keyed **per instrument**, not per company — a voting share and its
non-voting counterpart can carry different foreign-holding levels — so it
resolves exactly like [`GET /v1/ohlc/:symbol`](#get-v1ohlcsymbol): the
voting-shares instrument is used by default unless an explicit suffix (e.g.
`SAMP.X0000`) is given, and it shares OHLC's
[pagination model](#pagination-ohlc-technicals-corporate-actions-and-foreign-holdings).

`pct` is computed and sanity-clamped to `null` outside `[0, 100]` rather than
trusted from the source feed — a `null` means the source data was
internally inconsistent for that day (a known data-quality issue on at least
one symbol), not a true zero.

## Shareholders

`GET /v1/shareholders/:symbol` is the top-20 ranked shareholder list per
company, one snapshot per filed quarter. It resolves and keys exactly like
[`GET /v1/financials/:symbol/statement`](#get-v1financialssymbolstatement) —
entity-level, always the voting-shares (`.N0000`) instrument regardless of
the input's suffix — since a company files one shareholder register, not
one per share class.

Unlike every other list endpoint here, the default scope is **the latest
quarter only**, not the full dataset — pass `all=true` for every quarter on
record (oldest first), or `quarter=<label>` (exactly as it appears in
`meta.quarters`, e.g. `"Mar 2025"`) for one specific historical snapshot.
`meta.quarters` always lists every available quarter regardless of scope.

Response rows are flattened to one row per (quarter, shareholder) rather
than the source's nested per-quarter shape, and a baked-in rank prefix is
stripped from `name` (e.g. `"1  Mr John Doe"` → `"Mr John Doe"`).

## Live Quotes

`GET /v1/quotes` is a live price snapshot for CSE stocks — sourced from
Cloudflare Analytics Engine tick data during market hours (09:30–14:30 IST),
falling back to the last session's `ohlc` close outside that window or when
today's tick data isn't available yet. Stocks only — no sector/headline
indices.

Takes exactly one of two mutually exclusive params: `symbols` (comma-separated
tickers/names, typo-tolerant, up to 50) or `all=true` (every CSE stock in one
response). Unlike every single-symbol endpoint above, **one bad symbol in a
`symbols` list doesn't fail the whole request** — each row carries its own
`status` (`ok`/`ambiguous`/`not_found`/`no_data`), so a typo in one symbol
doesn't prevent the others from returning data. `candidates` is present only
on `ambiguous` rows.

Merge rule, most-authoritative first: today's finalized `ohlc` row (once the
EOD pipeline has run) outranks a live tick; a live tick outranks yesterday's
close when today's EOD hasn't landed yet; the last known `ohlc` row is the
final fallback when neither is available. `no_data` means neither exists —
typically a symbol outside the last 10 days of trading history.

No matter how many different `symbols` combinations are requested, the
underlying Analytics Engine query itself is cached behind a fixed key and
runs at most once every 15 seconds globally — not once per unique request —
to protect the upstream tick dataset from being overwhelmed.

`get_quotes`'s MCP tool requests `?format=csv` like every other tool here,
and the CSV columns (`symbol,price,prevClose,change,changePct,asOf`) can't
carry a per-row `status` or a nested `candidates` list — an ambiguous or
not-found row just shows up as empty price fields there, same as `no_data`.
To keep that distinction visible in CSV mode, the endpoint also sets
`X-Not-Found-Symbols` (comma-joined symbols/queries that resolved to
nothing) and `X-Ambiguous-Symbols` (`query:SYM1|Label1,SYM2|Label2;...`,
groups joined by `;`, candidates within a group by `,`, symbol/label by `|`)
response headers — the MCP tool folds these into a natural-language note
appended after the CSV table. If you're calling the REST endpoint directly
and want the full structured `status`/`candidates` per row instead of
parsing headers, use the default JSON response.

## Chart Images

`GET /v1/chart/:symbol` renders a candlestick + volume chart as a PNG image
— the only endpoint on this API that isn't JSON or CSV.

Resolves like [`GET /v1/ohlc/:symbol`](#get-v1ohlcsymbol) (per-instrument,
voting-shares default). Query params: `interval` (`daily`\|`weekly`\|`monthly`,
default `daily`), `bars` (default 90, max 250), `width` (default 900, range
200–2000), `height` (default 500, range 150–1200), `theme` (`light`\|`dark`,
default `light`). EOD data only for now — no intraday/live bars yet, even
during market hours.

Response is `Content-Type: image/png` on success. An ambiguous or unresolved
symbol returns the usual JSON candidates shape / `404` instead of an image —
check `Content-Type` before treating the body as image bytes.

## CSV Response Format

Every array-returning endpoint (`/v1/symbols`, `/v1/ohlc/:symbol`,
`/v1/financials/:symbol`, `/v1/financials/:symbol/statement`,
`/v1/announcements/:symbol`, `/v1/macro/series`, `/v1/macro/data`,
`/v1/indices`, `/v1/indices/:index/data`, `/v1/screener/stocks`,
`/v1/screener/indices`, `/v1/technicals/:symbol`, `/v1/corporate-actions`,
`/v1/foreign-holdings/:symbol`, `/v1/shareholders/:symbol`, `/v1/quotes`)
accepts `?format=csv` as an alternative to the default JSON envelope. JSON
stays the default. `/v1/market-summary` has no CSV mode at all — see
[Market Summary](#market-summary) — and `/v1/chart/:symbol` isn't JSON or CSV
to begin with, it always returns a PNG image — see [Chart Images](#chart-images).

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
| `X-Other-Instruments` | OHLC and Foreign Holdings only — sibling instruments of the same company, `symbol:type` pairs joined by `;`, e.g. `SAMP.X0000:non-voting` |
| `X-Adjustments` | OHLC only — active `adjust_*` flags, comma-joined, e.g. `splits,rights` |
| `X-Adjustment-Events` | OHLC only — corporate actions in range, `date:kind:factor:adjusted` quads joined by `;` — see [Corporate Action Adjustments](#corporate-action-adjustments-ohlc-only) |
| `X-Screen-Date` | Screener only — the trade date the results were computed for |
| `X-Has-More` / `X-Next-Offset` | OHLC, Technicals, Corporate Actions, and Foreign Holdings only — see [Pagination](#pagination-ohlc-technicals-corporate-actions-and-foreign-holdings) |
| `X-Company-Type` | Financial statement only (`/v1/financials/:symbol/statement`) — which variant (`group`/`company`) was actually served |
| `X-Not-Found-Symbols` | Quotes only — comma-joined symbols/queries that resolved to nothing, present only when at least one did |
| `X-Ambiguous-Symbols` | Quotes only — `query:SYM1\|Label1,SYM2\|Label2;...` (groups by `;`, candidates by `,`, symbol/label by `\|`), present only when at least one symbol was ambiguous — see [Live Quotes](#live-quotes) |
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
`weekly` | `monthly`), `adjust_splits`/`adjust_rights`/`adjust_dividends`
(booleans, default `true`/`false`/`false` — see
[Corporate Action Adjustments](#corporate-action-adjustments-ohlc-only)),
`limit` (default 50, max 500), `offset` (default 0) — see
[Pagination](#pagination-ohlc-technicals-corporate-actions-and-foreign-holdings), `format` (optional, `csv`).

```json
{
  "meta": {
    "symbol": "SAMP.N0000",
    "interval": "daily",
    "from": "2024-01-01",
    "to": "2024-01-02",
    "count": 2,
    "resolvedFrom": "SAMP",
    "otherInstruments": [{ "symbol": "SAMP.X0000", "type": "non-voting" }],
    "adjustments": { "splits": true, "rights": false, "dividends": false },
    "events": [{ "date": "2024-01-02", "kind": "dividend", "factor": 0.99, "detail": "final dividend (Rs.5.00/share)", "adjusted": false }],
    "hasMore": false
  },
  "data": [
    { "date": "2024-01-01", "open": 100, "high": 105, "low": 99, "close": 103, "volume": 10000 },
    { "date": "2024-01-02", "open": 103, "high": 108, "low": 102, "close": 107, "volume": 15000 }
  ]
}
```

`resolvedFrom` and `otherInstruments` are only present when relevant.
`adjustments` and `hasMore` are always present; `events`/`nextOffset` only
when there's something to report. Defaults to the most recent 50 trading
days if no range is given.

### `GET /v1/financials/:symbol`

Quarterly financial statement data. Accepts a ticker, base symbol, company
name, or typo of either. Query params: `from`, `to` (both `YYYY-MM-DD`,
optional — default to a trailing 365-day window), `format` (optional, `csv`).

Response `meta` additionally includes `name` and `resolvedFrom` when resolved
by name/fuzzy match. Row fields: `period`, `revenue`, `net_income`, `eps`,
`total_assets`, `total_equity`.

### `GET /v1/financials/:symbol/statement`

Full line-item detail for one financial statement — see
[Financial Statements](#financial-statements) for how this differs from the
compact trend above. Statements are entity-level and always resolve to the
voting-shares (`.N0000`) instrument regardless of the input's suffix.

Query params: `statement` (required — `income`\|`balance`\|`cashflow`),
`company_type` (optional — `group`\|`company`; omit to try `group` then fall
back to `company` automatically), `format` (optional, `csv`).

The response reorganizes the source data into a table — rows are line items,
columns are fiscal periods (most recent first). Rows with no data in any
period are dropped. Response `meta` additionally includes `name`,
`resolvedFrom`, `statement`, `companyType` (variant actually served),
`columns` (fiscal period labels), and `savedAt`. Response rows:
`{ "label": "...", "canonical_key": "...", "values": { "<period>": <number|null>, ... } }`
in JSON; in CSV, `values` is flattened so each period becomes its own column.

### `GET /v1/announcements/:symbol`

General CSE disclosures (board changes, AGM/EGM notices, listings, trading
suspensions/resumptions, name changes, etc.) in compact envelope. Accepts a
ticker, base symbol, company name, or typo of either — `AAF`, `AAF.N0000`,
and `Asia Asset Finance` all return the same data.

**For dividends, rights issues, or share splits specifically, use
[`GET /v1/corporate-actions`](#get-v1corporate-actions) instead** — this
endpoint's `description` field is free text; `/v1/corporate-actions` has
structured amounts/ratios/ex-dates.

Query params: `from`, `to` (optional, same default window), `format`
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

### `GET /v1/screener/stocks`

Screens CSE stocks by pre-computed daily technicals — see
[Screener](#screener) for the full param list.

Query params: `above_sma10`/`above_ema21`/`above_ema50`/`above_ema200` (bool),
`rs_rating_min`/`rs_rating_max`, `change_pct_min`/`change_pct_max`,
`is_52w_high`/`is_52w_low` (bool), `is_hve`/`is_hv1`/`is_hvytd` (bool),
`vol_vs_sma50_pct_min`/`vol_vs_sma50_pct_max`, `sector`, `date`, `sort`
(`rs_rating`|`change_pct`|`vol_vs_sma50_pct`|`close`, default `rs_rating`),
`order` (`asc`|`desc`, default `desc`), `limit` (default 20, max 100),
`format`.

Response row fields: `symbol`, `name`, `close`, `change_pct`, `volume`,
`vol_sma50`, `vol_vs_sma50_pct`, `sma10`, `ema21`, `ema50`, `ema200`,
`above_sma10`, `above_ema21`, `above_ema50`, `above_ema200`, `high_52w`,
`low_52w`, `is_52w_high`, `is_52w_low`, `is_hve`, `is_hv1`, `is_hvytd`,
`rs_line`, `rs_rating`. Response shape: `{ meta: { date, sort, order, count }, data: [...] }`.

### `GET /v1/screener/indices`

Screens CSE sector/headline indices by the same trend criteria — see
[Screener](#screener). No 52-week-range or volume params; those aren't
tracked for indices.

Query params: `above_sma10`/`above_ema21`/`above_ema50`/`above_ema200` (bool),
`rs_rating_min`/`rs_rating_max`, `change_pct_min`/`change_pct_max`, `date`,
`sort` (`rs_rating`|`change_pct`|`close`, default `rs_rating`), `order`
(`asc`|`desc`, default `desc`), `limit` (default 20, max 100), `format`.

Response row fields: `symbol`, `name`, `close`, `change_pct`, `sma10`,
`ema21`, `ema50`, `ema200`, `above_sma10`, `above_ema21`, `above_ema50`,
`above_ema200`, `rs_line`, `rs_rating`.

### `GET /v1/technicals/:symbol`

Pre-computed daily technicals for a single stock or index over time — see
[Technicals](#technicals). Accepts a ticker, company name, index
symbol/name/abbreviation, or typo of any.

Query params: `from` (`YYYY-MM-DD`), `to` (`YYYY-MM-DD`), `limit` (default 50,
max 500), `offset` (default 0) — see
[Pagination](#pagination-ohlc-technicals-corporate-actions-and-foreign-holdings), `format` (optional, `csv`).

Response `meta` additionally includes `resolvedFrom` when resolved by
name/abbreviation/fuzzy match, and `hasMore`/`nextOffset` for pagination.
Response row fields: `date`, `close`, `change_pct`, `volume`, `vol_sma10`,
`vol_sma20`, `vol_sma50`, `vol_vs_sma50_pct`, `sma10`, `ema21`, `ema50`,
`ema200`, `high_52w`, `low_52w`, `is_52w_high`, `is_52w_low`, `is_hve`,
`is_hv1`, `is_hvytd`, `rs_line`, `rs_rating`.

### `GET /v1/market-summary`

Market-wide overview for a daily/weekly/monthly window — see
[Market Summary](#market-summary) for the period-to-date semantics and why
this endpoint doesn't support `?format=csv`.

Query params: `period` (`daily` | `weekly` | `monthly`, default `daily`),
`date` (`YYYY-MM-DD`, optional — defaults to the latest trading date; for
weekly/monthly, any date within the target period), `limit` (max entries per
list, default 5, max 20).

```json
{
  "meta": {
    "period": "weekly",
    "periodStart": "2026-07-13",
    "periodEnd": "2026-07-16",
    "baselineDate": "2026-07-10",
    "isPartialPeriod": true,
    "limit": 5
  },
  "indices": [
    { "symbol": "ASI", "name": "ALL SHARE PRICE INDEX", "startClose": 12000, "endClose": 12150, "changePct": 1.25 }
  ],
  "topGainers": [
    { "symbol": "SAMP.N0000", "name": "Sampath Bank PLC", "startClose": 100, "endClose": 110, "changePct": 10 }
  ],
  "topLosers": [ ],
  "topVolume": [
    { "symbol": "COMB.N0000", "name": "Commercial Bank of Ceylon PLC", "totalVolume": 500000, "totalTurnover": 50000000, "totalCrossVolume": 10000, "totalCrossTrades": 3 }
  ],
  "topTurnover": [ ],
  "topCrossings": [ ],
  "topSectors": [
    { "symbol": "EGY", "name": "Energy", "startClose": 1000, "endClose": 1080, "changePct": 8 }
  ],
  "bottomSectors": [ ]
}
```

`indices` lists ASI/S&P SL20 performance (never ranked against sectors — a
headline index is a weighted average across every sub-sector, not a peer of
its own components). Returns `404` if there's no market data on or before
the reference date at all.

### `GET /v1/corporate-actions`

Corporate action calendar — see [Corporate Actions](#corporate-actions) for
how this differs from OHLC adjustment events and general announcements.
Accepts a ticker or company name for `symbol` (typo-tolerant, matches every
share class of the company), or omit for a market-wide calendar.

Query params: `symbol` (optional), `kind` (optional:
`split`\|`rights`\|`dividend`), `from`/`to` (`YYYY-MM-DD`, optional — no
default restriction, omit both for the full dataset), `limit` (default 50,
max 500), `offset` (default 0), `format` (optional, `csv`). Returns the
ambiguous-candidates shape if `symbol` matches more than one company, `404`
if it matches none.

Response `meta` additionally includes `name`/`resolvedFrom` when `symbol` was
resolved by name/fuzzy match, and `hasMore`/`nextOffset` for pagination.
Response row fields (union across the three kinds — fields for a different
kind are simply absent on a given row): `symbol`, `name`, `kind`,
`announced_date`, `effective_date`, `pdf_url`, `remarks`, plus kind-specific
fields — split: `type`, `split_factor`, `existing_shares`,
`resulting_shares`, `proportion_text`; rights: `entitlement_ratio`,
`issue_price`, `record_date`, `allotment_date`, `trading_commencement`,
`proportion_text`; dividend: `div_type`, `amount_per_share`, `record_date`,
`payment_date`.

### `GET /v1/foreign-holdings/:symbol`

Daily foreign-shareholding percentage series — see
[Foreign Holdings](#foreign-holdings) for the per-instrument resolution
(same as OHLC) and the `pct` clamping rule.

Query params: `from`/`to` (`YYYY-MM-DD`, optional), `limit` (default 50, max
500), `offset` (default 0), `format` (optional, `csv`). Returns the
ambiguous-candidates shape if the input doesn't resolve to one instrument,
`404` if the symbol isn't found.

Response `meta` additionally includes `resolvedFrom`/`otherInstruments` when
relevant, and `hasMore`/`nextOffset` for pagination. Response row fields:
`date`, `pct` (nullable), `foreign_holding`, `qty_cds` (nullable).

### `GET /v1/shareholders/:symbol`

Top-20 ranked shareholder list — see [Shareholders](#shareholders) for the
entity-level resolution (same as the financial statement endpoint) and the
latest-quarter-by-default scoping.

Query params: `quarter` (optional — one exact filed-period label from
`meta.quarters`, takes precedence over `all`), `all` (optional boolean,
default `false`), `format` (optional, `csv`). Returns the ambiguous-candidates
shape if `symbol` matches more than one company, `404` if it matches none or
no shareholder data has been extracted yet
(`"Shareholder data not yet available"`), or `400` if `quarter` isn't one of
`meta.quarters`.

Response `meta` additionally includes `name`/`resolvedFrom` when resolved by
name/fuzzy match, `quarters` (every filed period on record, oldest first),
and `quarter` (echoed back when the request scoped to one). Response row
fields: `quarter`, `rank`, `name`, `shares` (nullable), `pct` (nullable).

### `GET /v1/quotes`

Live price snapshot — see [Live Quotes](#live-quotes) for the merge rule
(today's EOD vs. live tick vs. last known close) and the per-row error
handling.

Query params: exactly one of `symbols` (comma-separated tickers/names, up to
50) or `all` (boolean — every CSE stock), `format` (optional, `csv`). `400`
if neither or both of `symbols`/`all` are given, or if `symbols` exceeds 50
entries.

Response: `{ meta: { mode: "symbols"|"all", count, asOf }, data: [...] }`.
Row fields: `symbol`, `resolvedFrom` (when resolved by name/fuzzy match),
`status` (`ok`\|`ambiguous`\|`not_found`\|`no_data`), `price` (nullable),
`prevClose` (nullable), `change` (nullable), `changePct` (nullable), `asOf`
(nullable), `candidates` (present only when `status` is `ambiguous`). Unlike
every other endpoint's ambiguous handling, this is never a whole-response
replacement — it's a per-row field, since a batch request can have some
symbols resolve fine and others not.

### `GET /v1/chart/:symbol`

Candlestick + volume chart PNG — see [Chart Images](#chart-images) for the
resolution rule and why this endpoint isn't JSON or CSV.

Query params: `interval` (`daily`\|`weekly`\|`monthly`, default `daily`),
`bars` (default 90, max 250), `width` (default 900, range 200–2000),
`height` (default 500, range 150–1200), `theme` (`light`\|`dark`, default
`light`). Returns the ambiguous-candidates shape (JSON) if the input doesn't
resolve to one instrument, `404` if the symbol isn't found or has no price
history yet, `400` for an out-of-range query param.

Response on success: `Content-Type: image/png`, raw PNG bytes.

## Caching

`GET` responses under `/v1/symbols`, `/v1/ohlc`, `/v1/financials` (both the
compact trend and full statement), `/v1/announcements`, `/v1/indices`,
`/v1/screener`, `/v1/technicals`, `/v1/market-summary`,
`/v1/corporate-actions`, `/v1/foreign-holdings`, `/v1/shareholders`,
`/v1/quotes`, and `/v1/chart` are all cached — 5 minutes by default,
except `/v1/quotes` (15 seconds) and `/v1/chart` (45 seconds), both shorter
to reflect how quickly their underlying data changes. Every one of these
caches is **shared across all callers** rather than scoped per user — the
response content is public market data that doesn't vary by caller, only by
query params, so every user benefits from the same cached entry instead of
each paying for their own upstream query.
