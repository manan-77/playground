"""Free-API stock data → a dense text 'dossier' for grounding the Foundry agent.

This mirrors the yfinance approach from the design, but uses direct Yahoo Finance
HTTP calls (via `requests`) so it stays dependency-light and runs on any Python
(no pandas/numpy build). To use yfinance instead, swap `fetch_live_stock_context`
to read `yf.Ticker(ticker).info` — the returned string contract is the same.
"""
from __future__ import annotations

import requests

_UA = {"User-Agent": "Mozilla/5.0"}
_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{t}?interval=1d&range=1mo"
_QS = (
    "https://query2.finance.yahoo.com/v10/finance/quoteSummary/{t}"
    "?modules=assetProfile,financialData,summaryDetail,defaultKeyStatistics,price&crumb={c}"
)


def _money(v):
    return f"${v:,.2f}" if isinstance(v, (int, float)) else "N/A"


def _pct(v):
    return f"{v * 100:.2f}%" if isinstance(v, (int, float)) else "N/A"


def _big_money(v):
    """Market-cap style: $2.95T / $812.40B / $9.30M."""
    if not isinstance(v, (int, float)):
        return "N/A"
    if abs(v) >= 1e12:
        return f"${v / 1e12:,.2f}T"
    if abs(v) >= 1e9:
        return f"${v / 1e9:,.2f}B"
    if abs(v) >= 1e6:
        return f"${v / 1e6:,.2f}M"
    return f"${v:,.0f}"


def _ratio(v):
    return f"{v:.2f}" if isinstance(v, (int, float)) else "N/A"


def _fetch_chart(ticker: str) -> dict:
    r = requests.get(_CHART.format(t=ticker), headers=_UA, timeout=12)
    r.raise_for_status()
    return r.json()["chart"]["result"][0]["meta"]


def _fetch_quote_summary(ticker: str) -> dict:
    """Best-effort richer fundamentals (sector, business summary, margins).

    These come from crumb-gated endpoints, so failure is expected and tolerated.
    """
    try:
        s = requests.Session()
        s.headers.update(_UA)
        s.get("https://fc.yahoo.com", timeout=8)
        crumb = s.get("https://query2.finance.yahoo.com/v1/test/getcrumb", timeout=8).text
        r = s.get(_QS.format(t=ticker, c=crumb), timeout=12)
        r.raise_for_status()
        return r.json()["quoteSummary"]["result"][0]
    except Exception:
        return {}


def fetch_live_stock_context(ticker: str) -> str:
    """Return a dense, text-based financial dossier for the agent to read.

    Combines real-time market data, company profile, and key fundamentals.
    """
    ticker = ticker.upper().strip()
    try:
        meta = _fetch_chart(ticker)
        qs = _fetch_quote_summary(ticker)
        profile = qs.get("assetProfile", {})
        fin = qs.get("financialData", {})
        summary = qs.get("summaryDetail", {})
        stats = qs.get("defaultKeyStatistics", {})

        def num(d, k):
            v = d.get(k)
            return v.get("raw") if isinstance(v, dict) else v

        dossier = f"""FINANCIAL DOSSIER FOR TICKER: {ticker}
Company Name: {meta.get('longName', 'N/A')}
Sector: {profile.get('sector', 'N/A')}
Industry: {profile.get('industry', 'N/A')}
Business Summary: {profile.get('longBusinessSummary', 'N/A')}
Market Cap: {_big_money(num(summary, 'marketCap') or num(qs.get('price', {}), 'marketCap'))}
Trailing P/E: {_ratio(num(summary, 'trailingPE'))}
Forward P/E: {_ratio(num(summary, 'forwardPE'))}
EPS (trailing): {_money(num(stats, 'trailingEps'))}
Current Market Price: {_money(meta.get('regularMarketPrice'))}
Previous Close: {_money(meta.get('chartPreviousClose'))}
52 Week High: {_money(meta.get('fiftyTwoWeekHigh'))}
52 Week Low: {_money(meta.get('fiftyTwoWeekLow'))}
Day High / Low: {_money(meta.get('regularMarketDayHigh'))} / {_money(meta.get('regularMarketDayLow'))}
Regular Market Volume: {meta.get('regularMarketVolume', 'N/A')}
Analyst Target High Price: {_money(num(fin, 'targetHighPrice'))}
Analyst Target Mean Price: {_money(num(fin, 'targetMeanPrice'))}
Recommendation: {fin.get('recommendationKey', 'N/A')}
Profit Margins: {_pct(num(fin, 'profitMargins'))}
Currency: {meta.get('currency', 'USD')}
Data source: Yahoo Finance (live)"""
        return dossier
    except Exception as e:  # noqa: BLE001
        return f"Error retrieving live API information for {ticker}: {e}"


if __name__ == "__main__":
    import sys

    print(fetch_live_stock_context(sys.argv[1] if len(sys.argv) > 1 else "MSFT"))
