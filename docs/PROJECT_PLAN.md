# Kế hoạch dự án (đề xuất)

Tài liệu tóm tắt phạm vi MVP, mốc thời gian, và ưu tiên để sớm có phiên bản dùng được/đem bán.

## 1) Mục tiêu MVP
- Biểu đồ + chỉ báo chính (SMA/RSI/MACD/BB) ổn định.
- Screener có preset, lọc cơ bản, export CSV.
- Financials/Ratios hiển thị dữ liệu cốt lõi + trung bình ngành (nếu có).
- Backtest cơ bản theo điều kiện builder (mua/bán) + báo cáo số liệu (return, winrate, MDD, PF).
- Đóng gói triển khai bằng Docker Compose (web + api), proxy same-origin.

## 2) Phạm vi MVP (in/out)
- In: UI hiện có, làm mượt luồng dữ liệu, backtest cơ bản, CSV export, cache.
- Out: Auth/billing, alert realtime, batch backtest quy mô lớn, multi-tenant.

## 3) Ưu tiên kỹ thuật
- Ổn định API backend: `/api/history`, `/api/screener`, `/api/financials`, `/api/price_board`, `/api/backtest`.
- Cứng hoá DataProvider, thống nhất xử lý lỗi/khung thời gian/định dạng thời gian.
- Chuẩn hoá Strategy Engine/SDK nội bộ cho SMA crossover.

## 4) Lộ trình (dự kiến 3–4 tuần)
- Tuần 1: Ổn định backend + DataProvider, sửa lỗi encoding/docs, hoàn thiện Screener MVP.
- Tuần 2: Financials/Ratios + Industry averages, tối ưu bảng giá.
- Tuần 3: Backtest (server-side) + UI báo cáo đơn giản + export CSV.
- Tuần 4: Polish, tối ưu hiệu năng, tài liệu hoá, đóng gói phát hành.

## 5) Tiêu chí chấp nhận theo mốc
- Screener MVP: tải nhanh < 2s (100 mã), có preset cột, export CSV OK.
- Financials/Ratios: bảng + (tuỳ chọn) biểu đồ đơn giản, không lỗi null/NaN.
- Backtest: nhận JSON config từ builder, trả equity/trades/metrics, hiển thị marker khớp logic.
- Docker Compose: `docker compose up --build` chạy OK; web proxy `/api` OK.

## 6) Rủi ro/Phụ thuộc
- Phụ thuộc vnstock (thay đổi schema/giới hạn tần suất).
- Dữ liệu thiếu/khác tên cột giữa sàn; cần normalize, fallback an toàn.

## 7) Cần xác nhận từ chủ dự án
- Mục tiêu triển khai trước: SaaS hay on‑prem?
- Phân khúc người dùng và mức giá dự kiến (để định hướng tính năng bán được).
- Mốc thời gian mong muốn cho MVP và bản trả phí đầu tiên.
- Có yêu cầu pháp lý/compliance nào (log, lưu giữ dữ liệu, điều khoản)?

