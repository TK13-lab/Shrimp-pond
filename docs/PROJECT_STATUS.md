# Project Status

Date: 2026-06-19

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
- Backend auth module is implemented with `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, and `GET /api/auth/me`.
- Auth flow is manually verified against local PostgreSQL with seeded accounts, including invalid-login rejection, refresh-token rotation, and logout revocation.
- Backend guard layer is implemented with `JwtAuthGuard`, `RolesGuard`, `@Roles`, and `@CurrentUser`.
- Role enforcement is manually verified with a protected manager-only route: no token returns `401`, `STAFF` returns `403`, and `MANAGER` returns `200`.
- Mobile auth flow is implemented with `AuthProvider`, secure session storage via `expo-secure-store`, a real login screen, logout handling, and a role-aware menu screen.
- Mobile app now restores a saved session on launch, keeps tokens out of plain storage, and reads the backend base URL from `EXPO_PUBLIC_API_BASE_URL`.
- Prisma `Material` model is implemented with `farmId`, `name`, `defaultUnit`, `note`, `isActive`, and timestamps.
- Prisma migration `20260603080724_add_material_model` has been created and applied to local PostgreSQL, and the `Material` table is present with the expected unique constraint on `(farmId, name, defaultUnit)`.
- Backend materials module is implemented with `GET /api/materials`, `POST /api/materials`, `PATCH /api/materials/:id`, and `PATCH /api/materials/:id/disable`.
- Materials API is protected by JWT and role guards, enforces staff read-only access, checks duplicates, filters active materials for staff, and writes audit logs for create/update/disable actions.
- Mobile materials flow is implemented with `MaterialListScreen`, `MaterialFormScreen`, and `materialApi.ts`.
- Admin users can add, edit, and disable materials from the mobile app, while manager and staff stay read-only and can only browse the catalog.
- Prisma receipt base schema is implemented with `ReceiptStatus`, `PurchaseReceipt`, `PurchaseReceiptItem`, and `IdempotencyKey`.
- Prisma migration `20260603090306_add_purchase_receipts_base` has been created and applied to local PostgreSQL, including receipt status enum, receipt/item tables, idempotency table, and unique constraints for receipt code and client request id.
- Backend purchase receipt creation is implemented with `POST /api/purchase-receipts`.
- Receipt create API requires auth, accepts `clientRequestId` from body or `X-Idempotency-Key`, generates `receiptCode`, calculates line totals and total amount, starts receipts in `DRAFT`, stores idempotency keys, and writes `CREATE_RECEIPT` audit logs without touching inventory.
- Backend receipt submission is implemented with `PATCH /api/purchase-receipts/:id/submit`.
- Receipt submit API only allows `DRAFT -> SUBMITTED`, records `submittedById` and `submittedAt`, blocks duplicate resubmission with `409`, enforces ownership and role rules, and writes `SUBMIT_RECEIPT` audit logs without touching inventory.
- Manual verification against local PostgreSQL confirmed three key paths: staff can submit their own draft, another staff member is blocked with `403`, and a manager in the same farm can submit a draft when needed.
- Backend receipt browsing is implemented with `GET /api/purchase-receipts` and `GET /api/purchase-receipts/:id`.
- Receipt list API supports `status`, `from`, and `to` filters, returns creator/submission actor summaries, and enforces visibility as `STAFF = own receipts`, `MANAGER = farm receipts`, and `ADMIN = all receipts`.
- Receipt detail API returns header, actors, items, totals, and note fields needed for the upcoming mobile receipt screens, and denies cross-user access for staff with `403`.
- Mobile receipt form is implemented in `PurchaseReceiptFormScreen`.
- The form supports manual item rows, quick-add rows from active materials, local total calculation, draft save, and submit actions wired to the backend create and submit APIs.
- Mobile submit disables action buttons while requests are pending, generates `client_request_id` locally, and warns when the user changes a saved draft because backend draft editing has not landed yet.
- Mobile receipt browsing is implemented with `PurchaseReceiptListScreen` and `PurchaseReceiptDetailScreen`.
- Staff can open `Phiếu của tôi`, manager can open `Phiếu chờ duyệt` and `Lịch sử phiếu nhập`, and admin can open the full receipt list from the menu.
- Receipt detail now shows actor info, status labels, timestamps, item rows, total amount, and manager-only review metadata including approval, rejection, and void timestamps/reasons.
- Prisma inventory schema is implemented with `InventoryTransactionType`, `ReferenceType`, `InventoryBalance`, and `InventoryTransaction`.
- Prisma migration `20260603100000_add_inventory_schema` has been created and applied to local PostgreSQL, including inventory balance uniqueness on `(farmId, materialId, unit)` and inventory transaction uniqueness on `(referenceType, referenceId, materialId)`.
- Prisma `ReferenceType` now includes `PURCHASE_RECEIPT_VOID`, and migration `20260603144000_add_purchase_receipt_void_reference` has been applied to local PostgreSQL so reverse inventory transactions can reference a voided receipt without colliding with the original stock-in records.
- Backend receipt approval is implemented with `PATCH /api/purchase-receipts/:id/approve`.
- Receipt approve API only allows `MANAGER` and `ADMIN`, requires `SUBMITTED` status, updates receipt status to `APPROVED`, creates `STOCK_IN` inventory transactions, syncs inventory balances from the transaction ledger, and writes `APPROVE_RECEIPT` audit logs inside one database transaction.
- Manual verification against local PostgreSQL confirmed staff direct approval is blocked with `403`, manager approval updates inventory once, repeated approval returns `409`, and the audit log is written.
- Backend receipt rejection is implemented with `PATCH /api/purchase-receipts/:id/reject`.
- Receipt reject API only allows `MANAGER` and `ADMIN`, requires `SUBMITTED` status, stores `rejectReason` and `rejectedAt`, writes `REJECT_RECEIPT` audit logs inside a database transaction, and does not create any inventory mutation.
- Manual verification against local PostgreSQL confirmed staff direct rejection is blocked with `403`, manager rejection stores the reason, repeated rejection returns `409`, and inventory remains unchanged.
- Backend receipt void is implemented with `PATCH /api/purchase-receipts/:id/void`.
- Receipt void API only allows `MANAGER` and `ADMIN`, requires `APPROVED` status, stores `voidReason` and `voidedAt`, creates `STOCK_IN_VOID` reverse inventory transactions with `ReferenceType.PURCHASE_RECEIPT_VOID`, syncs inventory balances from the transaction ledger, and writes `VOID_RECEIPT` audit logs inside one database transaction.
- Manual verification against local PostgreSQL confirmed staff direct void is blocked with `403`, manager void creates one reverse transaction, repeated void returns `409`, and the affected inventory balance returns to zero.
- Backend inventory module is implemented with `GET /api/inventory` and `GET /api/inventory/transactions`.
- Inventory balance API allows `MANAGER` and `ADMIN`, supports `materialId` and `search`, returns current positive balances with `totalValue`, and respects farm scoping for manager users.
- Inventory transaction API allows `MANAGER` and `ADMIN`, supports filtering by `materialId`, `transactionType`, `referenceType`, `referenceId`, and date range, and returns actor/material context needed for upcoming mobile screens.
- Manual verification against local PostgreSQL confirmed manager users can read both endpoints, approved inventory appears with the expected quantity/value, and staff access is blocked with `403`.
- Mobile manager approval flow is implemented with a dedicated `ApprovalListScreen` plus approve, reject, and void actions wired to the receipt detail screen.
- Manager and admin users can now open the submitted-receipt queue from the menu, approve immediately with confirmation, or enter a reason to reject or void a receipt without leaving the mobile flow.
- Mobile verification confirms `npm run typecheck` passes and Expo Metro still starts successfully on `http://localhost:19001` after the new approval screens, with the existing non-blocking React Native DevTools `libasound.so.2` warning.
- Mobile inventory browsing is implemented with a read-only `InventoryScreen` wired from the menu for manager and admin users.
- The inventory screen supports server-side search by material name, pull-to-refresh, total inventory value summary, and shows current quantity, unit, average price, and total stock value per material.
- Mobile verification confirms `npm run typecheck` passes and Expo Metro still starts successfully on `http://localhost:19001` after the inventory screen changes, with the existing non-blocking React Native DevTools `libasound.so.2` warning.
- Backend error handling is now standardized with a global API exception filter and a Vietnamese validation exception factory.
- Validation failures now return stable JSON payloads with `statusCode`, `message`, `error.code`, `path`, and `timestamp`, and common framework-generated messages such as missing fields or unexpected extra fields are translated to Vietnamese.
- Manual verification against the local API confirmed `POST /api/auth/login` with an empty body returns Vietnamese required-field messages, and the same endpoint rejects unexpected extra fields with a Vietnamese whitelist-validation message.
- Repository verification for this hardening step confirms API `typecheck`, `build`, and `smoke:bootstrap` pass, the backend starts cleanly on localhost, and mobile `typecheck` still passes unchanged.
- Mobile network handling is now standardized with a shared request-error mapper, a reusable `RequestNotice` retry component, and client-side request timeouts in `httpClient.ts`.
- Login, materials, receipts, and inventory screens now show clearer Vietnamese messages for network loss, slow server responses, expired sessions, and backend failures, instead of each screen guessing its own fallback text.
- Read-heavy screens now expose an explicit `Thử lại` path when loading fails, while keeping stale list/detail data visible when a refresh request fails after an earlier successful load.
- Mobile verification for this hardening step confirms `npm run typecheck` passes after the retry/error-state refactor and Expo Metro still starts successfully on `http://localhost:19001`, with the existing non-blocking React Native DevTools `libasound.so.2` warning.
- Sprint 5 security review is completed for the current Phase 1 scope.
- No real runtime secrets are committed in the repository; only `.env.example` templates and documentation examples remain, and the NestJS JWT module now requires `JWT_SECRET` from the runtime environment instead of falling back to a hard-coded default.
- Mobile build configuration currently requests no extra Android or iOS business permissions beyond the required `expo-secure-store` plugin, which matches the current offline-free internal workflow.
- Backend controller review confirms role guards remain in place on materials, receipts, inventory, and `/auth/me`, while the temporary `GET /api/auth/manager-check` verification route has been removed from the app surface.
- Backend mutation review confirms important business writes still run inside Prisma transactions and continue writing audit logs for login, materials, receipt creation/submission, approval, rejection, and void flows.
- Android internal build preparation is implemented for the Expo app with package id `com.tk13lab.shrimppond`, version code `1`, and an EAS `preview` profile that produces an installable APK for internal distribution.
- Mobile build documentation now covers `EXPO_PUBLIC_API_BASE_URL` for simulator, LAN, and deployed backends, and internal builds now show a clear Vietnamese configuration error when that variable is missing instead of silently falling back to `127.0.0.1`.
- Mobile verification for this build-prep step confirms `npm run typecheck` still passes and Expo config resolves successfully after the Android packaging changes.
- A dedicated demo runbook now exists at `docs/21_DEMO_SCRIPT.md`, covering the staff-to-manager approval story, expected inventory delta, cleanup via void, and current audit-log verification through backend data.
- The current mobile snapshot still does not include a real audit-log read screen, so the demo script verifies audit logs through Prisma Studio or SQL instead of claiming an in-app screen that is not implemented yet.
- The Prisma seed script now matches the demo docs more closely by creating the standard demo materials in addition to the demo users, which makes first-run UI testing much smoother.
- The mobile app now supports desktop browser preview through Expo web, and auth session storage falls back to browser local storage on web so login and navigation can be tested without a native simulator.
- The NestJS API now enables CORS so the browser preview can call the same local REST endpoints as the mobile app during development.
- Product direction is now split by workflow: STAFF can use either the Android mobile app or responsive web portal for receipt entry, draft save/submit, material lookup, and own receipt history, while MANAGER and ADMIN use the web portal for approvals, receipt history, and inventory.
- `apps/web` is implemented as a dependency-free responsive web portal with login, staff receipt creation, material lookup, draft save/submit, staff receipt history access, submitted receipt queue for reviewers, receipt detail drawer, approve/reject actions, history filters, void action, and inventory search.
- The mobile menu now treats MANAGER and ADMIN as web-only users, while preserving STAFF receipt-entry flows in the Android app.
- Production deployment now supports `WEB_DOMAIN` in Caddy, serves `apps/web` as static files, and reverse proxies `/api/*` to the NestJS API for same-domain web calls.
- CI now includes a Web Portal job that runs the web JavaScript syntax check.
- Admin-only user management is implemented with `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`, `PATCH /api/users/:id/disable`, and `PATCH /api/users/:id/password`.
- The web portal now has an admin-only `Người dùng` screen for creating accounts with initial passwords, filtering users, disabling accounts, and resetting passwords.
- User management writes audit logs for create/update/disable/password reset actions, hashes passwords with bcrypt, and revokes refresh tokens when a user is disabled or their password is reset.
- The staff mobile login screen now displays the configured API URL so installed APK connection problems can be diagnosed quickly.

## Understood Scope

Phase 1 is an internal MVP for material purchase receipts:

- Staff log in and create draft purchase receipts.
- Staff submit receipts for manager review.
- Manager or admin approve, reject, or void receipts from web.
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

Continue from Sprint 6 in `docs/11_SPRINT_TASKS_FOR_CODEX.md`:

1. Rebuild the staff APK with a LAN or deployed HTTPS `EXPO_PUBLIC_API_BASE_URL`; do not use `127.0.0.1` for installed phones.
2. Run the scripted demo with staff on Android and manager/admin on the web portal against a LAN/deployed backend.
3. Add a dedicated web audit-log screen if in-app audit inspection becomes a release requirement.

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
- The Nest build output currently lands under `dist/src`, so runtime scripts use `node dist/src/main.js` and `node dist/src/smoke.js`.
- For Expo mobile, `EXPO_PUBLIC_API_BASE_URL` should point to the machine hosting the NestJS API, using simulator or LAN-friendly URLs as noted in `apps/mobile/.env.example`.
- Prisma validation in this workspace still needs `DATABASE_URL` supplied at runtime because only `.env.example` is committed.
