# Algo Dashboard (VN)

Ứng dụng phân tích kỹ thuật và theo dõi thị trường chứng khoán Việt Nam. Dự án bắt đầu như một demo phục vụ học tập/nghiên cứu, hiện đang được định hướng để vận hành thực tế: code sạch, nhanh, an toàn, và dễ mở rộng.

## Onboarding / Required Reading (đọc trước khi bắt đầu)
- AGENTS: mục tiêu, quy tắc, hướng dẫn — `AGENTS.md`
- Workflow: quy trình làm việc, DoD/AC, kiểm thử — `docs/WORKFLOW.md`
- Roadmap: trạng thái và kế hoạch — `docs/ROADMAP.md`
- Project Plan (MVP): phạm vi, ưu tiên — `docs/PROJECT_PLAN.md`
- API: tổng quan backend/proxy — `docs/API.md`
- API Sources: nguồn dữ liệu bên ngoài — `docs/API_SOURCES.md`
- Troubleshooting: xử lý sự cố môi trường/dev — `docs/TROUBLESHOOTING.md`
- Contributing (EN): tóm tắt quy tắc đóng góp — `CONTRIBUTING.md`
- Docs Index — `docs/README.md`

## Yêu cầu môi trường
- Python ≥ 3.10 (3.13 OK)
- Node ≥ 18 (22 OK)

## Cài đặt nhanh
1) Python deps
```
pip install -r backend/requirements.txt
```
2) Node deps (tại repo root)
```
npm ci
# nếu lần đầu chưa có lockfile: npm install
```

## Chạy nhanh (dev)
- Backend (server hợp nhất, port 5000)
```
python backend/serve.py
```
- Frontend (Vite MPA, port 5173)
  - PowerShell có thể chặn npm.ps1 — dùng CMD shim:
```
cmd /c npm run dev
# hoặc: npm.cmd run dev
```
- Mở trang:
  - http://localhost:5173/index.html
  - Các trang khác: /price-board.html, /screener.html, /cafef-realtime.html, /industry-demo.html, /company-profile.html, /algo-list.html, /algo-detail.html, /cp68-stable.html

## Cấu trúc dự án (rút gọn)
- `backend/` — Flask API + proxy; `serve.py` gộp cả hai trên 5000
- `frontend/apps/web/` — toàn bộ HTML/CSS/JS (MPA) đã được di chuyển vào đây
- `docs/` — tài liệu dự án (workflow, roadmap, production readiness…)
- `tests/` — script test JS và Python

## Frontend (MPA) — Layout & Lệnh
- Layout: toàn bộ HTML/CSS/JS nằm trong `frontend/apps/web`
- Lệnh (tại repo root):
```
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # bundle ra frontend/dist
npm run preview   # preview bản build (http://localhost:4173)
```
- Cấu hình API base:
  - Qua env khi chạy dev build: `VITE_API_BASE_URL=http://127.0.0.1:5000`
    - PowerShell: `$env:VITE_API_BASE_URL='http://127.0.0.1:5000'; npm.cmd run dev`
    - CMD: `set VITE_API_BASE_URL=http://127.0.0.1:5000 && npm run dev`
  - Hoặc override tạm thời trên trình duyệt dev:
```
localStorage.setItem('API_BASE_URL','http://127.0.0.1:5000')
```

## Backend — Health, CORS, Rate limit
- Health endpoints
  - Core API: `GET /health` → `{ "ok": true }`
  - Proxy: `GET /api/proxy/health` (và `/health`) → `{ "ok": true }`
- CORS whitelist qua env `ALLOWED_ORIGINS` (CSV)
  - Ví dụ cho dev: `http://localhost:5173,http://127.0.0.1:5173`
- Rate limiting (in‑memory, 60s window)
  - `RATE_LIMIT_PER_MINUTE` (mặc định 60)
  - Áp dụng cho: `/api/price_board`, `/api/industry/lastest`, `/api/history`, `/api/screener` và toàn bộ `/api/proxy/*`
  - Hết hạn mức trả 429 + `Retry-After`
- Biến môi trường khác
  - `REQUEST_TIMEOUT_SECONDS` — timeout request outbound (mặc định 15)
  - `PROXY_HOST_ALLOWLIST` — (dự phòng) allowlist host cho proxy
- Mẫu `.env`: xem `.env.example`

## Scripts hữu ích
```
npm test                # chạy JS tests + Python unit tests
npm run start:server    # chạy backend đơn (5000)
npm run start:proxy     # chạy proxy đơn (5050)
npm run start:combined  # chạy hợp nhất (5000)
```

## Gợi ý quy trình làm việc
- Đồng bộ repo: `git fetch --all --prune && git pull`; kiểm tra: `git branch -vv`, `git status`
- Cài deps: `pip install -r backend/requirements.txt`, `npm ci`
- Smoke tests: `node tests/run-js-tests.mjs`, `python -m unittest discover -s backend/tests -p "test_*.py"`
- Chạy server hợp nhất: `python backend/serve.py`
- Chạy frontend dev: `cmd /c npm run dev`

## Troubleshooting nhanh (Windows)
- PowerShell chặn npm.ps1: dùng `cmd /c npm run <script>` hoặc `npm.cmd <script>`
- UTF‑8: dùng `chcp 65001` hoặc `Get-Content -Encoding UTF8`; đảm bảo `<meta charset="UTF-8">`
- Cổng bận (5000/5050): `netstat -ano | findstr :5000` + `taskkill /PID <pid> /F`
- Base URL sai: đặt lại `VITE_API_BASE_URL` hoặc `localStorage` như trên

## Tài liệu liên quan
- Kế hoạch chuyển Frontend (B – workspace‑ready): `docs/FRONTEND_RESTRUCTURE.md`
- Production Readiness checklist: `docs/PRODUCTION_READINESS.md`

## Ghi chú
- Mục tiêu tiếp theo: `/api/v1` + OpenAPI nháp, ETag/TTL cho endpoints nhiều lượt gọi, siết proxy allowlist, lint/format & hooks.

