# External Data Sources (Excel-derived)

This document consolidates external endpoints and payload formats that were originally reverse-engineered from the xSTOCK Excel workbooks. The raw VBA sources have been removed from the repo to keep it lean; this page preserves the actionable details needed for development.

## Core Endpoints

- VCBS PriceBoard
  - Method: POST
  - URL: `http://priceboard.vcbs.com.vn/PriceBoard/Acc/amw`
  - Headers: `Content-Type: application/json`, `Cache-Control: no-cache`, `Pragma: no-cache`
  - Payload example:
    {
      "selectedStocks": "",
      "criteriaId": "-11", // HOSE (-11), HNX (-12), UPCOM (-13)
      "marketId": 0,
      "lastSeq": 0,
      "isReqTL": false,
      "isReqMK": false,
      "tlSymbol": "",
      "pthMktId": ""
    }
  - CriteriaId: `-11` (HOSE), `-12` (HNX), `-13` (UPCOM)
  - Các trường thường gặp trong payload trả về (đã chuẩn hóa trong backend):
    - `listing_symbol`, `listing_exchange`, `listing_ref_price`, `listing_ceiling`, `listing_floor`
    - `match_match_price`, `match_avg_match_price`, `match_open_price`, `match_accumulated_volume`
    - `bid_ask_*` (bảng giá mua/bán 10 mức)

- VNDirect Stocks
  - Method: GET
  - URL: `https://api-finfo.vndirect.com.vn/v4/stocks`
  - Query example: `q=type:IFC,ETF,STOCK~status:LISTED&fields=code,companyName,companyNameEng,shortName,floor,industryName,taxCode,listedDate,companyId,type,status&size=3000`

## Proxy Routes (ứng với các nguồn trên)

- VCBS qua proxy: `GET /api/proxy/vcbs/priceboard?criteriaId=-11|-12|-13`
- VNDirect: `/api/proxy/vnd/...` (company_profiles, ratios_latest, candles, stocks)
- CafeF: `GET /api/proxy/cafef/realtime?center=1|2|9`
- Vietstock: `/api/proxy/vietstock/...`
- FireAnt: `GET /api/proxy/fireant/quotes?symbols=VCB,VPB,...`
- MBS: `/api/proxy/mbs/stocklist`
- TVSI: `/api/proxy/tvsi/...`

- FPTS Company Names
  - Method: GET
  - URL: `https://liveprice.fpts.com.vn/data.ashx?s=company_name`
  - Returns: text (JSON-like); may require custom parsing.

## Additional Sources

- VCBS CCQM page: `http://priceboard.vcbs.com.vn/ccqm/` (GET)
- Vietstock stock list: `https://finance.vietstock.vn/data/stocklist?catID={1|2|3|...}` (GET)
- SSI iBoard GraphQL: `https://iboard.ssi.com.vn/gateway/graphql` (POST, JSON)
- FireAnt market quotes: `https://www.fireant.vn/api/Data/Markets/Quotes?symbols=AAA,BBB,...` (GET)
- TVSI PRS: `http://prs.tvsi.com.vn/get-detail-stock-by` (GET)
- MBS market API: `https://mktapi1.mbs.com.vn/pbResfulMarkets/category/securities/list` (GET)
- VCBS Company Profile: `https://vcbs.com.vn/vn/Research/Company?stocksymbol={SIC}` (POST)

## Local Proxy (avoid CORS in browser)

Run a lightweight proxy during development:

  python backend/proxy_server.py

Open `api-demo.html` to exercise endpoints via the proxy.

---

Notes
- All Excel workbooks and extracted VBA modules have been removed from the repo to keep it lean.
- Re-extract only when needed and avoid committing large binaries.
