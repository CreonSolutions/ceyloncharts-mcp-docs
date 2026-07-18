# Getting Started

There are three ways to use the CeylonCharts MCP Server, depending on your client.

## Option 1 — Claude.ai (browser) via OAuth

Claude.ai and other browser-based MCP clients can connect directly over HTTP using
OAuth — no bridge or local process required.

1. In your MCP client, add a new connector/tool with URL:
   ```
   https://mcp.ceyloncharts.com/mcp/
   ```
2. Complete the OAuth login flow when prompted. This authenticates you as a
   CeylonCharts user and issues a scoped, short-lived access token — your client
   handles token storage and refresh automatically.
3. The eleven tools listed in [mcp-tools.md](mcp-tools.md) will appear as available
   tools once connected.

## Option 2 — Claude Desktop (stdio clients)

Claude Desktop speaks MCP over stdio, not HTTP, so it needs a small local process
that bridges stdio to the hosted HTTP server. Contact us (see main repo) for the
bridge script, or write your own — it only needs to forward JSON-RPC requests from
stdin to `POST https://mcp.ceyloncharts.com/mcp/` and relay responses back to stdout.

Example config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ceyloncharts": {
      "command": "node",
      "args": ["/absolute/path/to/bridge.js"],
      "env": {
        "MCP_URL": "https://mcp.ceyloncharts.com/mcp/"
      }
    }
  }
}
```

Restart Claude Desktop after saving. A **tools** indicator should appear in the chat
input once the server connects.

## Option 3 — Direct HTTP (any language/tool)

Both the REST API and the MCP endpoint are plain HTTP and can be called from any
language. See [rest-api.md](rest-api.md) for REST endpoints and
[mcp-tools.md](mcp-tools.md) for MCP tool calls, and [examples/](../examples) for
working snippets in curl, Python, and Node.

Minimal MCP tool call:

```bash
curl -X POST https://mcp.ceyloncharts.com/mcp/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-oauth-token>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": { "name": "get_symbols", "arguments": {} }
  }'
```

## Next Steps

- [Authentication](authentication.md) — how to get an API key or OAuth token
- [MCP Tools Reference](mcp-tools.md)
- [REST API Reference](rest-api.md)
