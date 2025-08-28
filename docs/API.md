# Backend API Summary

All endpoints return JSON (UTF‑8). Some endpoints use caching (see `backend/cache_manager.py`).

## Screener

- GET `/api/screener?exchange=HOSE,HNX,UPCOM&limit=500&columns=ticker,close,pe,pb,roe,market_cap`
  - Returns a cleaned list (NaN/±Inf → null, numeric rounded).
  - Optional `columns` trims payload to selected fields.

## Financials

- GET `/api/financials?symbol=FPT&type=income|balance|cashflow&period=quarter|year&limit=8`
  - Mapped for vnstock 3.2.3:
    - `income` → `Finance.income_statement()`
    - `balance` → `Finance.balance_sheet()`
    - `cashflow` → `Finance.cashflow_statement()` (if available)
  - Applies `tail(limit)` if available.

## Ratios

- GET `/api/ratios?symbol=FPT`
  - Uses `Finance.ratio()` or `Finance.ratios()` depending on vnstock version.

## History

- GET `/api/history?symbol=FPT&resolution=1D&from=YYYY-MM-DD&to=YYYY-MM-DD`
  - Returns OHLCV with `time` as ISO string; frontend converts to `{year,month,day}`.

## Market Data (Quote/Price Board)

- GET `/api/market_data?symbol=VNINDEX`
  - Uses `Trading.price_board` and flattens the dataframe.

## Company Info / Listings

- GET `/api/all_companies`
- GET `/api/company_info?symbol=FPT`

## News (when available)

- GET `/api/news?symbol=FPT&limit=20`
  - Returns 501 if the installed vnstock version doesn’t provide a `News` API.

