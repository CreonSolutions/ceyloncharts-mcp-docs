# Getting Started

There are five ways to use the CeylonCharts MCP Server, depending on your client.

## Option 1 — Claude Web (claude.ai) via OAuth

Claude.ai and other browser-based MCP clients can connect directly over HTTP using
OAuth — no bridge or local process required.

1. In Claude.ai, click **Profile** in the left sidebar then **Settings** → **Connectors** → **+**
   → **Add custom connector**, and enter the server URL:
   ```
   https://mcp.ceyloncharts.com/mcp/
   ```
   (On a Team/Enterprise plan, an Owner adds it once under
   **Organization Settings → Connectors → Add → Custom**, and members then
   connect individually from their own Connectors panel.)
2. Complete the OAuth login flow when prompted. This authenticates you as a
   CeylonCharts user and issues a scoped, short-lived access token — your client
   handles token storage and refresh automatically.
3. Enable the connector for a conversation via the **+** button in the message
   composer → **Connectors**, if it isn't already toggled on.
4. The fifteen tools listed in [mcp-tools.md](mcp-tools.md) will appear as available
   tools once connected.

## Option 2 — ChatGPT (Developer Mode)

ChatGPT can connect to remote MCP servers through **Developer Mode**, currently in
beta on Plus, Pro, Business, Enterprise, and Education plans (web only).

1. Enable it: **Settings → Security and login** → toggle on **Developer mode**.
   (Business/Enterprise workspaces may require admin approval first.)
2. Go to **Settings → Plugins** (or visit `chatgpt.com/plugins`) and click the
   **+** button to create a new developer-mode app.
3. Fill in:
   - **Name**: e.g. "CeylonCharts"
   - **Description**: what the server provides
   - **MCP server URL**: `https://mcp.ceyloncharts.com/mcp/`
   - **Authentication**: `OAuth`
4. Click **Create**, then complete the OAuth login when prompted.
5. Add the connector to a conversation via the **+** button in the message
   composer to start using the tools listed in [mcp-tools.md](mcp-tools.md).

## Option 3 — Google Antigravity

Antigravity reads MCP server configuration from a shared JSON file used by the
IDE and CLI:

- macOS/Linux: `~/.gemini/antigravity/mcp_config.json`
- Windows: `C:\Users\<username>\.gemini\antigravity\mcp_config.json`

1. In the editor's agent panel, open the **...** menu → **MCP Servers** →
   **Manage MCP Servers** → **View raw config**.
2. Add an entry under `mcpServers`:
   ```json
   {
     "mcpServers": {
       "ceyloncharts": {
         "serverUrl": "https://mcp.ceyloncharts.com/mcp/"
       }
     }
   }
   ```
   (Antigravity uses `serverUrl`, not `url` — the schema is stricter than some
   other MCP clients.)
3. Restart Antigravity. If the server shows an **Authenticate** button, use it
   to complete the OAuth login.

> **Known limitation**: as of this writing, Antigravity's support for the MCP
> OAuth spec is still unreliable for third-party remote servers — some users
> report `401 Unauthorized` even after clicking Authenticate. If that happens
> here, there's currently no static-token fallback for this server (`/mcp/`
> only accepts OAuth bearer tokens, not API keys) — use Claude Web, Claude
> Desktop, or ChatGPT instead until Antigravity's OAuth support stabilizes.

## Option 4 — Claude Desktop (stdio clients)

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

## Option 5 — Direct HTTP (any language/tool)

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
