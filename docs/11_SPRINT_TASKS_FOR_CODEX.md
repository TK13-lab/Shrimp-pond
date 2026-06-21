# 11 - Sprint tasks for Codex

## Required after every task

After each task or working slice is completed and verified:

```bash
git add .
git commit -m "<type>(scope): <short description>"
git push origin main
```

Project GitHub remote:

```text
git@github.com:TK13-lab/Shrimp-pond.git
```

If the remote has not been configured yet:

```bash
git remote add origin git@github.com:TK13-lab/Shrimp-pond.git
```

Do not commit `.env`, secrets, raw data, heavy outputs, logs, caches, or machine-specific files.

## Sprint 0 - Project setup

Duration: 1-2 days

### Goal

Create monorepo skeleton with backend, mobile, docs, and local database.

### Tasks

#### S0-T1 - Create project structure

Create:

```text
apps/api
apps/mobile
docs
README.md
AGENTS.md
docker-compose.yml
```

#### S0-T2 - Create backend NestJS app

Inside `apps/api`:

```text
NestJS
TypeScript
Prisma
Config module
Validation pipe
Global API prefix /api
```

#### S0-T3 - Create PostgreSQL Docker Compose

Create PostgreSQL service:

```text
database name: shrimp_pond
user: postgres
password: postgres for local only
```

#### S0-T4 - Create mobile Expo app

Inside `apps/mobile`:

```text
Expo TypeScript app
React Navigation
Basic LoginScreen placeholder
Basic MenuScreen placeholder
```

### Definition of Done

```text
Backend starts
Mobile starts
PostgreSQL starts
Folder structure matches docs
No real secrets committed
```

---

## Sprint 1 - Auth and roles

Duration: 2-3 days

### Goal

Users can login, get token, and backend can protect endpoints by role.

### Tasks

#### S1-T1 - Prisma schema base

Implement:

```text
Farm
User
RefreshToken
Device
AuditLog
Role enum
```

#### S1-T2 - Seed demo data

Create:

```text
1 farm
1 admin
1 manager
4 staff
```

#### S1-T3 - Auth module

Implement:

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET /auth/me
```

#### S1-T4 - Guards

Implement:

```text
JwtAuthGuard
RolesGuard
@Roles decorator
CurrentUser decorator
```

#### S1-T5 - Mobile auth

Implement:

```text
LoginScreen
AuthProvider
Secure token storage
Logout
Role-aware menu
```

### Definition of Done

```text
Admin, manager, staff can login
Invalid login rejected
Inactive user rejected
Backend protects endpoints
Mobile stores token securely
```

---

## Sprint 2 - Materials

Duration: 2 days

### Goal

Material catalog works from mobile through backend.

### Tasks

#### S2-T1 - Material schema and migration

Implement:

```text
Material model
unique(farmId, name, defaultUnit)
isActive
```

#### S2-T2 - Material API

Implement:

```text
GET /materials
POST /materials
PATCH /materials/:id
PATCH /materials/:id/disable
```

#### S2-T3 - Mobile material screens

Implement:

```text
MaterialListScreen
MaterialFormScreen
Role-based create/edit buttons
```

### Definition of Done

```text
Staff can view materials
Admin can create/update/disable materials
Duplicate material blocked
Mobile displays material list from server
```

---

## Sprint 3 - Purchase receipt creation and submission

Duration: 3-4 days

### Goal

Staff can create a receipt and submit it to manager.

### Tasks

#### S3-T1 - Receipt schema

Implement:

```text
PurchaseReceipt
PurchaseReceiptItem
ReceiptStatus enum
IdempotencyKey
```

#### S3-T2 - Receipt create API

Implement:

```text
POST /purchase-receipts
```

Rules:

```text
client_request_id required
backend calculates totals
status = DRAFT
idempotency handled
```

#### S3-T3 - Receipt submit API

Implement:

```text
PATCH /purchase-receipts/:id/submit
```

Rules:

```text
DRAFT -> SUBMITTED
write audit log
```

#### S3-T4 - Receipt list/detail API

Implement:

```text
GET /purchase-receipts
GET /purchase-receipts/:id
```

Visibility:

```text
STAFF own receipts
MANAGER/ADMIN farm receipts
```

#### S3-T5 - Mobile receipt form

Implement:

```text
PurchaseReceiptFormScreen
Add multiple rows
Calculate line totals
Calculate total
Save draft
Submit
Disable button while saving
```

#### S3-T6 - Mobile receipt list/detail

Implement:

```text
MyReceiptsScreen
ReceiptDetailScreen
```

### Definition of Done

```text
Staff creates receipt
Staff submits receipt
No inventory update yet
Duplicate client_request_id does not create duplicate receipt
Staff sees own receipt
Manager sees submitted receipt
```

---

## Sprint 4 - Approval and inventory

Duration: 3-4 days

### Goal

Manager approves submitted receipt and inventory updates safely.

### Tasks

#### S4-T1 - Inventory schema

Implement:

```text
InventoryBalance
InventoryTransaction
InventoryTransactionType
ReferenceType
```

#### S4-T2 - Approve receipt API

Implement:

```text
PATCH /purchase-receipts/:id/approve
```

Must use database transaction.

Rules:

```text
Only MANAGER/ADMIN
Receipt must be SUBMITTED
Create inventory transactions
Update inventory balances
Set status APPROVED
Write audit log
```

#### S4-T3 - Reject receipt API

Implement:

```text
PATCH /purchase-receipts/:id/reject
```

#### S4-T4 - Void receipt API

Implement:

```text
PATCH /purchase-receipts/:id/void
```

Can be simplified in MVP if needed, but must not hard-delete.

#### S4-T5 - Inventory API

Implement:

```text
GET /inventory
GET /inventory/transactions
```

#### S4-T6 - Mobile manager approval screens

Implement:

```text
ApprovalListScreen
Approve/Reject buttons in ReceiptDetailScreen
```

#### S4-T7 - Mobile inventory screen

Implement:

```text
InventoryScreen
```

### Definition of Done

```text
Manager can approve
Staff cannot approve
Inventory increases after approval
Approve called twice does not double inventory
Reject works
Audit log records approve/reject
```

---

## Sprint 5 - Internal deployment hardening

Duration: 2-3 days

### Goal

Prepare internal build and test with demo users.

### Tasks

#### S5-T1 - Error handling and Vietnamese messages

#### S5-T2 - Network error handling on mobile

#### S5-T3 - Security review

Check:

```text
No secrets in repo
No unnecessary permissions
Backend role checks
Transactions used
Audit logs written
```

#### S5-T4 - Android build

Prepare Android internal build.

#### S5-T5 - Demo script

Create demo steps:

```text
Login staff
Create receipt
Submit
Login manager
Approve
View inventory
View audit log
```

### Definition of Done

```text
APK/internal build works
Backend deployed or running on LAN
Demo flow works on real phone
```

---

## Sprint 6 - Responsive manager/admin web

Duration: 2-3 days

### Goal

Manager and admin use a responsive web portal for review work. Mobile is kept for staff receipt entry.

### Tasks

#### S6-T1 - Update product direction

Document:

```text
STAFF -> Android mobile app
MANAGER/ADMIN -> responsive web portal
Backend remains the source of truth
```

#### S6-T2 - Web app shell

Create:

```text
apps/web
login screen
responsive manager/admin layout
API base URL configuration
session storage
```

#### S6-T3 - Approval queue

Implement:

```text
GET /purchase-receipts?status=SUBMITTED
receipt detail drawer
approve action
reject action with reason
```

#### S6-T4 - Receipt history

Implement:

```text
receipt history list
status filter
date filters
detail view
void approved receipt with reason
```

#### S6-T5 - Inventory and deploy readiness

Implement:

```text
inventory balance view
inventory search
Caddy static web serving
/api reverse proxy for same-domain web calls
```

### Definition of Done

```text
Manager can log in on web
Admin can log in on web
Submitted receipts can be approved/rejected from web
Approved receipts can be voided from web
History can be viewed from web
Inventory can be viewed from web
Staff mobile app remains usable for receipt entry
No secrets are hard-coded
```

---

## Sprint 7 - Account setup and APK connection clarity

Duration: 1-2 days

### Goal

Admin can create real staff/manager/admin accounts from web, and installed APK users can clearly see which API server the app is trying to reach.

### Tasks

#### S7-T1 - Admin user API

Implement:

```text
GET /users
POST /users
PATCH /users/:id
PATCH /users/:id/disable
PATCH /users/:id/password
```

Rules:

```text
Only ADMIN can manage users
No public self-registration
New staff/manager accounts must belong to an active farm
Password hashes are stored, never plain passwords
Important account actions write audit logs
Disabling a user revokes refresh tokens
```

#### S7-T2 - Web user management

Implement:

```text
Admin-only Người dùng screen
Create account with initial password
List users
Disable user
Reset password
```

#### S7-T3 - APK connection clarity

Implement:

```text
Staff login screen displays configured API URL
Login copy explains that APK must be built with a reachable API URL
```

### Definition of Done

```text
Admin can create a staff account from web
Created staff can log in from APK when API URL is reachable
Admin can reset password
Admin can disable user
Disabled user cannot keep using refresh tokens
TypeScript compiles
Backend smoke bootstrap passes
No secrets are hard-coded
```
