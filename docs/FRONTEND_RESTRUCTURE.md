# Frontend Restructure Plan (B – workspace‑ready)

Goal: Move current MPA frontend into `frontend/` with a clear, scalable structure that can later evolve to npm workspaces (C) without breaking imports.

## Target Structure
```
frontend/
  apps/
    web/                # current end‑user app (MPA pages)
      index.html
      *.html            # price-board.html, screener.html, ...
      src/              # app code
      css/              # styles
  packages/
    ui/                 # shared components (optional starter)
      src/
    utils/              # shared helpers (optional starter)
      src/
```

## Vite Configuration (phase B)
- Root: `frontend` (or `frontend/apps/web` if desired). For MPA with multiple HTML entries, keep inputs in rollup options.
- Aliases (stable for future workspaces):
  - `@app` → `frontend/apps/web/src`
  - `@ui` → `frontend/packages/ui/src`
  - `@utils` → `frontend/packages/utils/src`
- Env: `VITE_API_BASE_URL` for API base; keep dev override via `localStorage` for convenience.

## Commands (root package.json)
- `npm run frontend:dev` → Vite dev server (root `frontend`)
- `npm run frontend:build` → build to `frontend/dist`
- `npm run frontend:preview` → preview built assets

## Acceptance Criteria (AC)
- All existing pages open and function under dev and preview build.
- Site navigation works across pages after move.
- API calls use `VITE_API_BASE_URL` or `localStorage` override; no hardcoded hosts.
- Relative paths for assets/scripts/styles resolved correctly from new root.

## Quick Verify
1) Dev: `npm run frontend:dev` → open `http://localhost:5173/<page>.html`
2) Build: `npm run frontend:build`
3) Preview: `npm run frontend:preview` → open `http://localhost:4173/<page>.html`
4) Check pages: index, price-board, screener, cafef-realtime, industry-demo, company-* , algo-*

## Rollback Plan
- Work on a feature branch. If regressions appear, revert the branch or restore previous root layout.

## Future Upgrade to Workspaces (C)
- Promote `frontend/apps/web` → `packages/frontend-web`
- Keep `packages/ui` and `packages/utils` as separate packages
- Root `package.json` adds `"workspaces": ["packages/*"]`, and commands run with `-w`

## Notes
- Do not change behavior of existing pages in this move; only fix paths/aliases.
- After this phase, consider enabling cache headers (immutable assets), basic CSP, and CORS whitelist for the frontend domain.

