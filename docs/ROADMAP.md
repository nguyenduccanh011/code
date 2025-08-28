# Roadmap

This document summarizes the next steps to expand the app with market, screener, and fundamentals features, building on the new backend APIs and frontend refactors.

## Phase 1 — Data + Basic UI

- Screener UI: table view with selectable columns, paging, and CSV export
- Financials tab: Income/Balance charts + last 8 periods table
- Ratios tab: key valuation/profitability ratios + mini trends
- Persist user choices (columns, page size) in localStorage

## Phase 2 — Market Overview

- Heatmap by industry/exchange (color: %change, area: market cap)
- Top lists (gainers/losers/volume) with quick filters
- Index/ETF panel

## Phase 3 — Usability & Analysis

- Watchlist with mini sparklines
- Compare multiple symbols (normalize to 100, overlay indicators)
- Alerts: simple price/MA threshold (polling)

## Technical Tasks

- Backend: finalize /api/screener cleaning (NaN→null, round numbers); enforce UTF‑8 JSON
- Backend: financials/ratios mappings for vnstock version 3.2.3; consider cashflow if available in future versions
- Frontend: adopt AppUtils.time/format everywhere; finish splitting applyDataToChart
- Frontend: modularize Sidebar/Search/Indicator UI; add TrendLineController module

## Milestones

1. Screener page MVP (table + column presets + paging)
2. Symbol detail: Financials/Ratios tabs
3. Market Overview: Heatmap + Top lists
4. Watchlist + Compare
5. Alerts (basic)

