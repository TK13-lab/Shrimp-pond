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
- Prisma base schema for `Farm`, `User`, `RefreshToken`, `Device`, `AuditLog`, and `Role` is implemented in `apps/api/prisma/schema.prisma`.
- Prisma migration `20260603022023_init_auth_base` has been created and applied to local PostgreSQL.
- Prisma seed script is implemented in `apps/api/prisma/seed.ts`.
- Local PostgreSQL now contains 1 demo farm and 6 demo users for development and manual testing.

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

1. Build the auth module and login endpoints.
2. Add JWT guards and role guards.
3. Connect the mobile placeholder screens to real auth endpoints.
4. Keep the seeded demo accounts for manual auth testing.

## Notes

- Server remains the source of truth.
- Mobile must never connect directly to PostgreSQL.
- Mobile must never contain database credentials, JWT secrets, or private service keys.
- After every completed and verified step, commit locally and push to `git@github.com:TK13-lab/Shrimp-pond.git`.
- Never commit `.env`, secrets, raw data, heavy outputs, logs, caches, or machine-specific files.
- The sandbox blocks opening a listening port, so runtime verification in the lab uses `npm run smoke:bootstrap` in addition to build and typecheck.
- Docker engine is reached through Docker Desktop on the Windows host by using `scripts/setup/docker-host`.
- Expo showed a non-blocking React Native DevTools shared-library warning for `libasound.so.2`, but the Metro server still started successfully.
- Prisma migration to local PostgreSQL required running outside the sandbox because sandbox networking could not reach `127.0.0.1:5432`.
- Prisma `db seed` works, but Prisma 6 prints a deprecation warning for `package.json#prisma`; this is non-blocking for now and can be moved later to `prisma.config.ts`.
