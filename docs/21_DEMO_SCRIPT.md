# 21 - Demo script

## Goal

Run a short Phase 1 demo on a real Android phone or LAN-connected Expo session.

Core story:

```text
Staff logs in
Staff creates and submits a purchase receipt
Manager approves it
Inventory changes on the backend
Audit log evidence is visible from backend data
```

## Current limitation

The mobile menu already reserves an `Audit log` item for manager/admin, but the read screen is still a placeholder in the current repo snapshot.

For this demo, verify audit logs from the backend database or Prisma Studio instead of the mobile UI.

## Before the demo

1. Backend is running and reachable from the phone.
2. Mobile app points to the correct API URL:
   - LAN example: `http://192.168.1.20:3000/api`
   - Deployed example: `https://api.your-domain.com/api`
3. Demo users and demo materials are seeded as listed in `docs/19_SEED_DATA_AND_DEMO_USERS.md`.
4. Use the internal APK from `S5-T4` or a LAN Expo session from `apps/mobile`.
5. Prepare a unique note for the receipt, for example:

```text
Demo S5-T5 2026-06-05 15:00
```

That note makes the receipt easier to find in manager history and recent audit logs.

## Demo accounts

```text
staff1 / Staff@123
manager1 / Manager@123
```

## Demo receipt data

Supplier:

```text
Đại lý vật tư A
```

Items:

```text
Thức ăn CP 9001 | 10 bao | 450000
Men vi sinh | 5 gói | 120000
Vôi CaCO3 | 50 kg | 8000
```

Expected receipt total:

```text
5500000
```

## Live demo steps

### 1. Staff login

1. Open the app on the phone.
2. Login as `staff1`.

Expected:

```text
Login succeeds
Menu only shows staff actions
No audit-log or approval action is visible to staff
```

### 2. Show the material catalog

1. Open `Danh mục vật tư`.
2. Confirm the seeded materials are visible.
3. Go back to the main menu.

Expected:

```text
Staff can browse active materials
Staff cannot edit materials
```

### 3. Create a draft receipt

1. Open `Tạo phiếu nhập`.
2. Enter:
   - Supplier: `Đại lý vật tư A`
   - Note: your unique demo note
3. Add the three demo items and prices.
4. Save the draft.
5. Open `Phiếu của tôi`.
6. Open the new receipt.

Expected:

```text
Receipt is saved with status DRAFT
Total amount shows 5500000
Approve/reject/void actions are not shown to staff
```

### 4. Submit the receipt

1. From the receipt detail, press submit.
2. Return to `Phiếu của tôi`.
3. Open the same receipt again.

Expected:

```text
Status changes to SUBMITTED
Staff can still view the receipt
Inventory is not updated yet
```

### 5. Manager login and approval

1. Logout.
2. Login as `manager1`.
3. Open `Phiếu chờ duyệt`.
4. Open the receipt that matches the demo note.
5. Approve it.

Expected:

```text
Manager sees the submitted receipt
Approval succeeds
Receipt status becomes APPROVED
```

### 6. Inventory check

1. From the manager menu, open `Tồn kho`.
2. Search the three materials if needed.

Expected:

```text
Inventory increases after approval only
Expected delta:
- Thức ăn CP 9001: +10 bao
- Men vi sinh: +5 gói
- Vôi CaCO3: +50 kg
```

If the demo environment already contains older stock, focus on the increase, not the final absolute quantity.

### 7. Audit log proof from backend

Use one of these options after approval:

#### Option A - Prisma Studio

1. Open Prisma Studio from `apps/api` using your normal local environment.
2. Open the `AuditLog` table.
3. Sort by `createdAt` descending.
4. Look for recent actions around the demo time.

Expected recent actions:

```text
LOGIN
CREATE_RECEIPT
SUBMIT_RECEIPT
APPROVE_RECEIPT
```

#### Option B - SQL query

Run a recent-log query in your PostgreSQL client:

```sql
SELECT "action", "entityType", "entityId", "createdAt"
FROM "AuditLog"
WHERE "createdAt" >= NOW() - INTERVAL '15 minutes'
ORDER BY "createdAt" DESC;
```

Expected:

```text
Recent rows show the login, create, submit, and approve actions from the demo window
```

## Optional cleanup after the demo

If you want to restore inventory to the earlier state:

1. Stay logged in as `manager1`.
2. Open `Lịch sử phiếu nhập`.
3. Open the approved demo receipt.
4. Void it with reason:

```text
Kết thúc demo
```

Expected:

```text
Receipt status becomes VOIDED
Reverse inventory transaction is created
Inventory returns to the earlier balance
VOID_RECEIPT appears in audit logs
```

## Short presenter notes

Use these points while showing the app:

- Staff can create and submit, but cannot approve.
- Inventory does not move at draft or submit time.
- Approval is the only step that changes stock.
- Important actions are written to audit logs.
- Data stays on the server, so phone loss does not lose receipt history.
