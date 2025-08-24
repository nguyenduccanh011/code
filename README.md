# 📈 Ứng Dụng Biểu Đồ Chứng Khoán Việt Nam

Ứng dụng web hiển thị biểu đồ chứng khoán thời gian thực với các chỉ báo kỹ thuật và công cụ phân tích cho thị trường chứng khoán Việt Nam.

## 🎯 Tính Năng Chính

### 📊 Biểu Đồ & Dữ Liệu
- **Biểu đồ nến (Candlestick)** với dữ liệu thời gian thực
- **Hỗ trợ nhiều khung thời gian**: Ngày (D), Tuần (W), Tháng (M)
- **Tìm kiếm mã chứng khoán** với gợi ý thông minh
- **Tải dữ liệu lịch sử** tự động khi cuộn về quá khứ
- **Đồng bộ biểu đồ** giữa các chỉ báo

### 📈 Chỉ Báo Kỹ Thuật
- **RSI (Relative Strength Index)** - Chỉ báo sức mạnh tương đối
- **MACD (Moving Average Convergence Divergence)** - Chỉ báo xu hướng
- **Bollinger Bands** - Dải Bollinger với độ lệch chuẩn
- **SMA (Simple Moving Average)** - Đường trung bình động đơn giản
  - SMA 9 (màu xanh)
  - SMA 20 (màu cam)

### 🎯 Chiến Lược Giao Dịch
- **SMA Crossover Strategy** - Chiến lược giao cắt đường trung bình
- **Tín hiệu mua/bán** tự động với marker trực quan
- **Bật/tắt chiến lược** dễ dàng

### 🖱️ Công Cụ Vẽ
- **Trend Line** - Vẽ đường xu hướng
- **Chỉnh sửa đường** bằng cách kéo thả
- **Xóa đường** bằng phím Delete/Backspace
- **Chọn đường** để chỉnh sửa

### 📱 Giao Diện
- **Sidebar thông tin** hiển thị giá, thay đổi, khối lượng
- **OHLC info** hiển thị giá mở, cao, thấp, đóng
- **Responsive design** với grid layout
- **Màu sắc trực quan** cho giá tăng/giảm

## 🏗️ Cấu Trúc Dự Án

```
code/
├── index.html              # Giao diện chính
├── script.js               # Logic chính của ứng dụng
├── style.css               # Styling và layout
├── DataProvider.js         # Quản lý dữ liệu và API calls
├── ChartSyncManager.js     # Đồng bộ biểu đồ
├── StrategyManager.js      # Quản lý chiến lược giao dịch
├── RSIIndicator.js         # Chỉ báo RSI
├── MACDIndicator.js        # Chỉ báo MACD
├── BollingerBandsIndicator.js # Chỉ báo Bollinger Bands
├── TrendLinePrimitive.js   # Công cụ vẽ đường xu hướng
└── backend/
    └── server.py           # Backend API server
```

## 🚀 Cài Đặt & Chạy

### Yêu Cầu Hệ Thống
- Python 3.7+
- Node.js (để chạy web server)
- Trình duyệt web hiện đại

### Bước 1: Cài Đặt Backend
```bash
cd backend
pip install flask flask-cors vnstock pandas
python server.py
```

Backend sẽ chạy tại `http://127.0.0.1:5000`

### Bước 2: Chạy Frontend
```bash
# Sử dụng Python built-in server
python -m http.server 8000

# Hoặc sử dụng Node.js
npx http-server -p 8000

# Hoặc mở trực tiếp file index.html trong trình duyệt
```

Frontend sẽ chạy tại `http://localhost:8000`

## 🔌 API Endpoints

### Backend Server (Flask)

| Endpoint | Method | Mô Tả |
|----------|--------|-------|
| `/api/all_companies` | GET | Lấy danh sách tất cả công ty |
| `/api/company_info?symbol={symbol}` | GET | Lấy thông tin công ty theo mã |
| `/api/history?symbol={symbol}&resolution={1D/1W/1M}&from={date}&to={date}` | GET | Lấy dữ liệu lịch sử |
| `/api/market_data?symbol={symbol}` | GET | Lấy dữ liệu thị trường thời gian thực |

### Tham Số API
- `symbol`: Mã chứng khoán (VD: VNINDEX, FPT, VNM)
- `resolution`: Khung thời gian (1D, 1W, 1M)
- `from`: Ngày bắt đầu (YYYY-MM-DD)
- `to`: Ngày kết thúc (YYYY-MM-DD)

## 🛠️ Công Nghệ Sử Dụng

### Frontend
- **HTML5** - Cấu trúc giao diện
- **CSS3** - Styling và layout với Grid/Flexbox
- **Vanilla JavaScript** - Logic ứng dụng
- **Lightweight Charts** - Thư viện biểu đồ chuyên nghiệp

### Backend
- **Flask** - Web framework Python
- **vnstock** - Thư viện lấy dữ liệu chứng khoán VN
- **pandas** - Xử lý dữ liệu
- **CORS** - Hỗ trợ cross-origin requests

### Kiến Trúc
- **Modular Design** - Tách biệt các chức năng thành module
- **Event-Driven** - Xử lý sự kiện người dùng
- **Real-time Updates** - Cập nhật dữ liệu theo thời gian thực

## 📋 Chức Năng Chi Tiết

### 1. Quản Lý Dữ Liệu (DataProvider.js)
- Lấy dữ liệu lịch sử từ API
- Tìm kiếm thông tin công ty
- Quản lý danh sách tất cả mã chứng khoán

### 2. Đồng Bộ Biểu Đồ (ChartSyncManager.js)
- Đồng bộ crosshair giữa các biểu đồ
- Đồng bộ khung thời gian hiển thị
- Tránh vòng lặp vô hạn khi đồng bộ

### 3. Quản Lý Chiến Lược (StrategyManager.js)
- Tính toán SMA với các chu kỳ khác nhau
- Phát hiện tín hiệu giao cắt
- Hiển thị marker mua/bán trên biểu đồ

### 4. Chỉ Báo Kỹ Thuật
- **RSI**: Tính toán sức mạnh tương đối với chu kỳ 14
- **MACD**: Đường MACD, Signal và Histogram
- **Bollinger Bands**: Dải trên, giữa, dưới với độ lệch chuẩn

### 5. Công Cụ Vẽ (TrendLinePrimitive.js)
- Vẽ đường xu hướng tùy chỉnh
- Hỗ trợ kéo thả để chỉnh sửa
- Hit testing cho tương tác chuột

## 🎨 Giao Diện Người Dùng

### Layout Grid
- **Header**: Thông tin mã, tìm kiếm, công cụ
- **Left Toolbar**: Nút vẽ đường xu hướng
- **Main Chart**: Biểu đồ chính và chỉ báo
- **Right Sidebar**: Thông tin thị trường chi tiết

### Responsive Design
- Grid layout linh hoạt
- Sidebar có thể ẩn/hiện
- Tối ưu cho màn hình lớn

## 🔧 Tùy Chỉnh & Mở Rộng

### Thêm Chỉ Báo Mới
1. Tạo class mới kế thừa từ base indicator
2. Implement các method: `calculate()`, `addToChart()`, `remove()`
3. Thêm vào `indicatorFactory` trong `script.js`

### Thêm Chiến Lược Mới
1. Tạo method mới trong `StrategyManager`
2. Implement logic tính toán tín hiệu
3. Thêm button kích hoạt trong UI

### Tùy Chỉnh Giao Diện
- Chỉnh sửa `style.css` cho theme mới
- Thay đổi layout trong `index.html`
- Tùy chỉnh màu sắc và font chữ

## 🐛 Xử Lý Lỗi & Debug

### Console Logging
- Tất cả API calls đều có logging
- Chiến lược có logging chi tiết
- Error handling cho các trường hợp lỗi

### Common Issues
- **CORS Error**: Đảm bảo backend đang chạy
- **Data Loading**: Kiểm tra kết nối internet
- **Chart Rendering**: Refresh trang nếu biểu đồ không hiển thị

## 📈 Roadmap

### Phiên Bản Hiện Tại (v1.0)
- ✅ Biểu đồ nến cơ bản
- ✅ Các chỉ báo kỹ thuật chính
- ✅ Chiến lược SMA Crossover
- ✅ Công cụ vẽ đường xu hướng

### Phiên Bản Tương Lai
- 🔄 Thêm nhiều chỉ báo kỹ thuật
- 🔄 Hỗ trợ đa khung thời gian
- 🔄 Lưu trữ cài đặt người dùng
- 🔄 Export dữ liệu và báo cáo
- 🔄 Mobile responsive hoàn chỉnh

## 🤝 Đóng Góp

Dự án này được phát triển để học tập và nghiên cứu. Mọi đóng góp đều được chào đón!

### Cách Đóng Góp
1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 Giấy Phép

Dự án này được phát hành dưới giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

## 📞 Liên Hệ

Nếu bạn có câu hỏi hoặc góp ý, vui lòng tạo issue trên repository hoặc liên hệ trực tiếp.

---

**Lưu ý**: Dự án này chỉ dành cho mục đích giáo dục và nghiên cứu. Không nên sử dụng để đưa ra quyết định đầu tư thực tế.
