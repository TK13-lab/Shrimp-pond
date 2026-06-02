# Project Status

Date: 2026-06-01

## Current State

- Documentation package extracted from `shrimp_pond_app_server_codex_md.zip`.
- Folder layout is prepared for a client-server monorepo.
- Root checklist file created at `TODO_CHECKLIST.md`.
- `apps/api` is scaffolded as a NestJS TypeScript backend.
- Backend base includes `ConfigModule`, global validation pipe, global `/api` prefix, Prisma placeholder, and `GET /api/health`.
- Backend build, typecheck, and smoke bootstrap pass in the lab workspace.
- Root `docker-compose.yml` is added for local PostgreSQL development.
- Local PostgreSQL is running through Docker Desktop on the Windows host and is healthy on port `5432`.
- `apps/mobile` is scaffolded as an Expo TypeScript app with React Navigation.
- Mobile placeholder screens exist for login and menu flow.
- Mobile typecheck passes, Expo config resolves, and Metro starts successfully outside the sandbox.

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

1. Start Sprint 1 Prisma schema work in `apps/api/prisma/schema.prisma`.
2. Add initial Prisma migration flow and client generation.
3. Seed the demo farm and users.
4. Connect the mobile placeholder screens to real auth endpoints after Sprint 1 backend auth is ready.

## Notes

- Server remains the source of truth.
- Mobile must never connect directly to PostgreSQL.
- Mobile must never contain database credentials, JWT secrets, or private service keys.
- After every completed and verified step, commit locally and push to `git@github.com:TK13-lab/Shrimp-pond.git`.
- Never commit `.env`, secrets, raw data, heavy outputs, logs, caches, or machine-specific files.
- The sandbox blocks opening a listening port, so runtime verification in the lab uses `npm run smoke:bootstrap` in addition to build and typecheck.
- Docker engine is reached through Docker Desktop on the Windows host by using `scripts/setup/docker-host`.
- Expo showed a non-blocking React Native DevTools shared-library warning for `libasound.so.2`, but the Metro server still started successfully.
