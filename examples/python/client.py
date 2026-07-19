"""CeylonCharts REST API — minimal Python client example.

Requires only `requests` (pip install requests).
"""
import os
import requests

BASE_URL = "https://mcp.ceyloncharts.com/api"


def _headers() -> dict:
    return {
        "X-User-Id": os.environ["CEYLONCHARTS_USER_ID"],
        "X-Api-Key": os.environ["CEYLONCHARTS_API_KEY"],
        # Cloudflare's bot protection in front of this domain blocks some
        # HTTP clients' default User-Agent outright (e.g. urllib's) before
        # the request even reaches the API — see rest-api.md. `requests`'
        # default UA is usually fine, but set your own to be safe.
        "User-Agent": "CeylonChartsExampleClient/1.0",
    }


def get_symbols(query: str | None = None, sector: str | None = None) -> list:
    params = {}
    if query:
        params["q"] = query
    if sector:
        params["sector"] = sector
    resp = requests.get(f"{BASE_URL}/v1/symbols", headers=_headers(), params=params)
    resp.raise_for_status()
    return resp.json()


def get_ohlc(symbol: str, from_date: str | None = None, to_date: str | None = None,
             interval: str = "daily") -> dict:
    params = {"interval": interval}
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date
    resp = requests.get(f"{BASE_URL}/v1/ohlc/{symbol}", headers=_headers(), params=params)
    resp.raise_for_status()
    return resp.json()


def get_financials(symbol: str, from_date: str | None = None, to_date: str | None = None) -> dict:
    params = {}
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date
    resp = requests.get(f"{BASE_URL}/v1/financials/{symbol}", headers=_headers(), params=params)
    resp.raise_for_status()
    return resp.json()


def get_indices(query: str | None = None) -> list:
    params = {"q": query} if query else {}
    resp = requests.get(f"{BASE_URL}/v1/indices", headers=_headers(), params=params)
    resp.raise_for_status()
    return resp.json()


def get_index_data(index: str, from_date: str | None = None, to_date: str | None = None) -> dict:
    params = {}
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date
    resp = requests.get(f"{BASE_URL}/v1/indices/{index}/data", headers=_headers(), params=params)
    resp.raise_for_status()
    return resp.json()


def get_technicals(symbol: str, limit: int = 50, offset: int = 0) -> dict:
    params = {"limit": limit, "offset": offset}
    resp = requests.get(f"{BASE_URL}/v1/technicals/{symbol}", headers=_headers(), params=params)
    resp.raise_for_status()
    return resp.json()


def screen_stocks(**filters) -> dict:
    resp = requests.get(f"{BASE_URL}/v1/screener/stocks", headers=_headers(), params=filters)
    resp.raise_for_status()
    return resp.json()


def screen_indices(**filters) -> dict:
    resp = requests.get(f"{BASE_URL}/v1/screener/indices", headers=_headers(), params=filters)
    resp.raise_for_status()
    return resp.json()


def get_market_summary(period: str = "daily", date: str | None = None, limit: int = 5) -> dict:
    params = {"period": period, "limit": limit}
    if date:
        params["date"] = date
    resp = requests.get(f"{BASE_URL}/v1/market-summary", headers=_headers(), params=params)
    resp.raise_for_status()
    return resp.json()


if __name__ == "__main__":
    print(get_symbols()[:5])
    print(get_ohlc("SAMP", from_date="2025-01-01", to_date="2025-01-31"))
    print(get_index_data("ASPI", from_date="2025-01-01", to_date="2025-01-31"))
    print(get_technicals("SAMP", limit=20))
    print(screen_stocks(above_ema50="true", above_ema200="true", rs_rating_min=80))
    print(get_market_summary(period="weekly"))
