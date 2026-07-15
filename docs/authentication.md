# Authentication

There are two ways to authenticate, depending on how you're connecting.

## API Keys (REST API, server-to-server)

Used for direct calls to the REST API (`/v1/...` endpoints).

- `X-User-Id`: your account UUID
- `X-Api-Key`: a 64-character hex string

```bash
curl -H "X-User-Id: <your-user-id>" \
     -H "X-Api-Key: <your-api-key>" \
     https://mcp.ceyloncharts.com/api/v1/symbols
```

Only a salted hash of your key is ever stored server-side — the plaintext key is
shown once, at creation time, and cannot be retrieved again if lost.

**Requesting a key**: API keys are currently provisioned by request rather than
self-service signup. Visit https://www.ceyloncharts.com to get an account and key
created for you.

**Losing a key**: if a key is compromised or lost, get it
revoked and reissued through https://www.ceyloncharts.com — revoked keys stop working immediately.

## OAuth (Claude.ai / browser MCP clients)

When connecting to `https://mcp.ceyloncharts.com/mcp/` from Claude.ai or another
browser-based MCP client, you authenticate via an OAuth 2.1 login flow instead of
an API key:

1. Your MCP client redirects you to log in with your CeylonCharts account.
2. On success, the client receives a short-lived access token scoped to your
   account and plan.
3. Your client stores and refreshes this token automatically — you don't need to
   handle it manually.

If you're scripting direct HTTP calls to the MCP endpoint (rather than using a
client that handles OAuth for you), pass the token as a bearer token:

```
Authorization: Bearer <access-token>
```

## Which one do I need?

| Use case | Auth method |
|----------|-------------|
| Calling `/v1/...` REST endpoints yourself | API key |
| Connecting Claude.ai or another OAuth-capable MCP client | OAuth |
| Connecting Claude Desktop via a stdio bridge | Depends on how the bridge is configured — see [getting-started.md](getting-started.md) |
