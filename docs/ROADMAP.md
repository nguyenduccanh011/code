# Roadmap

Tài liệu theo dõi các hạng mục đã làm và kế hoạch tiếp theo.

## Đã hoàn thành (Aug 2025)

- Hợp nhất server (backend/serve.py), mặc định chạy cổng 5000.
- Thêm thanh điều hướng dùng chung (site-nav) cho tất cả trang demo.
- Sửa lỗi mã hóa tiếng Việt (UTF‑8) trên nhiều trang.
- Bảng giá (Price Board): chuẩn hóa file, dùng nguồn VCBS qua proxy.
- Thêm nhóm API Ngành: `/api/industry/list|stocks|lastest` + auto load giá ở frontend.
- Proxy server: VCBS, VNDirect, CafeF, Vietstock, FireAnt, MBS, TVSI.
- Cải tiến cache (screener/price_board/industry), batch→per‑symbol fallback.

## Kế hoạch ngắn hạn

- Health check: `/health` cho backend và proxy.
- Lazy‑init `vnstock` (Listing/Trading) để giảm phụ thuộc mạng khi khởi động.
- Tính ±/% phía client từ `listing_ref_price` khi upstream không trả `change`.
- Cache thông minh cho `/api/industry/lastest` theo nhóm mã (ETag/keyset).
- Gói build demo (gh-pages hoặc static server) để thử nhanh.

## Trung hạn

- Market overview: heatmap theo ngành/sàn, top gainers/losers/volume.
- Watchlist + so sánh đa mã (normalize 100, overlay indicators).
- Alerts đơn giản (polling).

## Ghi chú kỹ thuật

- Chuẩn hóa tên cột từ `Trading.price_board` (MultiIndex) → tên phẳng có hậu tố.
- Khi dữ liệu có phong cách VCBS (`listing_*`, `match_*`), ưu tiên `listing_symbol`, `match_avg_match_price`, `match_accumulated_volume`.
- Frontend mặc định `API_PROXY_BASE = http://127.0.0.1:5000`; có thể override qua localStorage.
