# AGENTS

TL;DR (EN)
- Start here: README (run), AGENTS (rules), WORKFLOW (DoD/AC/Issues).
- Create an Issue with AC, propose a short plan, wait for approval.
- Implement scoped changes, run tests (JS/Py), update docs if behavior changed.
- Open a PR linking the Issue (Fixes #id); provide quick verify steps.
- Communicate with the project owner in Vietnamese; keep technical docs concise.

Tài liệu hướng dẫn dành cho tác nhân (agent) và cộng tác viên khi làm việc trong repo.

## Mục tiêu dự án
- Xây dựng ứng dụng cá nhân hỗ trợ phân tích kỹ thuật và theo dõi thị trường.
- Cho phép xây dựng, backtest, tối ưu và khám phá các chiến lược giao dịch mới.
- Xây dựng hệ thống dữ liệu truy xuất nhanh phục vụ phân tích và huấn luyện AI giao dịch.
- Cung cấp bộ lọc, chấm điểm và hiển thị thông tin cơ bản của cổ phiếu.

## Quy tắc đóng góp
- Ưu tiên mã nguồn rõ ràng, dễ đọc; chú thích tiếng Việt khi cần thiết.
- Đặt tên tệp và hàm bằng tiếng Anh (có thể chú thích tiếng Việt song song).
- Mỗi thay đổi phải chạy test trước khi commit:
  - JS: `node tests/run-js-tests.mjs`
  - Py: `python -m unittest discover -s backend/tests -p "test_*.py"`
- Lịch sử commit rõ ràng, nêu bật tính năng/sửa lỗi; tránh gom thay đổi không liên quan.
- Giao tiếp với chủ dự án bằng tiếng Việt; tài liệu kỹ thuật ngắn gọn bằng tiếng Anh để dễ onboarding.

## Start Here (cho người mới)
1) Đọc `README.md` để chạy môi trường dev.
2) Đọc `AGENTS.md` (file này) và `docs/WORKFLOW.md` (DoD/AC/Issues).
3) Tạo Issue (template có sẵn), nêu rõ Acceptance Criteria.
4) Đề xuất plan ngắn (update_plan: 3–7 bước) và chờ duyệt.
5) Thực hiện theo scope; chạy test JS/Py; cập nhật docs nếu hành vi thay đổi.
6) Mở PR, ghi “Fixes #<issue-id>”, hướng dẫn verify ngắn.

## Cấu trúc thư mục chính
- `backend/`: Mã xử lý phía server, API Flask, backtesting, cache.
- `src/`: Mã nguồn chính (core, indicators, pages, tools, utils).
- `css/`: Stylesheet giao diện.
- HTML ở thư mục gốc dùng để minh họa và thử nghiệm tính năng.
- `docs/`: Tài liệu (ROADMAP, WORKFLOW).

## Quy trình làm việc với AI (bắt buộc)
1) Tiếp nhận & làm rõ yêu cầu: tóm tắt, phạm vi, Acceptance Criteria (AC).
2) Lập kế hoạch ngắn (update_plan): 3–7 bước, nêu điểm cần xác nhận.
3) Xin xác nhận trước khi thực hiện.
4) Thực hiện có kiểm soát: patch tối thiểu, đúng style, đúng scope.
5) Kiểm thử & tự đánh giá: chạy test JS/Py; cập nhật docs nếu behavior đổi.
6) Báo cáo kết quả: tóm tắt thay đổi, file chạm tới, cách verify nhanh.
7) Tài liệu hoá & bàn giao: cập nhật README/WORKFLOW/ROADMAP khi quy trình/plan thay đổi.

## Solo Mode (dành cho dự án 1 người)
- Mặc định commit trực tiếp lên `main` cho thay đổi nhỏ/độc lập (đã xác nhận nhanh).
- Tạo nhánh ngắn gọn chỉ khi thay đổi lớn/liên quan nhiều file. Ví dụ: `chore/backend-logs-en`.
- PR là tùy chọn; có thể bỏ qua để tiết kiệm thời gian. Templates vẫn giữ để dùng khi cần.
- Vẫn áp dụng: plan ngắn (3–7 bước) cho việc không-trivial và xin xác nhận trước khi làm.

## Session Start Checklist (bắt buộc khi mở phiên mới)
- Kiểm tra nhánh và đồng bộ:
  - `git status`
  - `git branch -a`
  - `git fetch --all` và `git pull` (nếu dùng git)
- Xác nhận nhánh đang làm việc và phạm vi thay đổi của phiên.
- Đọc Issue hiện có (nếu dùng) và Handoff Summary (nếu có).

## Câu hỏi bắt buộc trước khi bắt đầu
- Mục tiêu và phạm vi (in/out) là gì? Có non-goals không?
- Acceptance Criteria (AC) cụ thể?
- Ràng buộc (hiệu năng, bảo mật, chi phí, deadline)?
- Môi trường/dữ liệu/phụ thuộc nào cần? Có giới hạn từ nguồn dữ liệu?
- Rủi ro/unknowns? Kế hoạch giảm thiểu?
- Definition of Done (DoD) áp dụng?
- Ai duyệt? Hạn duyệt?

## Danh mục thay đổi phải xin phép trước (approval-required)
- Thay đổi tài liệu quy trình/định hướng (AGENTS/WORKFLOW/ROADMAP)
- Thay đổi kiến trúc/infra, xóa/di chuyển file, thay đổi API public
- Bất kỳ thay đổi liên quan bảo mật/dữ liệu/chi phí vận hành

## Nhãn khuyến nghị khi quản lý công việc
- `needs/confirm`, `approval-required`, `decision-needed`, `blocked`
- Ưu tiên: `P1`, `P2`, `P3`; Loại: `feat`, `fix`, `docs`, `chore`, `investigate`
- Mỗi Issue cần AC; PR phải liên kết Issue bằng “Fixes #<id>”

## Ghi log quyết định (Decision log)
- Ghi ngắn trong Issue/PR: Ai, Quyết định gì, Khi nào, Lý do.

## Handoff (bàn giao/đổi phiên)
- Khi tạm dừng hoặc chuyển người thực hiện:
  - Thêm comment “Handoff Summary” trong Issue (trạng thái, việc còn lại, bước tiếp theo, blockers, verify nhanh, file/nhánh chạm).
  - Cập nhật mô tả Issue phần tóm tắt/Decisions nếu có thay đổi quan trọng.
  - Nếu tách việc: mở Issue “Continuation” và liên kết Issue gốc.
- PR phải có mục “Handoff Summary” và “Follow-ups” (Issue links) nếu còn việc tồn đọng.

## Mã hóa & ghi chú trong code
- Encoding: UTF‑8 (không BOM), EOL = LF. `.editorconfig` và `.gitattributes` đã cấu hình.
- Lưu ý khi tạo file trên Windows/CLI: đảm bảo editor lưu UTF‑8 (no BOM).
- TODO/FIXME/NOTE: ngắn gọn, gắn Issue-ID nếu có. Ví dụ: `// TODO(#123): handle NaN in ratios`.

## Nguyên tắc an toàn khi chỉnh sửa mã
- Không chỉnh sửa file mã nguồn bằng lệnh shell/PowerShell find-replace. Chỉ dùng IDE hoặc apply_patch trong CLI.
- Logic so khớp (keys/enum) dùng tiếng Anh; UI hiển thị có thể tiếng Việt. Tránh phụ thuộc chuỗi UI cho logic.
- Sau mỗi thay đổi backend Python, chạy kiểm tra nhanh (xem WORKFLOW Post-change checks).

## Tiêu chí chấp nhận (template)
- Mục tiêu: …
- Phạm vi: … (in/out)
- Kết quả mong đợi: …
- Demo/verify: lệnh hoặc đường dẫn cụ thể.
- Rủi ro & Rollback: …

## Nhánh, commit, PR
- Nhánh: `feature/<ten-ngan>`, `fix/<ten-ngan>`, `docs/<ten-ngan>`
- Commit: câu lệnh ngắn gọn, ở thì hiện tại. Ví dụ: `feat: add runtime API config`.
- PR/merge: test xanh, mô tả thay đổi, cập nhật docs nếu cần.

## Tham chiếu
- Quy trình chi tiết: `docs/WORKFLOW.md`
- Lộ trình: `docs/ROADMAP.md`
