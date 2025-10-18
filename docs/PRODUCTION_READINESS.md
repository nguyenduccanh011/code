# Production Readiness Checklist

Purpose: guide the transition from demo/prototype to a multi-user, secure, fast, and scalable product. Use this as a living checklist; link related Issues/PRs.

## Phase 0 — Foundations (1–2 weeks)
- Encoding: ensure UTF-8 LF; fix mojibake in docs/src.
- Config: adopt `.env` + `.env.example`; no secrets in code.
- Health: add `/health` (api, proxy); set request timeouts/retries.
- Validation: basic input validation + unified error envelope.
- Security: CORS whitelist; rate limiting (per IP/token); proxy allowlist.
- API: namespace `/api/v1`; draft OpenAPI for core routes.

## Phase 1 — Ops & Architecture (2–4 weeks)
- Split processes: `api`, `proxy`, `worker`.
- Storage: Postgres (state), Redis (cache/queue), S3/MinIO (artifacts).
- Caching: TTL + ETag/conditional GET for hot endpoints.
- Observability: JSON logs + correlation IDs; Prometheus metrics; Sentry; `/live` `/ready`.
- CI/CD: pipeline build/test/scan/docker image/deploy; tests must pass.

## Phase 2 — Multi-user Product (4–8 weeks)
- AuthN/AuthZ: OAuth2/JWT, RBAC; quotas/limits.
- Jobs: async backtest/optimizer via queue; status/progress APIs.
- Security hardening: dependency/secret scan; pentest; SSRF-safe proxy.
- Data/legal: validate licenses/ToS for external sources.

## Area Checklists

Security
- [ ] CORS whitelist; HTTPS in prod; HSTS
- [ ] Input validation; JSON schema; size limits
- [ ] Rate limit; IP allow/deny lists where needed
- [ ] Proxy: strict domain/route allowlist; timeouts; circuit breaker
- [ ] Secrets via env/vault; rotation policy

Performance/Scale
- [ ] TTL/ETag; cache keys; cache busting rules
- [ ] Pagination/batch endpoints; N+1 avoided
- [ ] Worker queue for heavy jobs; idempotent handlers

Reliability/Observability
- [ ] `/health` `/live` `/ready`
- [ ] Structured logs; correlation IDs
- [ ] Metrics + alerts (5xx, latency, queue depth)
- [ ] Error tracking (Sentry)

Data/Storage
- [ ] Schema in migrations (Alembic); backups/restore drill
- [ ] Retention policies; PII handling

Quality/Process
- [ ] Lint/format (Black/Flake8, ESLint/Prettier); pre-commit
- [ ] Unit + integration + contract tests (recorded fixtures for externals)
- [ ] OpenAPI published; API versioning policy

Quick Wins (suggested first PRs)
- `/health` endpoint; request timeouts; error envelope
- Proxy allowlist + rate limiting baseline
- `.env.example` + config loader; UTF-8 fix script in CI
- ETag + TTL for `/api/industry/lastest` and price board

