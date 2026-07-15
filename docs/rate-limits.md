# Rate Limits

Limits are enforced per user, per rolling one-hour window, based on your account's plan.

| Plan | Requests/hour |
|------|---------------|
| Free | 100 |
| Pro | 1,000 |
| Business | 10,000 |

## Response Headers

Every authenticated response includes:

- `X-RateLimit-Limit` — your plan's hourly limit
- `X-RateLimit-Remaining` — requests left in the current window
- `X-RateLimit-Reset` — Unix timestamp when the window resets

## Exceeding the Limit

Returns `429 Too Many Requests` with a `Retry-After` header (seconds until you can
retry).

```json
{
  "success": false,
  "error": { "code": "RATE_LIMITED", "message": "Rate limit exceeded", "details": {} }
}
```

## Notes

- Limits apply the same way whether you're calling the REST API directly or via
  MCP tools — MCP calls are attributed to your account and counted against the
  same bucket.
- Cached `GET` responses (see [rest-api.md](rest-api.md#caching)) still count
  against your limit.
- Need a higher limit? Visit https://www.ceyloncharts.com to upgrade your plan.
