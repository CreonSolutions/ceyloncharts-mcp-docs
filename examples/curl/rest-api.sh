#!/usr/bin/env bash
# CeylonCharts REST API — curl examples
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
