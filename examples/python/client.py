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
    }


def get_symbols() -> list:
    resp = requests.get(f"{BASE_URL}/v1/symbols", headers=_headers())
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


if __name__ == "__main__":
    print(get_symbols()[:5])
    print(get_ohlc("SAMP", from_date="2025-01-01", to_date="2025-01-31"))
