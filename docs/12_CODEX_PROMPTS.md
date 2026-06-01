# 12 - Codex prompts

Copy one prompt at a time.

## Standard instruction for every prompt

Every Codex task should end with a verified local commit and push to GitHub:

```bash
git add .
git commit -m "<type>(scope): <short description>"
git push origin main
```

Use this remote:

```text
git@github.com:TK13-lab/Shrimp-pond.git
```

If needed, configure the remote once:

```bash
git remote add origin git@github.com:TK13-lab/Shrimp-pond.git
```

Do not commit `.env`, secrets, raw data, heavy outputs, logs, caches, or machine-specific files.

## Prompt 0 - Read docs and confirm plan

```text
Read AGENTS.md and the docs folder. Summarize the architecture, Phase 1 scope, and the next 5 implementation steps. Do not write code yet.
```

## Prompt 1 - Create monorepo skeleton

```text
Create the project skeleton for this shrimp pond management app.

Requirements:
- Root contains apps/api and apps/mobile
- apps/api will be a NestJS TypeScript backend
- apps/mobile will be an Expo React Native TypeScript app
- Include docker-compose.yml for local PostgreSQL
- Do not implement business features yet
- Follow AGENTS.md
```

## Prompt 2 - Backend base setup

```text
Inside apps/api, set up a NestJS TypeScript backend with:
- Config module
- Global validation pipe
- Global API prefix /api
- Prisma module
- Health check endpoint GET /api/health
- .env.example only, do not commit .env
Do not implement auth yet.
```

## Prompt 3 - Prisma schema base

```text
Create Prisma schema for:
- Farm
- User
- RefreshToken
- Device
- AuditLog
- Role enum

Use PostgreSQL.
Use bcrypt-compatible passwordHash field.
Add createdAt/updatedAt where appropriate.
Add indexes for farmId and userId where needed.
Do not implement receipt/inventory yet.
```

## Prompt 4 - Seed demo users

```text
Create a Prisma seed script that creates:
- Farm: "Trại tôm demo"
- Admin user: admin / Admin@123
- Manager user: manager1 / Manager@123
- Staff users: staff1, staff2, staff3, staff4 / Staff@123

Hash passwords.
Do not store plain text passwords in database.
Add npm scripts for prisma migrate, generate, seed.
```

## Prompt 5 - Auth module

```text
Implement backend auth module:
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

Use JWT access token.
Use refresh tokens if practical.
Reject inactive users.
Write audit log for LOGIN.
Use bcrypt or argon2.
```

## Prompt 6 - Guards and roles

```text
Implement:
- JwtAuthGuard
- RolesGuard
- @Roles decorator
- @CurrentUser decorator

Ensure endpoints can require roles ADMIN, MANAGER, STAFF.
Add a test protected endpoint if useful.
```

## Prompt 7 - Mobile auth

```text
Inside apps/mobile, implement:
- LoginScreen
- AuthProvider
- tokenStorage using expo-secure-store
- API client with Authorization header
- Role-aware MenuScreen
- Logout button

Use Vietnamese labels.
Do not implement receipt screens yet.
```

## Prompt 8 - Materials backend

```text
Add Material model to Prisma and create materials module.

Fields:
- id
- farmId
- name
- defaultUnit
- note
- isActive
- createdAt
- updatedAt

Constraints:
- unique(farmId, name, defaultUnit)

Endpoints:
- GET /api/materials
- POST /api/materials
- PATCH /api/materials/:id
- PATCH /api/materials/:id/disable

Permissions:
- STAFF can GET only
- ADMIN can create/update/disable
- MANAGER can GET; create/update only if simple to enable, otherwise ADMIN only

Validate inputs.
Write audit log for create/update/disable.
```

## Prompt 9 - Materials mobile

```text
Implement mobile material screens:
- MaterialListScreen
- MaterialFormScreen

Use backend API.
STAFF sees read-only list.
ADMIN can add/edit.
Use Vietnamese labels.
Show loading and error states.
```

## Prompt 10 - Receipt schema

```text
Add Prisma models:
- PurchaseReceipt
- PurchaseReceiptItem
- IdempotencyKey
- ReceiptStatus enum

Follow docs/06_DATABASE_SCHEMA_PRISMA.md.

Add migration.
Do not implement inventory yet.
```

## Prompt 11 - Receipt create API with idempotency

```text
Implement POST /api/purchase-receipts.

Requirements:
- Auth required
- Roles ADMIN, MANAGER, STAFF
- clientRequestId required in body or X-Idempotency-Key header
- Use IdempotencyKey unique(userId, clientRequestId)
- If same user sends same clientRequestId again, return the existing receipt
- Backend generates receiptCode
- Backend calculates lineTotal and totalAmount
- Status starts as DRAFT
- Validate item fields
- Write audit log CREATE_RECEIPT
Do not update inventory yet.
```

## Prompt 12 - Receipt submit/list/detail API

```text
Implement:
- GET /api/purchase-receipts
- GET /api/purchase-receipts/:id
- PATCH /api/purchase-receipts/:id/submit

Rules:
- STAFF can see only own receipts
- MANAGER/ADMIN can see farm receipts
- Only creator or MANAGER/ADMIN can submit a draft receipt
- Submit changes DRAFT to SUBMITTED
- Write audit log SUBMIT_RECEIPT
- Do not update inventory yet.
```

## Prompt 13 - Receipt mobile create/submit

```text
Implement mobile receipt screens:
- PurchaseReceiptFormScreen
- MyReceiptsScreen
- ReceiptDetailScreen

Features:
- Add multiple item rows
- Select material or enter material name
- Quantity, unit, unit price
- Calculate line total and total amount
- Generate client_request_id UUID
- Disable save/submit buttons while request is pending
- Save draft
- Submit receipt
- Vietnamese labels
```

## Prompt 14 - Inventory schema

```text
Add Prisma models:
- InventoryBalance
- InventoryTransaction
- InventoryTransactionType enum
- ReferenceType enum

Use unique(referenceType, referenceId, materialId) for inventory transactions.
Use unique(farmId, materialId, unit) for inventory balances.
Add migration.
```

## Prompt 15 - Approve/reject/void API

```text
Implement:
- PATCH /api/purchase-receipts/:id/approve
- PATCH /api/purchase-receipts/:id/reject
- PATCH /api/purchase-receipts/:id/void

Approve requirements:
- Only MANAGER or ADMIN
- Receipt must be SUBMITTED
- Use database transaction
- Create inventory transaction per item
- Update inventory balance using weighted average price
- Set status APPROVED
- Write audit log APPROVE_RECEIPT
- Calling approve twice must not double-update inventory

Reject:
- Only MANAGER/ADMIN
- Status SUBMITTED -> REJECTED
- Reason required
- Write audit log

Void:
- Only MANAGER/ADMIN
- Do not hard-delete
- Write audit log
```

## Prompt 16 - Inventory API and mobile screen

```text
Implement backend:
- GET /api/inventory
- GET /api/inventory/transactions

Implement mobile:
- InventoryScreen

Show:
- Material name
- Current quantity
- Unit
- Average price
- Total value

Vietnamese labels.
```

## Prompt 17 - Manager approval mobile

```text
Implement mobile approval workflow:
- ApprovalListScreen for MANAGER/ADMIN
- Show SUBMITTED receipts
- ReceiptDetailScreen shows Approve and Reject buttons for MANAGER/ADMIN
- Staff must not see approve/reject buttons
- Backend must still enforce permission
```

## Prompt 18 - Audit log screen

```text
Implement backend GET /api/audit-logs for MANAGER/ADMIN.
Implement mobile AuditLogScreen for MANAGER/ADMIN.

Show:
- Time
- User
- Action
- Entity
- Device ID if available

Do not expose sensitive token/password data in audit logs.
```

## Prompt 19 - Security review

```text
Review the codebase against docs/09_SECURITY_PLAN.md.

Check:
- No secrets committed
- Tokens stored in SecureStore
- Backend checks roles
- Staff cannot approve
- Approval uses transaction
- Duplicate client_request_id does not create duplicate receipt
- Approve twice does not double inventory
- No unnecessary mobile permissions
Report issues before changing code.
```

## Prompt 20 - Android internal build prep

```text
Prepare the Expo mobile app for Android internal build.

Requirements:
- Configure app name and package identifier
- Ensure API base URL is configurable
- Ensure app works with deployed API URL
- Do not submit to stores
- Document build commands in README
```
