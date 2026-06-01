# 05 - Receipt workflow and duplicate control

## Receipt statuses

```text
DRAFT
SUBMITTED
APPROVED
REJECTED
VOIDED
```

## Workflow

```text
DRAFT
  ↓ submit
SUBMITTED
  ↓ approve
APPROVED
  ↓ void
VOIDED

SUBMITTED
  ↓ reject
REJECTED
```

## Business rules

### Creating receipt

A staff member can create a draft receipt.

Draft receipt does not update inventory.

### Submitting receipt

When staff presses submit:

- Validate receipt has at least 1 item
- Validate each item has material name, quantity, unit, unit price
- Change status to `SUBMITTED`
- Record `submitted_by` and `submitted_at`
- Write audit log

Still no inventory update.

### Approving receipt

Only manager/admin can approve.

Approval must run in a database transaction:

```text
1. Load receipt
2. Verify status is SUBMITTED
3. Verify user has permission
4. Verify receipt belongs to user farm
5. Create inventory transactions
6. Update inventory balances
7. Change receipt status to APPROVED
8. Set approved_by and approved_at
9. Write audit log
10. Commit transaction
```

If any step fails, rollback all steps.

### Rejecting receipt

Only manager/admin can reject a submitted receipt.

Rejected receipt does not update inventory.

### Voiding approved receipt

Only manager/admin can void.

Voiding should reverse the inventory effect by creating reverse inventory transactions. Do not delete old transactions.

## Duplicate prevention levels

### Level 1 - Mobile UI

When pressing save/submit:

```text
set isSaving = true
disable button
show "Đang lưu..."
```

Only re-enable button after response or error.

### Level 2 - Client request ID

Mobile generates:

```text
client_request_id = UUID
```

Send it in body or header:

```text
X-Idempotency-Key: <uuid>
```

### Level 3 - Backend idempotency table

Store:

```text
user_id
client_request_id
request_hash
response_entity_id
created_at
```

Unique:

```text
unique(user_id, client_request_id)
```

If the same request is received again, return the same receipt instead of creating a duplicate.

### Level 4 - Database unique constraints

Use unique constraints:

```text
unique(farm_id, receipt_code)
unique(user_id, client_request_id)
unique(reference_type, reference_id, material_id)
```

### Level 5 - Approval idempotency

Even if approve endpoint is called twice, inventory must not be updated twice.

Use:

```text
inventory_transactions.unique(reference_type, reference_id, material_id)
```

The reference is:

```text
reference_type = PURCHASE_RECEIPT
reference_id = receipt.id
```

### Level 6 - Business duplicate warning

When creating/submitting a receipt, check if a similar receipt exists recently.

Possible similarity rules:

```text
Same farm
Same creator
Same supplier name
Same receipt date
Similar total amount
Same item list
Created within last 10-30 minutes
```

If found, return warning:

```json
{
  "warning": "POSSIBLE_DUPLICATE",
  "message": "Có thể phiếu này đã được nhập trước đó.",
  "similar_receipt_id": "..."
}
```

Do not block completely. The user may confirm if it is genuinely different.

## Important note

For Phase 1, implement idempotency and transaction first.

Duplicate warning can be added after the main flow works.
