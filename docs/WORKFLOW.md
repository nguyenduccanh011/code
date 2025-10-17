# Quy trình làm việc chi tiết

Tài liệu này mô tả cách chúng ta làm việc để dự án trơn tru, đúng kế hoạch khi có AI tham gia.

## 1. Giao tiếp & xác nhận
- Tóm tắt yêu cầu 1–3 dòng, làm rõ phạm vi (in/out).
- Xác định tiêu chí chấp nhận: điều kiện để coi là “xong”.
- Nêu rủi ro/phụ thuộc và ước lượng sơ bộ.

## 2. Lập kế hoạch (update_plan)
- Viết 3–7 bước ngắn, tuần tự, rõ kiểm tra trung gian.
- Luôn có đúng 1 bước `in_progress`.
- Khi thay đổi kế hoạch, nêu lý do trong `explanation`.

## 3. Thực hiện
- Nhỏ gọn, đúng phạm vi; không thay đổi không liên quan.
- Cố gắng sửa tận gốc thay vì vá bề mặt khi hợp lý.
- Tuân thủ naming (English), style, và cấu trúc sẵn có.

## 4. Kiểm thử
- JS: `node tests/run-js-tests.mjs`
- Py: `python -m unittest discover -s backend/tests -p "test_*.py"`
- Chỉ chạy phạm vi liên quan trước, rồi mở rộng nếu cần.

## 5. Trình bày kết quả
- Tóm tắt thay đổi; liệt kê file chạm tới.
- Hướng dẫn verify nhanh; nêu điểm cần review/confirm tiếp theo.

## 6. Tài liệu hoá
- Cập nhật `README.md` nếu thay đổi run/build/deploy.
- Cập nhật `docs/ROADMAP.md` khi thay đổi phạm vi/kế hoạch.
- Ghi nhận quyết định kỹ thuật lớn (ADR) nếu cần.

## Post-change checks (backend)
- Compile check: `python -c "import py_compile; py_compile.compile('backend/server.py', doraise=True)"`
- Unit tests: `python -m unittest discover -s backend/tests -p "test_*.py"`
- For JS changes, run: `node tests/run-js-tests.mjs`
 - If you hit local issues (encoding/ports/proxy), see `docs/TROUBLESHOOTING.md`.

## CI recommendations
- Validate UTF‑8 (no BOM) and LF line endings for source files.
- Run Python unit tests; run JS tests.
- Optional: lint/format checks (flake8/black, eslint/prettier) if configured.

## 7. Nhịp độ & quản lý
- Sprint 1–2 tuần; review giữa kỳ và cuối sprint.
- Issue gắn nhãn: `feat`, `fix`, `docs`, `chore`, `investigate`.
- Mỗi issue có Acceptance Criteria, liên kết PR.

## Solo Mode (1 người)
- Cho thay đổi nhỏ: commit trực tiếp vào `main` (sau khi chạy Post-change checks).
- Cho thay đổi lớn: tạo nhánh ngắn gọn; PR là tùy chọn (dùng khi cần review/ghi nhận đầy đủ).
- Vẫn tuân thủ DoD/AC và Handoff khi đổi phiên.

## Session Start Checklist
- `git status` → xem thay đổi cục bộ
- `git branch -a` → biết các nhánh hiện có
- `git fetch --all && git pull` → đồng bộ trước khi làm
- Xác nhận nhánh/Scope phiên làm việc; đọc Handoff Summary (nếu có)

---

## Definition of Done (EN)
- All tests pass: JS (`node tests/run-js-tests.mjs`) and Py (`python -m unittest discover -s backend/tests`).
- Acceptance Criteria (AC) met and verified (provide quick verify steps).
- Docs updated if behavior or assumptions changed (README/AGENTS/WORKFLOW/ROADMAP as needed).
- No unrelated changes; code style consistent; minimal, scoped diffs.
- If adding endpoints/behavior, include brief notes on error handling and constraints.

## Acceptance Criteria (AC) Template (EN)
- Goal: …
- In-scope / Out-of-scope: …
- Expected behavior: …
- Performance/error states: …
- Verification steps: commands/paths to check …
- Rollback/risks: …

## Issues as Source of Truth (EN)
- Create a GitHub Issue for every task. Use labels: `feat`, `fix`, `docs`, `chore`, `investigate`, priority (`P1/P2`), and `needs/confirm` when awaiting approval.
- Use Milestones for planning (e.g., `MVP`, `Sprint-1`).
- Each Issue must include AC; PRs must reference and close Issues via keywords: `Fixes #<id>` / `Closes #<id>`.
- Keep discussions/decisions in the Issue; update docs when behavior changes.

How to test the flow
1) Create Issue `#N` with AC.
2) Open a PR with description including `Fixes #N`.
3) Merge PR: GitHub auto-closes Issue `#N` and links the PR for traceability.

## Pre-start Questions (EN quick list)
- Scope in/out, explicit non-goals
- Acceptance Criteria (AC)
- Constraints (performance/security/cost/deadline)
- Environment/data/dependencies
- Risks/unknowns and mitigations
- Definition of Done (DoD)
- Approver and deadline

Use the Clarification Issue template if any of the above is unknown.

## Handoff Guidance (EN)
- When pausing or switching owners, add a comment titled “Handoff Summary” to the Issue:
  - Status (done/pending), Next steps (3–5 bullets), Blockers/dependencies
  - Quick verify (paths/commands), Touched files/branch
- Update the Issue description if key Decisions change (who/what/when/why).
- If splitting work, create a “Continuation” Issue and link both ways.
- In PR, include “Handoff Summary” and “Follow-ups” (Issue links) when applicable.
