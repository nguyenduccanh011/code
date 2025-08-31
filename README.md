# Algo Dashboard (VN)

Ứng dụng demo phân tích kỹ thuật + dữ liệu cơ bản chứng khoán Việt Nam. Gồm backend Python (Flask) và các trang HTML/JS thuần.

## Chạy nhanh

1) Cài đặt phụ thuộc Python
```
pip install -r backend/requirements.txt
```

2) Chạy server hợp nhất (backend + proxy) trên cổng 5000
```
npm run start:combined
# hoặc: python backend/serve.py
```

3) Mở trang bất kỳ (đã có thanh điều hướng site‑nav ở đầu mỗi trang):
- `index.html` (biểu đồ + chỉ báo)
- `price-board.html` (bảng giá 3 sàn, nguồn VCBS qua proxy)
- `cafef-realtime.html` (bảng realtime từ CafeF)
- `screener.html` (bộ lọc cơ bản)
- `industry-demo.html` (cổ phiếu theo ngành, tự nạp giá)
- `company-profile.html`, `company-directory.html`, `api-demo.html`, `algo-*.html`…

Ghi chú: frontend mặc định dùng `API_PROXY_BASE = http://127.0.0.1:5000`. Có thể override tạm bằng:
```
localStorage.setItem('API_PROXY_BASE','http://127.0.0.1:5000')
```

## Scripts hữu ích
```
npm test                # chạy JS tests + Python unit tests
npm run start:server    # chỉ backend (5000)
npm run start:proxy     # chỉ proxy (5050)
npm run start:combined  # server hợp nhất (5000)
```

## API chính

Tổng hợp đầy đủ ở `docs/API.md`. Một số route tiêu biểu:
- Backend: `/api/screener`, `/api/history`, `/api/price_board`, `/api/market_data`
- Nhóm ngành: `/api/industry/list|stocks|lastest` (có `debug=1`)
- Proxy: `/api/proxy/vcbs/priceboard`, `/api/proxy/vnd/...`, `/api/proxy/cafef/...`, `/api/proxy/vietstock/...`, `/api/proxy/fireant/...`

## Kiến trúc & Ghi chú kỹ thuật
- Server hợp nhất (`backend/serve.py`) định tuyến `/api/proxy/...` sang proxy và phần còn lại sang backend.
- Chuẩn hóa giá VCBS: ưu tiên các cột `listing_symbol`, `match_avg_match_price`, `match_accumulated_volume` khi mapping.
- Khi DataFrame từ `Trading.price_board` có cột MultiIndex: phẳng cột và `reset_index()`; nếu `symbol` là số và có `listing_symbol` → thay thế.
- Auto‑load giá cho Industry Demo: sau khi tải danh sách mã, trang tự gọi `/api/industry/lastest` và render.

## Roadmap
Xem `docs/ROADMAP.md` (đã ghi lại các mốc đã hoàn thành và kế hoạch tiếp theo).

## Đóng góp
- Viết rõ ràng, UTF‑8, có chú thích khi cần.
- Tên file/hàm tiếng Anh, có thể chú thích tiếng Việt.
- Chạy `npm test` trước khi commit.

## Bản quyền
Mã nguồn demo phục vụ mục đích học tập/nghiên cứu dữ liệu thị trường Việt Nam.

