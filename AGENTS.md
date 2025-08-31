# AGENTS

Tài liệu này đưa ra hướng dẫn cho các tác nhân làm việc trong kho mã.

## Mục tiêu dự án
- Xây dựng ứng dụng cá nhân hỗ trợ phân tích kỹ thuật và theo dõi thị trường.
- Cho phép xây dựng, backtest, tối ưu và khám phá các chiến lược giao dịch mới.
- Xây dựng hệ thống dữ liệu truy xuất nhanh phục vụ phân tích và huấn luyện AI giao dịch.
- Cung cấp bộ lọc, chấm điểm và hiển thị thông tin cơ bản của cổ phiếu.

## Quy tắc đóng góp
- Ưu tiên mã nguồn rõ ràng, dễ đọc và có chú thích khi cần thiết.
- Đặt tên tệp và hàm bằng tiếng Anh, có thể chú thích tiếng Việt song song.
- Mỗi thay đổi phải được kiểm tra bằng lệnh `npm test` trước khi commit (JS + Python tests).
- Giữ lịch sử commit rõ ràng, nêu bật tính năng hoặc sửa lỗi đã thực hiện.

## Cách chạy nhanh (dev)
- Cài đặt Python deps: `pip install -r backend/requirements.txt`
- Chạy server hợp nhất: `npm run start:combined` (hoặc `python backend/serve.py`)
- Frontend mặc định dùng `API_PROXY_BASE = http://127.0.0.1:5000`; có thể override bằng localStorage khi cần.

## Ghi chú mới
- Đã thêm thanh điều hướng dùng chung (site‑nav) cho tất cả trang.
- Bảng giá dùng nguồn VCBS qua proxy (`/api/proxy/vcbs/priceboard`).
- Bổ sung nhóm API ngành: `/api/industry/list|stocks|lastest`.

## Cấu trúc thư mục chính
- `backend/`: Các đoạn mã xử lý phía server hoặc script hỗ trợ.
- `src/`: Mã nguồn chính, bao gồm core, indicators, pages và tools.
- `css/`: Tệp giao diện và bố cục.
- Các file HTML ở thư mục gốc dùng để minh họa và thử nghiệm tính năng.

## Liên hệ
Mọi thắc mắc hoặc đề xuất có thể ghi trực tiếp vào issue trong repository.
