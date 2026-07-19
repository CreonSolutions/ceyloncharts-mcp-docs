<p align="center">
  <img src="assets/logo-text-light-1024.png" alt="CeylonCharts" width="100%">
</p>

# CeylonCharts MCP Server

Colombo Stock Exchange (CSE) market data — symbols, OHLC price history (with
corporate-action adjustments), financial statements, corporate announcements,
market/sector indices, pre-computed technicals, a market screener, and
macroeconomic indicators — available as:

- A **REST API** (`https://mcp.ceyloncharts.com/api`)
- An **MCP server** (`https://mcp.ceyloncharts.com/mcp/`) for AI agents and assistants
  such as Claude

This repository documents how to connect to the hosted server and how to call its
endpoints. It does not contain the server's source code.

## Contents

- [Getting Started](docs/getting-started.md) — connect from Claude.ai, Claude Desktop, or plain HTTP
- [MCP Tools Reference](docs/mcp-tools.md) — the twelve tools exposed over MCP
- [REST API Reference](docs/rest-api.md) — endpoints, params, response shapes
- [Authentication](docs/authentication.md) — API keys and OAuth
- [Rate Limits](docs/rate-limits.md) — plan tiers and limits
- [Examples](examples/) — runnable curl, Python, and Node snippets

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `get_symbols` | List/search CSE-listed companies |
| `get_ohlc_data` | Daily/weekly/monthly OHLC price history |
| `get_financials` | Quarterly financial statement data |
| `get_announcements` | Corporate announcements/filings |
| `get_macro_series` | List available macroeconomic series |
| `get_macro_data` | Macroeconomic indicator data |
| `get_indices` | List CSE market/sector indices (ASPI, S&P SL20, industry sub-indices) |
| `get_index_data` | Historical data for a market/sector index |
| `get_technicals` | Pre-computed daily technicals (moving averages, RS rating, 52-week range) for a stock or index |
| `screen_stocks` | Screen CSE stocks by technical criteria (trend, RS rating, 52-week range, volume) |
| `screen_indices` | Screen sector/headline indices by trend and RS rating |
| `get_market_summary` | Daily/weekly/monthly market overview: top gainers/losers, activity leaders, index/sector performance |

See [docs/mcp-tools.md](docs/mcp-tools.md) for full input/output shapes.

## Quick Example

```bash
curl -H "X-User-Id: <your-user-id>" \
     -H "X-Api-Key: <your-api-key>" \
     https://mcp.ceyloncharts.com/api/v1/symbols
```

## Getting Access

API keys are issued on request rather than via self-service signup — see
[docs/authentication.md](docs/authentication.md) for how to request one.

## License

- Code samples in [examples/](examples/) are licensed under [MIT](LICENSE).
- Documentation in [docs/](docs/) is licensed under [CC BY 4.0](LICENSE-DOCS).
