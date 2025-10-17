# Troubleshooting

Concise tips to resolve common local issues. Keep docs UTF-8 (no BOM) and LF line endings.

- UTF-8 on Windows
  - PowerShell: `chcp 65001` before reading, or use `Get-Content -Encoding UTF8`.
  - HTML: ensure `<meta charset="UTF-8">` and files saved as UTF-8 LF in your editor.
  - Detect mojibake: search for `Ã`/`Â` patterns in `.html` and restore from upstream if needed.

- Ports already in use (5000/5050)
  - Find process (Windows): `netstat -ano | findstr :5000` → `taskkill /PID <pid> /F`.
  - Or change port in `backend/serve.py` / proxy config.

- Backend/proxy base URL
  - Default is `http://127.0.0.1:5000`.
  - Override temporarily in browser console:
    - `localStorage.setItem('API_PROXY_BASE','http://127.0.0.1:5000')`
  - Clear or update the value if requests hit a wrong host.

- Required versions
  - Python ≥ 3.10 (3.13 OK). Install deps: `pip install -r backend/requirements.txt`.
  - Node ≥ 18 (22 OK). If ESM issues: `npm ci` then `npm test`.

- Running tests
  - JS: `node tests/run-js-tests.mjs`
  - Py: `python -m unittest discover -s backend/tests -p "test_*.py"`

- Git on PowerShell
  - Quote commit messages: `git commit -m 'feat: add X'` (use single quotes).
  - CRLF warnings are OK; repo normalizes to LF via `.gitattributes`.

- API errors/CORS (4xx/5xx)
  - Ensure `backend/serve.py` is running (combined server).
  - Check browser console network tab and server logs for failing routes.

