# 13 - Acceptance test plan

## Test users

```text
admin / Admin@123
manager1 / Manager@123
staff1 / Staff@123
staff2 / Staff@123
staff3 / Staff@123
staff4 / Staff@123
```

## Test 1 - Login

### Steps

1. Open mobile app.
2. Login as `staff1`.
3. Logout.
4. Login as `manager1`.
5. Logout.
6. Login as `admin`.

### Expected

```text
All valid users login successfully.
Wrong password is rejected.
Inactive user is rejected.
Menu changes by role.
```

## Test 2 - Material catalog

### Steps

1. Login as admin.
2. Create material:
   - Tên: Thức ăn CP 9001
   - Đơn vị: bao
3. Create material:
   - Tên: Men vi sinh
   - Đơn vị: gói
4. Login as staff.
5. Open material list.

### Expected

```text
Admin can create materials.
Staff can view materials.
Staff cannot see create/edit buttons.
Duplicate material name + unit in same farm is blocked.
```

## Test 3 - Staff creates receipt

### Steps

1. Login as staff1.
2. Create receipt:
   - Supplier: Đại lý A
   - Item 1: Thức ăn CP 9001, 10 bao, 450000
   - Item 2: Men vi sinh, 5 gói, 120000
3. Save draft.
4. Open My Receipts.

### Expected

```text
Receipt is created with status DRAFT.
Total = 10*450000 + 5*120000 = 5100000.
Inventory is not updated yet.
Audit log has CREATE_RECEIPT.
```

## Test 4 - Staff submits receipt

### Steps

1. Login as staff1.
2. Open draft receipt.
3. Press submit.

### Expected

```text
Status changes to SUBMITTED.
Inventory is still not updated.
Audit log has SUBMIT_RECEIPT.
```

## Test 5 - Staff cannot approve

### Steps

1. Login as staff1.
2. Try to approve receipt by UI or direct API call.

### Expected

```text
UI does not show approve button.
Backend returns 403 if direct API call is attempted.
Inventory is not updated.
```

## Test 6 - Manager approves receipt

### Steps

1. Login as manager1.
2. Open Approval List.
3. Open submitted receipt.
4. Press approve.
5. Open Inventory.

### Expected

```text
Receipt status becomes APPROVED.
Inventory increases:
- Thức ăn CP 9001: +10 bao
- Men vi sinh: +5 gói
Average price is correct.
Audit log has APPROVE_RECEIPT.
```

## Test 7 - Approve twice does not duplicate inventory

### Steps

1. After receipt is approved, call approve endpoint again for same receipt.

### Expected

```text
Backend rejects because status is not SUBMITTED
or returns safe idempotent response.
Inventory is not increased twice.
InventoryTransaction unique constraint prevents duplication.
```

## Test 8 - Duplicate client request ID

### Steps

1. Login as staff2.
2. Send POST /purchase-receipts with `clientRequestId = X`.
3. Send the same request again with same `clientRequestId = X`.

### Expected

```text
Only one receipt is created.
Second response returns existing receipt or same result.
```

## Test 9 - Reject receipt

### Steps

1. staff3 creates and submits receipt.
2. manager1 rejects it with reason "Sai số lượng".

### Expected

```text
Status becomes REJECTED.
Inventory is not updated.
Audit log has REJECT_RECEIPT.
Reject reason is stored.
```

## Test 10 - Validation

Try invalid cases:

```text
No items
Empty material name
Quantity = 0
Quantity < 0
Empty unit
Unit price < 0
```

### Expected

```text
Mobile shows validation if possible.
Backend rejects invalid data.
No partial data saved.
```

## Test 11 - Lost phone scenario

### Steps

1. staff4 creates receipt from phone A.
2. Login staff4 from phone B.
3. Open My Receipts.

### Expected

```text
Receipt is visible because data is on server.
```

## Test 12 - Audit log visibility

### Steps

1. Login as manager1.
2. Open audit log.
3. Login as staff1.
4. Try to open audit log.

### Expected

```text
Manager can view audit log.
Staff cannot view audit log.
Backend returns 403 for staff.
```
