#!/usr/bin/env bash
# CeylonCharts MCP Server — calling a tool directly over HTTP JSON-RPC
# Requires an OAuth bearer token — see docs/authentication.md
export ACCESS_TOKEN="<your-oauth-token>"

curl -s -X POST https://mcp.ceyloncharts.com/mcp/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_ohlc_data",
      "arguments": { "symbol": "SAMP", "from": "2025-01-01", "to": "2025-01-31" }
    }
  }'
echo
