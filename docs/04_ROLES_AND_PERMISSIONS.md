# 04 - Roles and permissions

## Role list

```text
ADMIN
MANAGER
STAFF
```

## Permission matrix

| Feature | STAFF | MANAGER | ADMIN |
|---|---:|---:|---:|
| Login | Yes | Yes | Yes |
| View own profile | Yes | Yes | Yes |
| View active materials | Yes | Yes | Yes |
| Create material | No | Optional | Yes |
| Update material | No | Optional | Yes |
| Disable material | No | No | Yes |
| Create draft receipt | Yes | Yes | Yes |
| Edit own draft receipt | Yes | Yes | Yes |
| Submit own receipt | Yes | Yes | Yes |
| View own receipts | Yes | Yes | Yes |
| View all farm receipts | No | Yes | Yes |
| Approve receipt | No | Yes | Yes |
| Reject receipt | No | Yes | Yes |
| Void approved receipt | No | Yes | Yes |
| View inventory | Optional read-only | Yes | Yes |
| Directly edit inventory | No | No | No |
| View audit logs | No | Yes | Yes |
| Manage users | No | No | Yes |
| Manage farms | No | No | Yes |

## Important rules

### Inventory

No user can directly edit inventory balance from the UI in Phase 1.

Inventory changes only through formal backend actions:

```text
- Approve purchase receipt
- Void approved purchase receipt
- Future: stock-out transaction
- Future: inventory adjustment transaction
```

### Staff restrictions

Staff can only see:

- Their own created receipts
- Active materials
- Optional read-only inventory if manager allows

Staff cannot approve, reject, void, or edit approved receipts.

### Manager restrictions

Manager can approve only receipts in their assigned farm.

Manager cannot change another farm’s data.

### Admin restrictions

Admin can manage system-level data but still cannot bypass audit logs.

## Backend enforcement

Do not rely only on mobile UI to hide buttons.

Every protected endpoint must check:

```text
- User is authenticated
- User is active
- User belongs to the farm
- User has required role
- Entity belongs to user’s farm
```

## Example endpoint permissions

```text
GET /materials
Allowed: ADMIN, MANAGER, STAFF

POST /materials
Allowed: ADMIN, optionally MANAGER

POST /purchase-receipts
Allowed: ADMIN, MANAGER, STAFF

PATCH /purchase-receipts/:id/submit
Allowed: creator, MANAGER, ADMIN

PATCH /purchase-receipts/:id/approve
Allowed: MANAGER, ADMIN

GET /audit-logs
Allowed: MANAGER, ADMIN
```
