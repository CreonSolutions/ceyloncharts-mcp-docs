# Rate Limits

Limits are enforced per user, per rolling one-hour window, based on your account's plan.

| Plan | Requests/hour |
|------|---------------|
| Basic | 20 |
| Pro | 100 |
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
- Need a higher limit? Visit https://www.ceyloncharts.com to upgrade your plan
  — the new limit applies immediately to your existing API key, no need to
  regenerate it.
- The Basic tier's 20 requests/hour is easy to hit if you're iterating on
  code that calls the API repeatedly (e.g. a test loop) — a Pro key gives
  you more headroom for that kind of workflow.
