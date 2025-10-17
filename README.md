# Ứng dụng biểu đồ & phân tích chứng khoán Việt Nam

Ứng dụng web hiển thị biểu đồ thời gian thực, chỉ báo kỹ thuật, công cụ phân tích, backtest chiến lược và bộ lọc cổ phiếu cho thị trường Việt Nam.

## Tính năng chính

### Biểu đồ & dữ liệu
- Biểu đồ nến với dữ liệu cập nhật
- Hỗ trợ khung D/W/M
- Tìm kiếm mã nhanh, thông tin OHLC
- Tải dữ liệu lịch sử theo khoảng
- Đồng bộ biểu đồ giữa các chỉ báo

### Chỉ báo kỹ thuật
- RSI, MACD, Bollinger Bands, SMA (9/20)

### Chiến lược giao dịch
- SMA crossover, tín hiệu mua/bán hiển thị trực quan
- Bật/tắt chiến lược dễ dàng

### Công cụ vẽ
- Trendline kéo thả, chọn/sửa/xóa linh hoạt

### Giao diện
- Sidebar thông tin, OHLC, responsive, theme tối/sáng

## Cấu trúc dự án

```
index.html                 # Giao diện chính
algo-list.html             # Danh sách chiến lược
algo-detail.html           # Chi tiết chiến lược
screener.html              # Bộ lọc cổ phiếu
price-board.html           # Bảng giá
config.js                  # Cấu hình API (runtime)
css/                       # Style/UI
src/                       # JavaScript modules (core, indicators, pages, tools)
backend/                   # Python Flask API + backtesting
docs/                      # Tài liệu (ROADMAP, WORKFLOW)
```

Doc Map (điểm bắt đầu nhanh)
- Quy trình & quy tắc: `AGENTS.md`
- Cách làm việc chi tiết (DoD/AC/Issues): `docs/WORKFLOW.md`
- Quy ước đóng góp: `CONTRIBUTING.md`

## Cài đặt & chạy

### Yêu cầu
- Python 3.10+
- Node.js 18+ (tùy chọn cho test JS)
- Trình duyệt hiện đại

### Chạy backend (dev)
```bash
cd backend
pip install -r requirements.txt
python server.py
```
Backend chạy tại `http://127.0.0.1:5000`

### Chạy frontend (dev)
```bash
python -m http.server 8000
# hoặc mở trực tiếp index.html
```
Frontend tại `http://localhost:8000`

### Cấu hình API (config.js)
Trong môi trường dev (không proxy same-origin), đặt:
```html
<script>
  window.API_BASE_URL = 'http://127.0.0.1:5000';
  // Nếu dùng proxy same-origin: window.API_BASE_URL = '';
  // (file config.js đã được nhúng trong các trang HTML)
</script>
```

## API chính (Flask)

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/all_companies` | GET | Danh sách mã/symbol |
| `/api/company_info?symbol=FPT` | GET | Thông tin công ty |
| `/api/history?symbol=FPT&resolution=1D&from=YYYY-MM-DD&to=YYYY-MM-DD` | GET | Dữ liệu lịch sử |
| `/api/screener?exchange=HOSE,HNX,UPCOM&limit=100&q=F` | GET | Bộ lọc nhanh |
| `/api/financials?symbol=FPT&statement=ratio&period=year&industry=true` | GET | Chỉ số/FS + ngành |
| `/api/price_board?exchange=HOSE&limit=100` | GET | Bảng giá chuẩn hóa |
| `/api/backtest` | POST | Chạy backtest (JSON config) |

## Công nghệ sử dụng

### Frontend
- HTML5, CSS3 (Grid/Flexbox)
- Vanilla JavaScript
- Lightweight Charts

### Backend
- Flask, flask-cors
- vnstock, pandas, numpy

### Kiến trúc
- Modular, tách core/indicators/pages/tools
- DataProvider cấu hình runtime qua `config.js`
- Cache file-based cho dữ liệu phổ biến

## Phát triển

- Chạy test: `node tests/run-js-tests.mjs` và `python -m unittest discover -s backend/tests`
- Định dạng/chuẩn hóa UTF-8 (xem `.editorconfig`, `.gitattributes`)
