#!/usr/bin/env bash
# CeylonCharts REST API — curl examples
#
# curl's default User-Agent isn't blocked by Cloudflare's bot protection on
# this domain, unlike some other HTTP clients (e.g. Python's urllib) — see
# "Set a real User-Agent" in docs/rest-api.md. If you swap these calls for
# another tool/language, set an explicit User-Agent header.
#
# Set these before running:
export USER_ID="<your-user-id>"
export API_KEY="<your-api-key>"

BASE_URL="https://mcp.ceyloncharts.com/api"

echo "== List symbols =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/symbols" | head -c 500
echo

echo "== OHLC for SAMP (Jan 2025, daily) =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/ohlc/SAMP?from=2025-01-01&to=2025-01-31&interval=daily"
echo

echo "== Financials for COMB =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/financials/COMB"
echo

echo "== Announcements for AAF =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/announcements/AAF"
echo

echo "== List indices =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/indices" | head -c 500
echo

echo "== ASPI index data (Jan 2025, CSV) =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/indices/ASPI/data?from=2025-01-01&to=2025-01-31&format=csv"
echo

echo "== Technicals for SAMP (last 20 trading days) =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/technicals/SAMP?limit=20"
echo

echo "== Screen stocks: uptrend + RS rating >= 80 =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/screener/stocks?above_ema50=true&above_ema200=true&rs_rating_min=80"
echo

echo "== Screen indices sorted by relative strength =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/screener/indices?sort=rs_rating&order=desc&limit=10"
echo

echo "== Weekly market summary =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/market-summary?period=weekly&limit=5"
echo

echo "== SAMP income statement (CSV) =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/financials/SAMP/statement?statement=income&format=csv"
echo

echo "== Upcoming corporate actions (dividends/rights/splits) =="
curl -s -H "X-User-Id: $USER_ID" -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/v1/corporate-actions?from=$(date +%F)&limit=20"
echo
