# Examples

Runnable snippets for calling the CeylonCharts REST API and MCP server directly.

- `curl/rest-api.sh` — REST API calls (symbols, OHLC, financials, announcements)
- `curl/mcp-tool-call.sh` — a raw MCP `tools/call` request over HTTP
- `python/client.py` — minimal REST client (`pip install requests`)
- `node/client.js` — minimal REST client (Node >= 18, built-in `fetch`)

All examples expect credentials via environment variables — see
[../docs/authentication.md](../docs/authentication.md) for how to obtain them:

```bash
export CEYLONCHARTS_USER_ID="<your-user-id>"
export CEYLONCHARTS_API_KEY="<your-api-key>"
```
