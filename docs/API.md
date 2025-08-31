# API Tổng Quan (Backend + Proxy)

Mặc định server hợp nhất chạy trên `http://127.0.0.1:5000` (xem `backend/serve.py`).
Tất cả API trả về JSON UTF‑8. Một số route có cache (xem `backend/cache_manager.py`).

## Backend (prefix `/api/...`)

- Screener: `GET /api/screener?exchange=HOSE,HNX,UPCOM&limit=500&q=`
  - Làm sạch (NaN/Inf → null), hỗ trợ tìm kiếm `q` theo mã/tên; cache theo tham số.

- Lịch sử giá: `GET /api/history?symbol=FPT&resolution=1D&from=YYYY-MM-DD&to=YYYY-MM-DD`
  - Chuẩn hóa thời gian; cache 1 ngày theo tham số.

- Bảng giá: `GET /api/price_board?symbols=FPT,MWG` hoặc `GET /api/price_board?exchange=HOSE,HNX,UPCOM&limit=100`
  - Phẳng cột MultiIndex, chuẩn hóa tên cột và mã; cache ngắn 10s.

- Thị trường đơn lẻ: `GET /api/market_data?symbol=VNINDEX`
  - Bản ghi đơn từ `Trading.price_board`; cache 60s.

- Ngành (industry):
  - `GET /api/industry/list` → `{ industries: [...] }`
  - `GET /api/industry/stocks?industry=...` → `{ data: [{ code, companyName, floor }, ...] }`
  - `GET /api/industry/lastest?industry=...` → `{ data: { SYM: { lastPrice, priceChange, priceChangePercent, matchQtty } } }`
    - Mapping cột linh hoạt (vnstock/VCBS style), batch→per‑symbol fallback, cache 15s.
    - `debug=1` trả thêm `df_cols`, `df_len`, `sample_keys`, …

- Financials: `GET /api/financials?symbol=FPT&statement=ratio|balance_sheet|income_statement|cash_flow&period=quarter|year&source=VCI&industry=true`
  - Có `industry_averages` khi `statement=ratio&industry=true`.

- Ratios: `GET /api/ratios?symbol=FPT`

- News: `GET /api/news?symbol=FPT&limit=20` (trả 501 nếu phiên bản vnstock không có)

- Listings: `GET /api/all_companies`, `GET /api/company_info?symbol=FPT`

## Proxy (prefix `/api/proxy/...`)

- VCBS PriceBoard: `GET /api/proxy/vcbs/priceboard?criteriaId=-11|-12|-13`
- VNDirect: `/api/proxy/vnd/...` (company_profiles, ratios_latest, candles, stocks)
- CafeF realtime: `GET /api/proxy/cafef/realtime?center=1|2|9`
- Vietstock: `/api/proxy/vietstock/...`
- FireAnt quotes: `GET /api/proxy/fireant/quotes?symbols=VCB,VPB,...`
- MBS stocklist: `GET /api/proxy/mbs/stocklist`
- TVSI: `/api/proxy/tvsi/...` (overview/lastest/pricehistory/statistic)

Gợi ý: frontend mặc định dùng `API_PROXY_BASE = http://127.0.0.1:5000`. Có thể override tạm thời bằng:
`localStorage.setItem('API_PROXY_BASE','http://127.0.0.1:5000')`.

