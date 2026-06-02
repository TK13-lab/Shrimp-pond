# Project Status

Date: 2026-06-01

## Current State

- Documentation package extracted from `shrimp_pond_app_server_codex_md.zip`.
- Folder layout is prepared for a client-server monorepo.
- Root checklist file created at `TODO_CHECKLIST.md`.
- `apps/api` is scaffolded as a NestJS TypeScript backend.
- Backend base includes `ConfigModule`, global validation pipe, global `/api` prefix, Prisma placeholder, and `GET /api/health`.
- Backend build, typecheck, and smoke bootstrap pass in the lab workspace.

## Understood Scope

Phase 1 is an internal MVP for material purchase receipts:

- Staff log in and create draft purchase receipts.
- Staff submit receipts for manager review.
- Manager or admin approve, reject, or void receipts.
- Inventory changes only on backend approval, inside a database transaction.
- Duplicate receipt submission is prevented with `client_request_id` / idempotency.
- Important actions are recorded in audit logs.

Out of scope for Phase 1:

- IoT
- AI prediction
- QR/camera invoice scanning
- Advanced reporting
- Offline sync
- Push notifications
- Public app store publishing

## Next Recommended Task

Start with Sprint 0 from `docs/11_SPRINT_TASKS_FOR_CODEX.md`:

1. Add local PostgreSQL via `docker-compose.yml`.
2. Scaffold `apps/mobile` as a React Native Expo TypeScript app.
3. Add `.env.example` files only, with no real secrets.
4. Start Sprint 1 Prisma schema work after database setup.

## Notes

- Server remains the source of truth.
- Mobile must never connect directly to PostgreSQL.
- Mobile must never contain database credentials, JWT secrets, or private service keys.
- After every completed and verified step, commit locally and push to `git@github.com:TK13-lab/Shrimp-pond.git`.
- Never commit `.env`, secrets, raw data, heavy outputs, logs, caches, or machine-specific files.
- The sandbox blocks opening a listening port, so runtime verification in the lab uses `npm run smoke:bootstrap` in addition to build and typecheck.
