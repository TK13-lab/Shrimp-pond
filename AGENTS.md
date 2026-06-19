# AGENTS.md - Instructions for Codex

You are working on a shrimp pond management app with a staff mobile app and a manager/admin web portal.

The user is a solo developer. Keep implementation simple, stable, and maintainable. Do not over-engineer.

## Mandatory git workflow

After every completed and verified step/task, commit locally and push to GitHub.

Use this repository remote:

```text
git@github.com:TK13-lab/Shrimp-pond.git
```

If the local repository has no `origin` remote yet, set it once:

```bash
git remote add origin git@github.com:TK13-lab/Shrimp-pond.git
```

For each completed step:

```bash
git add .
git commit -m "<type>(scope): <short description>"
git push origin main
```

In this lab workspace, the `.git` directory is reserved by the environment and plain `git` may resolve to the parent lab repository. If that happens, use the project wrapper instead:

```bash
scripts/setup/git-shrimp add .
scripts/setup/git-shrimp commit -m "<type>(scope): <short description>"
scripts/setup/git-shrimp push origin main
```

Do not commit `.env`, secrets, raw data, heavy outputs, logs, caches, or machine-specific files.

## Product context

The app is used by one shrimp farm operation:

- 1 manager at the shrimp pond
- 4 staff members who take turns entering data
- Staff use a locally installed Android mobile app to enter data
- Manager and admin use a responsive web portal instead of an iOS/mobile app
- The main database must be stored on a server to prevent data loss when a phone is lost, reset, or replaced

## Architecture decision

Use client-server architecture:

```text
Staff mobile app -> Backend REST API -> PostgreSQL database
Manager/admin web -> Backend REST API -> PostgreSQL database
```

Do not build a local-only app.

Do not use SQLite as the main business database.

Do not connect the mobile app or web portal directly to PostgreSQL.

Client apps must never contain database credentials, JWT secrets, service keys, or private API keys.

## Tech stack

### Backend

Use:

```text
Node.js
NestJS
TypeScript
Prisma ORM
PostgreSQL
JWT auth
bcrypt or argon2 for password hashing
Docker Compose for local PostgreSQL
```

### Mobile

Use:

```text
React Native Expo
TypeScript
React Navigation
expo-secure-store for tokens
Axios or fetch for API calls
```

Mobile is staff-only for Phase 1 operations.

### Web

Use simple responsive web UI for manager/admin workflows:

```text
HTML/CSS/JavaScript or TypeScript
REST API client modules
Local browser session storage for web auth tokens
No direct database access
```

## Phase 1 scope

Implement only:

- Authentication
- Role-based access control
- Materials
- Purchase receipt creation
- Purchase receipt submission
- Purchase receipt approval/rejection/voiding
- Inventory balance update after approval
- Duplicate submission prevention
- Audit logs
- Basic internal Android build readiness
- Responsive manager/admin web for approvals, receipt history, and inventory

Do not implement yet:

- IoT
- Camera invoice scan
- QR code
- AI prediction
- Advanced reports
- Offline sync
- Push notifications
- Payment
- Public app store publishing
- Multi-language support
- Complex dashboard

## User roles

Use exactly these roles:

```text
ADMIN
MANAGER
STAFF
```

### STAFF

Can:

- Log in
- View active materials
- Create draft purchase receipts
- Edit own draft receipts
- Submit own draft receipts
- View own receipts

Cannot:

- Approve receipts
- Reject receipts
- Void approved receipts
- Edit approved receipts
- Directly edit inventory
- Manage users

### MANAGER

Can:

- Log in
- View all receipts in their farm
- Create receipts
- Submit receipts
- Approve submitted receipts
- Reject submitted receipts
- Void receipts when needed
- View inventory
- View audit logs for their farm

Cannot:

- Bypass audit log
- Directly edit inventory balances without a formal transaction

### ADMIN

Can:

- Manage users
- Manage farms
- Manage materials
- View all data
- Perform all manager actions

## Receipt workflow

Use this workflow:

```text
DRAFT -> SUBMITTED -> APPROVED -> INVENTORY_UPDATED
              ↓
           REJECTED

APPROVED can be VOIDED later by MANAGER or ADMIN.
```

For implementation, `APPROVED` may mean inventory was already updated if the backend performs approval and inventory update in the same transaction. If so, use status `APPROVED` and ensure inventory transaction exists.

## Critical business rule

Inventory must only be updated on the backend, inside a database transaction, when a submitted receipt is approved by a manager or admin.

Never update inventory from the mobile app.

Never update inventory when a staff member only creates or submits a receipt.

## Duplicate prevention

Implement duplicate prevention at several levels:

1. Mobile disables submit/save button while request is pending.
2. Mobile sends `client_request_id` or `X-Idempotency-Key` for create actions.
3. Backend stores idempotency key per user.
4. Backend has database unique constraints.
5. Approval creates inventory transactions with unique reference constraints.
6. Backend warns if very similar receipt exists recently.

Use `client_request_id` as UUID generated on mobile.

For create receipt:

```text
unique(user_id, client_request_id)
```

For inventory transaction:

```text
unique(reference_type, reference_id, material_id)
```

## Security rules

- Hash passwords using bcrypt or argon2.
- Use short-lived JWT access tokens.
- Use refresh tokens if implemented.
- Store mobile tokens in secure storage, not plain AsyncStorage.
- Validate all backend inputs using DTOs/class-validator or equivalent.
- Enforce authorization on the backend, not only in the UI.
- Use HTTPS in staging/production.
- Do not hard-delete business records.
- Use status fields such as `VOIDED` or `is_active=false`.
- Keep audit logs for important actions.
- Do not add unnecessary mobile permissions.
- Do not add cloud services unless explicitly requested.
- Do not add packages with unclear purpose.
- Do not commit `.env` files.
- Provide `.env.example` only if needed.

## Coding style

- Keep backend modules separated:
  - auth
  - users
  - farms
  - materials
  - purchase-receipts
  - inventory
  - audit-logs

- Keep mobile screens separated:
  - auth
  - menu
  - materials
  - purchaseReceipts
  - staff receipt entry/list screens

- Keep web screens separated:
  - auth
  - approvals
  - receipt history
  - inventory

- Do not put database logic in controllers if services should handle it.
- Do not put API calls directly everywhere in UI components. Use API client modules.
- Use TypeScript types/interfaces.
- Prefer clear simple code over clever abstractions.

## Definition of Done

A task is only done when:

- TypeScript compiles
- Backend starts without error
- Prisma migration applies
- Mobile app starts without error
- Web portal opens without error
- Basic manual flow works
- Validation errors are shown
- Unauthorized users are blocked by backend
- Important actions are written to audit log
- No secrets are hard-coded
